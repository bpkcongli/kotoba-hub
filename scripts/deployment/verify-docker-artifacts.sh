#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

app_image="${1:-kotoba-hub:ci}"
ops_image="${2:-kotoba-hub:ops-ci}"
verify_dir="$(mktemp -d)"
trap 'rm -rf "$verify_dir"' EXIT

# Use canaries rather than local credentials to exercise Docker's context filtering.
mkdir -p "$verify_dir/fixture"
cp .dockerignore "$verify_dir/fixture/.dockerignore"

allowed_files=(
  package.json bun.lock next.config.ts tsconfig.json next-env.d.ts postcss.config.mjs
  drizzle.config.ts drizzle/0000_example.sql drizzle/meta/_journal.json
  scripts/syllabus/seed-syllabus.ts scripts/flashcards/seed-flashcards.ts src/example.ts public/example.svg
  content/syllabus/v1/manifest.json content/syllabus/v1/tracks/example.json
  content/flashcards/system-decks/example.json
  content/syllabus/v2/manifest.json content/syllabus/v2/tracks/example.json
  scripts/syllabus/check-bilingual-cutover.ts
  docs/syllabus/schema/seed-manifest.v2.schema.json docs/syllabus/schema/track-seed.v2.schema.json
  docs/syllabus/bilingual/batch-01/bilingual-batch-01.json
)

excluded_files=(
  .env .env.production .env.example app.env ops.env mysql.env release.env
  .cert/origin-key.pem .aws/credentials .git/config .agents/example.md .codex/example.toml
  docs/example.md node_modules/example.js .next/example.js coverage/example.json
  scripts/smoke/smoke-example.ts scripts/syllabus/other-seed.ts
  scripts/flashcards/other-seed.ts scripts/deployment/example.sh drizzle/README.md
  content/syllabus/sources/provider/raw.json content/syllabus/schema/example.json
  content/syllabus/v1/other.json content/syllabus/v1/tracks/nested/private.json
  content/syllabus/v2/authoring/private.json content/syllabus/v2/tracks/nested/private.json
  docs/syllabus/schema/private.json docs/syllabus/bilingual/batch-01/private.json
  content/syllabus/v1/tracks/private.pem content/flashcards/system-decks/private.key
  content/flashcards/other.json
)

for file in "${allowed_files[@]}" "${excluded_files[@]}"; do
  mkdir -p "$verify_dir/fixture/$(dirname "$file")"
  printf 'context-canary\n' > "$verify_dir/fixture/$file"
done

docker build --file - --output "type=local,dest=$verify_dir/context" "$verify_dir/fixture" <<'DOCKERFILE'
FROM scratch
COPY . /
DOCKERFILE

printf '%s\n' "${allowed_files[@]}" | LC_ALL=C sort > "$verify_dir/expected-context"
find "$verify_dir/context" -type f -printf '%P\n' | LC_ALL=C sort > "$verify_dir/actual-context"
diff -u "$verify_dir/expected-context" "$verify_dir/actual-context"

docker build --target ops --tag "$ops_image" .
docker build --target runner --tag "$app_image" .

docker image inspect "$app_image" "$ops_image" > "$verify_dir/images.json"
bun -e '
  const images = await Bun.file(process.argv[1]).json();
  for (const { Config: config } of images) {
    if (config.User !== "bun" || config.WorkingDir !== "/app") {
      throw new Error("Images must run as bun in /app.");
    }
    const forbidden = /^(DATABASE_|AUTH_|OPENAI_|AI_|VPS_|DOCKERHUB_)/;
    if (config.Env.some((entry) => forbidden.test(entry.split("=", 1)[0]))) {
      throw new Error("Image contains deployment configuration.");
    }
  }
' "$verify_dir/images.json"

