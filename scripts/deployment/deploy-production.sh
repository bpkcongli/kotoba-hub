#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

deployment_dir=${KOTOBA_DEPLOY_DIR:-/opt/kotoba-hub}
cd -- "$deployment_dir"
deployment_dir=$PWD

script=$(readlink -f -- "${BASH_SOURCE[0]}")
script_hash=$(sha256sum -- "$script")
script_hash=${script_hash%% *}

records="$deployment_dir/.deployments"
command=${1:-}
mkdir -p -m 0700 -- "$records"

fail() { echo "$*" >&2; exit 1; }

valid_id() { [[ $1 =~ ^[1-9][0-9]*-[1-9][0-9]*$ ]]; }

lock() {
  exec 9>"$deployment_dir/.deployment.lock"
  flock -n 9 || fail 'Another deployment/database operation holds .deployment.lock.'
}

read_config() {
  local key value
  declare -A seen=()

  for file in deploy.conf app.env ops.env mysql.env release.env; do
    [[ -f $file && ! -L $file && -O $file && $(stat -c '%a' "$file") == 600 ]] ||
      fail "$file must be an operator-owned regular file with mode 0600."
  done

  image_repository= app_url= backup_dir= min_free_mb=

  while IFS='=' read -r key value || [[ -n $key ]]; do
    [[ -z $key || $key == \#* ]] && continue
    [[ ! ${seen[$key]+present} ]] || fail 'Duplicate deployment configuration key.'
    seen[$key]=1

    case "$key" in
      IMAGE_REPOSITORY) image_repository=$value ;;
      APP_URL) app_url=$value ;;
      BACKUP_DIR) backup_dir=$value ;;
      MIN_FREE_MB) min_free_mb=$value ;;
      *) fail 'Unknown deployment configuration key.' ;;
    esac
  done < deploy.conf

  [[ $image_repository =~ ^docker\.io/[a-z0-9]+([._-]+[a-z0-9]+)*/[a-z0-9]+([._-]+[a-z0-9]+)*$ ]] || fail 'Invalid image allowlist.'
  [[ $app_url =~ ^https://[a-zA-Z0-9][a-zA-Z0-9.-]*(:[0-9]+)?$ ]] || fail 'Invalid HTTPS origin.'
  [[ $backup_dir == /* && $backup_dir != *$'\n'* && $min_free_mb =~ ^[1-9][0-9]{0,6}$ ]] || fail 'Invalid backup/disk configuration.'
}

read_request() {
  local request_file=$1

  mapfile -t request < "$request_file"
  [[ ${#request[@]} == 9 && ${request[0]} == kotoba-deploy-v1 ]] || fail 'Invalid deployment request.'
  [[ ${request[1]} == "$script_hash" ]] || fail 'Installed deployment script differs from workflow checkout; provision the reviewed version first.'

  deploy_id=${request[2]}
  commit=${request[3]}
  publish_run=${request[4]}
  publish_attempt=${request[5]}
  app_ref=${request[6]}
  ops_ref=${request[7]}

  valid_id "$deploy_id" || fail 'Invalid deployment id.'
  [[ $commit =~ ^[a-f0-9]{40}$ && $publish_run =~ ^[1-9][0-9]*$ && $publish_attempt =~ ^[1-9][0-9]*$ ]] || fail 'Invalid release identity.'
  [[ $app_ref == "$image_repository@"* && ${app_ref#*@} =~ ^sha256:[a-f0-9]{64}$ ]] || fail 'Invalid app digest/allowlist.'
  [[ $ops_ref == "$image_repository@"* && ${ops_ref#*@} =~ ^sha256:[a-f0-9]{64}$ ]] || fail 'Invalid ops digest/allowlist.'
  [[ ${request[8]} == "$app_url" ]] || fail 'Workflow APP_URL differs from provisioned origin.'
}

compose() {
  docker compose --project-directory "$deployment_dir" --env-file "$1" -f "$deployment_dir/compose.production.yaml" "${@:2}"
}

read_active() {
  local key value
  declare -A seen=()

  previous_app= previous_ops= mysql_ref=

  while IFS='=' read -r key value || [[ -n $key ]]; do
    [[ -z $key || $key == \#* ]] && continue
    [[ ! ${seen[$key]+present} ]] || fail 'Duplicate release env key.'
    seen[$key]=1

    case "$key" in
      APP_IMAGE) previous_app=$value ;;
      OPS_IMAGE) previous_ops=$value ;;
      MYSQL_IMAGE) mysql_ref=$value ;;
      *) fail 'Unknown release env key; never source this file as shell.' ;;
    esac
  done < release.env

  for value in "$previous_app" "$previous_ops"; do
    [[ $value == "$image_repository@"* && ${value#*@} =~ ^sha256:[a-f0-9]{64}$ ]] || fail 'Active app/ops must use allowlisted digests.'
  done

  [[ $mysql_ref =~ ^docker\.io/library/mysql:8\.4@sha256:[a-f0-9]{64}$ ]] || fail 'Active MySQL must pin the approved official 8.4 digest.'
}

write_state() {
  local result=$1

  {
    printf 'result=%s\nphase=%s\ndeployment=%s\ncommit=%s\npublish_run=%s\npublish_attempt=%s\n' "$result" "$phase" "$deploy_id" "$commit" "$publish_run" "$publish_attempt"
    printf 'previous_app=%s\napp=%s\nops=%s\nscript_version=1\nscript_sha256=%s\nbackup=%s\ntime=%s\n' "$previous_app" "$app_ref" "$ops_ref" "$script_hash" "$backup" "$(date -u +%FT%TZ)"
  } > "$record/status.tmp"

  mv -- "$record/status.tmp" "$record/status"
}

healthy_app() {
  local container_id expected_id

  container_id=$(compose "$1" ps -q app)
  [[ -n $container_id ]] || return 1
  [[ $(docker inspect -f '{{.State.Health.Status}}' "$container_id") == healthy ]] || return 1
  [[ $(docker inspect -f '{{.Config.Image}}' "$container_id") == "$app_ref" ]] || return 1

  expected_id=$(docker image inspect -f '{{.Id}}' "$app_ref")
  [[ $(docker inspect -f '{{.Image}}' "$container_id") == "$expected_id" ]]
}

http_health() {
  local origin

  for origin in http://127.0.0.1:3000 "$app_url"; do

    curl --silent --show-error --fail --proto '=http,https' --connect-timeout 5 --max-time 15 \
      --retry 3 --retry-delay 2 --retry-all-errors --output /dev/null "$origin/" || return 1

    curl --silent --show-error --fail --proto '=http,https' --connect-timeout 5 --max-time 15 \
      --retry 3 --retry-delay 2 --retry-all-errors --max-filesize 65536 \
      "$origin/api/v1/auth/session" | python3 -c '
import json, sys
try:
    body = json.load(sys.stdin)
    data, status = body["data"], body["status"]
    assert status["code"] == 120001000 and isinstance(status["traceId"], str) and status["traceId"]
    assert status["errorDetails"] == []
    assert data == {"isAuthenticated": False, "sessionId": None, "expiresAt": None, "user": None,
                    "authorization": {"appAccess": "ANONYMOUS", "onboardingCompleted": None}}
except Exception:
    sys.exit("Anonymous session health check failed.")
' || return 1
  done
}

preflight() {
  for tool in docker curl python3 gzip sha256sum timeout; do command -v "$tool" >/dev/null || fail "Missing tool: $tool"; done

  [[ -x ./backup-production-db.sh ]] || fail 'Backup script must be provisioned and executable.'
  docker compose version >/dev/null
  compose release.env --profile ops config --quiet

  mysql_id=$(compose release.env ps -q mysql)
  [[ -n $mysql_id && $(docker inspect -f '{{.State.Health.Status}}' "$mysql_id") == healthy ]] || fail 'MySQL must already be healthy.'
  [[ $(docker inspect -f '{{.Config.Image}}' "$mysql_id") == "$mysql_ref" ]] || fail 'Active MySQL differs from release.env; diagnose provisioning drift.'

  [[ -d $backup_dir && -O $backup_dir && $(stat -c '%a' "$backup_dir") == 700 && -w $backup_dir ]] || fail 'Provision a writable backup directory owned by operator with mode 0700.'

  docker_dir=$(docker info -f '{{.DockerRootDir}}')

  for path in "$deployment_dir" "$backup_dir" "$docker_dir"; do
    available=$(df -Pk -- "$path" | awk 'END {print $4}')
    (( available >= min_free_mb * 1024 )) || fail 'Insufficient free disk space for deployment/backup.'
  done
}

unset APP_IMAGE OPS_IMAGE MYSQL_IMAGE COMPOSE_FILE COMPOSE_PROFILES COMPOSE_PROJECT_NAME COMPOSE_ENV_FILES DOCKER_HOST DOCKER_CONTEXT

case "$command" in
  check)
    [[ $# == 1 ]] || fail 'Usage: deploy.sh check'

    lock

    read_config

    read_active

    preflight

    app_ref=$previous_app
    healthy_app release.env
    http_health
    printf 'Preflight and active app health passed. script_version=1 script_sha256=%s\n' "$script_hash"
    ;;

  start)
    [[ $# == 1 ]] || fail 'Usage: deploy.sh start < verified-request'

    lock

    read_config

    incoming=$(mktemp "$records/.request.XXXXXXXX")
    trap 'rm -f -- "$incoming"' EXIT

    head -c 4097 > "$incoming"
    [[ $(stat -c '%s' "$incoming") -le 4096 ]] || fail 'Deployment request exceeds limit.'

    read_request "$incoming"
    record="$records/$deploy_id"

    if [[ -f $record/status ]]; then
      cmp -s -- "$incoming" "$record/request" || fail 'Deployment id already belongs to another request.'
      cat -- "$record/status"
      exit 0
    fi

    [[ ! -e $records/pending ]] || fail 'Unresolved deployment exists; inspect pending state before acknowledgement.'

    read_active

    mkdir -m 0700 -- "$record"
    cp -- "$incoming" "$record/request"

    phase=starting backup=none
    write_state running
    printf '%s\n' "$deploy_id" > "$records/pending"

    # The worker inherits fd 9 and owns the lock after SSH exits. Its log has no SSH pipe.
    nohup bash "$script" worker "$deploy_id" < /dev/null > "$record/operation.log" 2>&1 &
    printf 'Started deployment %s.\n' "$deploy_id"
    ;;

  status)
    [[ $# == 2 ]] && valid_id "$2" || fail 'Usage: deploy.sh status <deployment-id>'

    record="$records/$2"
    [[ -f $record/status ]] || fail 'No persisted state for this deployment id.'

    exec 8>"$deployment_dir/.deployment.lock"

    if flock -n 8 && [[ $(head -n 1 "$record/status") == result=running ]]; then
      printf 'result=unknown\n'
      tail -n +2 -- "$record/status"
    else
      cat -- "$record/status"
    fi
    ;;

  acknowledge)
    [[ $# == 2 ]] && valid_id "$2" || fail 'Usage: deploy.sh acknowledge <diagnosed-deployment-id>'

    lock
    [[ -f $records/pending && $(cat "$records/pending") == "$2" ]] || fail 'Deployment is not pending.'

    printf '%s\n' "$(date -u +%FT%TZ)" > "$records/$2/acknowledged"
    rm -- "$records/pending"
    echo 'Acknowledged after operator diagnosis; use a new workflow run/attempt to retry.'
    ;;

  worker)
    [[ $# == 2 ]] && valid_id "$2" || fail 'Invalid worker id.'
    [[ /proc/$$/fd/9 -ef $deployment_dir/.deployment.lock ]] && flock -n 9 || fail 'Worker requires inherited deployment lock.'

    read_config
    read_request "$records/$2/request"
    record="$records/$deploy_id"

    phase=preflight backup=none previous_app=unknown

    on_exit() {
      local code=$?

      trap - EXIT

      if (( code != 0 )); then
        write_state failed
        echo "Deployment failed during $phase; inspect operation.log and database journal before acknowledgement."
      fi

      exit "$code"
    }

    trap on_exit EXIT
    trap 'exit 130' INT
    trap 'exit 143' TERM

    read_active
    write_state running

    preflight

    if [[ -f $records/last-success && $previous_app == "$app_ref" && $previous_ops == "$ops_ref" ]]; then
      if healthy_app release.env && http_health; then
        phase=already-healthy
        write_state success
        rm -- "$records/pending"
        exit 0
      fi
    fi

    cp -- release.env "$record/release.previous.env"
    candidate="$record/release.candidate.env"
    printf 'APP_IMAGE=%s\nOPS_IMAGE=%s\nMYSQL_IMAGE=%s\n' "$app_ref" "$ops_ref" "$mysql_ref" > "$candidate"

    phase=pulling
    write_state running
    timeout --signal=TERM --kill-after=30s 600 docker compose --project-directory "$deployment_dir" --env-file "$candidate" -f "$deployment_dir/compose.production.yaml" --profile ops pull app ops

    for ref in "$app_ref" "$ops_ref"; do
      [[ $(docker image inspect -f '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$ref") == "$commit" ]] || fail 'Pulled image revision differs from selected release.'
    done

    phase=backup
    write_state running
    ./backup-production-db.sh --lock-held "$deployment_dir" "$backup_dir" > "$record/backup.path"

    backup=$(cat "$record/backup.path")
    [[ -f $backup && -f $backup.sha256 ]] || fail 'Backup did not produce dump and checksum.'

    (cd -- "$backup_dir" && sha256sum -c -- "$backup.sha256")
    gzip -t -- "$backup"

    phase=migrating
    write_state running
    # Retain a failed ops container for diagnosis; the pending marker prohibits automatic replay.
    timeout --signal=TERM --kill-after=30s 600 docker compose --project-directory "$deployment_dir" --env-file "$candidate" -f "$deployment_dir/compose.production.yaml" run --no-deps --name "kotoba-migrate-$deploy_id" -T ops run db:migrate

    phase=replacing-app
    write_state running
    compose "$candidate" up -d --no-build --no-deps --force-recreate --wait --wait-timeout 120 app

    phase=health
    write_state running
    healthy_app "$candidate"
    http_health

    phase=committing
    write_state running
    cp -- "$record/release.previous.env" "$deployment_dir/.release.previous.tmp"
    mv -- "$deployment_dir/.release.previous.tmp" release.previous.env

    cp -- "$candidate" "$deployment_dir/.release.tmp"
    mv -- "$deployment_dir/.release.tmp" release.env

    printf '%s\n' "$deploy_id" > "$records/.last-success.tmp"
    mv -- "$records/.last-success.tmp" "$records/last-success"

    phase=complete
    write_state success
    rm -- "$records/pending"
    docker rm "kotoba-migrate-$deploy_id" >/dev/null || true
    ;;
  *) fail 'Usage: deploy.sh check|start|status <id>|acknowledge <id>' ;;
esac
