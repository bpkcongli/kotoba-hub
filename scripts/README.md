# Scripts

Jalankan perintah dari root repository. Script dikelompokkan berdasarkan tanggung jawab:

| Folder                     | Tanggung jawab                                                                                                | Isi                                                                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [syllabus/](syllabus/)     | Akuisisi sumber, generasi seed syllabus, authoring dan validasi bilingual, serta import syllabus ke database. | `fetch_syllabus_sources.sh`, `generate_syllabus_seed.py`, `seed-syllabus.ts`, `convert_bilingual_batch.py`, `bilingual_curation.py`, `validate_bilingual_contracts.py`, `validate_syllabus_authoring.py`, dan dua suite `test_*.py`. |
| [flashcards/](flashcards/) | Generasi seed deck kana/vocabulary dan import flashcard ke database.                                          | `generate_kana_flashcard_seed.py`, `generate_vocabulary_flashcard_seed.py`, `seed-flashcards.ts`.                                                                                                                                    |
| [smoke/](smoke/)           | Pemeriksaan backend auth, importer syllabus, progress, flashcard, AI, dan practice dengan database uji.       | Enam entry point `smoke-*.ts`.                                                                                                                                                                                                       |
| [deployment/](deployment/) | Verifikasi image Docker, metadata rilis, deployment SSH, dan backup database production.                      | `verify-docker-artifacts.sh`, `release-metadata.mjs`, `deploy-release.mjs`, `deploy-production.sh`, `backup-production-db.sh`.                                                                                                       |

## Syllabus Dan Authoring

Python memerlukan `jsonschema` dan `PyYAML`. Modul helper dan suite Python berada bersama tooling domain agar import lokal tetap bisa dipakai ketika script dijalankan langsung.

```sh
python3 scripts/syllabus/validate_bilingual_contracts.py
python3 scripts/syllabus/convert_bilingual_batch.py --check --require-publishable
python3 scripts/syllabus/test_bilingual_batch.py
python3 scripts/syllabus/test_syllabus_authoring.py
```

Regenerasi artefak bilingual menggunakan `python3 scripts/syllabus/convert_bilingual_batch.py`. Scope, revisi, dan alur review mengikuti [panduan authoring](../docs/syllabus/authoring/syllabus-authoring-guide.md) dan [README v2](../content/syllabus/v2/README.md).

## Seed Dan Smoke Test

Nama perintah Bun tetap sama; `package.json` menunjuk lokasi script di folder terkait.

```sh
bun run db:seed:syllabus:dry-run
bun run db:seed:flashcards:dry-run
bun run test:syllabus-importer
bun run test:progress
```

Import seed dan smoke test memakai konfigurasi database sesuai [panduan migration dan verifikasi](../drizzle/README.md). Dry-run syllabus bisa berjalan tanpa database; dry-run flashcard membutuhkan katalog syllabus di database.

## Deployment

```sh
bash scripts/deployment/verify-docker-artifacts.sh
bun run test:release
```

GitHub Actions memanggil helper rilis dari `deployment/`. Script production dan backup tetap dipasang ke lokasi operasional VPS sesuai [runbook deployment](../docs/cicd/deployment-workflow.md); pemindahan folder repository tidak mengubah lokasi pemasangan tersebut.

Image `ops` hanya menyertakan `syllabus/seed-syllabus.ts` dan `flashcards/seed-flashcards.ts` dari folder ini. Allowlist `.dockerignore` dan path `COPY` pada `Dockerfile` harus mengikuti lokasi kedua entry point tersebut.