mapfile -d '' source_files < <(find src -type f -print0 | LC_ALL=C sort -z)
sha256sum "${source_files[@]}" package.json bun.lock tsconfig.json drizzle.config.ts \
  scripts/syllabus/seed-syllabus.ts scripts/syllabus/check-bilingual-cutover.ts scripts/flashcards/seed-flashcards.ts drizzle/*.sql drizzle/meta/*.json \
  content/syllabus/v1/manifest.json content/syllabus/v1/tracks/*.json \
  content/syllabus/v2/manifest.json content/syllabus/v2/tracks/*.json \
  docs/syllabus/schema/seed-manifest.v2.schema.json docs/syllabus/schema/track-seed.v2.schema.json \
  docs/syllabus/bilingual/batch-01/bilingual-batch-01.json \
  content/flashcards/system-decks/*.json > "$verify_dir/ops.sha256"

docker run --rm --network none \
  --mount "type=bind,src=$verify_dir/ops.sha256,dst=/tmp/ops.sha256,readonly" \
  --entrypoint sh "$ops_image" -eu -c '
    test "$(id -u)" -ne 0
    sha256sum --check --status /tmp/ops.sha256
    test -f node_modules/drizzle-kit/bin.cjs
    test -f node_modules/typescript/package.json
    test ! -e .env
    test ! -e .cert
    test ! -e content/syllabus/sources
  '

docker run --rm --network none --entrypoint sh "$app_image" -eu -c '
  test "$(id -u)" -ne 0
  test -f server.js
  test -d .next/static
  test -d public
  test ! -e public/mockServiceWorker.js
  test ! -e node_modules/drizzle-kit
  test ! -e scripts/syllabus/seed-syllabus.ts
  test ! -e .env
  test ! -e .cert
  test ! -e content/syllabus/sources
  '

docker run --rm --network none "$ops_image" run db:seed:syllabus:dry-run > "$verify_dir/syllabus.json"
bun -e '
  const report = await Bun.file(process.argv[1]).json();
  if (!report.counts || !Array.isArray(report.rejectedLessons)) {
    throw new Error("Syllabus dry-run did not produce a seed report.");
  }
  console.log("Syllabus artifact dry-run:", report.counts);
' "$verify_dir/syllabus.json"

docker run --rm --network none "$ops_image" run db:seed:syllabus:dry-run --manifest content/syllabus/v2/manifest.json > "$verify_dir/bilingual.json"
bun -e '
  const report = await Bun.file(process.argv[1]).json();
  if (report.schemaVersion !== "2.0.0" || report.lessonCount !== 16 || report.questionCount !== 160 || report.imported !== false) {
    throw new Error("Bilingual artifact dry-run failed.");
  }
' "$verify_dir/bilingual.json"

# The complete flashcard dry-run needs MySQL; exercise its file adapter offline here.
docker run --rm --network none "$ops_image" -e '
  import { FileCanonicalFlashcardSource } from "@/backend/flashcards/interface/secondary/seed/canonical-flashcard-source";
  const source = new FileCanonicalFlashcardSource();
  const artifacts = await source.readArtifacts();
  const kanji = await source.readKanjiSkills();
  const overlay = await source.readLocalizationOverlay();
  if (artifacts.length !== 2 || kanji.length === 0 || Object.keys(overlay.items).length === 0 || Object.keys(overlay.decks).length === 0) {
    throw new Error("Canonical flashcard artifacts are incomplete.");
  }
  console.log("Flashcard artifacts parsed; kanji skills:", kanji.length);
'

if docker run --rm --network none "$ops_image" run db:migrate > "$verify_dir/migrate.log" 2>&1; then
  printf 'Migration unexpectedly succeeded without DATABASE_URL.\n' >&2
  exit 1
fi

if ! grep -qF 'DATABASE_URL is required for database access and migrations.' "$verify_dir/migrate.log"; then
  printf 'Migration CLI failed before reaching DATABASE_URL validation.\n' >&2
  cat "$verify_dir/migrate.log" >&2
  exit 1
fi

printf 'Docker context and app/ops artifacts verified without deployment secrets or database access.\n'
