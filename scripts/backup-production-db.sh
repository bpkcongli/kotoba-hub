#!/usr/bin/env bash
set -euo pipefail
umask 077

if (( $# > 2 )); then
  echo 'Usage: backup-production-db.sh [deployment-directory] [backup-directory]' >&2
  exit 2
fi

deployment_dir=${1:-/opt/kotoba-hub}
backup_dir=${2:-/var/backups/kotoba-hub}
deployment_dir=$(cd -- "$deployment_dir" && pwd)
for file in compose.production.yaml release.env mysql.env app.env ops.env; do
  if [[ ! -r "$deployment_dir/$file" ]]; then
    echo "Missing readable deployment file: $file" >&2
    exit 1
  fi
done

mkdir -p -m 0700 -- "$backup_dir"
backup_dir=$(cd -- "$backup_dir" && pwd)
if [[ ! -O "$backup_dir" || $(stat -c '%a' "$backup_dir") != 700 ]]; then
  echo 'Backup directory must belong to the operator and have mode 0700.' >&2
  exit 1
fi

# Migration and seed operators must use this same lock; a dump cannot overlap DDL.
exec 9>"$deployment_dir/.deployment.lock"
if ! flock -n 9; then
  echo 'Another database/deployment operation holds .deployment.lock.' >&2
  exit 1
fi

temporary=$(mktemp "$backup_dir/.kotoba-db.XXXXXXXX.sql.gz")
trap 'rm -f -- "$temporary" "$temporary.sha256"' EXIT
suffix=${temporary##*/.kotoba-db.}
filename="kotoba_hub-$(date -u +%Y%m%dT%H%M%SZ)-$suffix"

# Resolve credentials inside MySQL, keeping passwords out of host argv and shell history.
docker compose --env-file "$deployment_dir/release.env" \
  -f "$deployment_dir/compose.production.yaml" exec -T mysql sh -eu -c '
    export MYSQL_PWD="$MYSQL_PASSWORD"
    exec mysqldump --protocol=TCP -h 127.0.0.1 -u"$MYSQL_USER" \
      --single-transaction --quick --no-tablespaces --set-gtid-purged=OFF \
      --routines --events --triggers --hex-blob "$MYSQL_DATABASE"
  ' | gzip -c > "$temporary"

gzip -t -- "$temporary"
checksum=$(sha256sum -- "$temporary")
printf '%s  %s\n' "${checksum%% *}" "$filename" > "$temporary.sha256"
mv -- "$temporary" "$backup_dir/$filename"
mv -- "$temporary.sha256" "$backup_dir/$filename.sha256"
printf '%s\n' "$backup_dir/$filename"
