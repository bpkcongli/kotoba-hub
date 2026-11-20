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

Image `ops` menyertakan `syllabus/seed-syllabus.ts`, `syllabus/check-bilingual-cutover.ts`,
`syllabus/seed-vocabulary-groups.ts` dan `flashcards/seed-flashcards.ts`. Allowlist
`.dockerignore`, `Dockerfile` dan verifier mengikuti entry point tersebut.

Untuk VOC-02, `bun run db:seed:vocabulary-groups --manifest <path> --dry-run`
memvalidasi manifest kelompok terhadap inventory pending canonical tanpa menulis DB.
Import kelompok lalu jalankan seed flashcard dengan `--vocabulary-groups <path>` yang
sama. `bun run test:vocabulary-groups --allow-test-db-write` memakai
VOCABULARY_TEST_DATABASE_URL yang terisolasi. Lihat [operasi VOC-02](../drizzle/README.md#vocabulary-mandiri-voc-02).

VOC-03 memakai manifest reviewed
`content/flashcards/vocabulary-groups/manifest.v2.json`, bukan draft curator/maker.
`bun run test:vocabulary-content --allow-test-db-write` menguji konten batch tersebut
pada database kosong terpisah melalui `VOCABULARY_TEST_DATABASE_URL`, termasuk
preservasi sesi pending, promosi, locale dan progress. Lihat
[operasi VOC-03](../drizzle/README.md#voc-03-reviewed-vocabulary-batch).

`python3 scripts/flashcards/validate_vocabulary_draft.py` memeriksa batch draft
VOC-03 kedua terhadap hash baseline, raw JMdict, baris CSV N5, coverage/identitas,
membership, handoff maker, serta enam set opsi per item. Perintah read-only ini
tidak membaca/menulis database, memublikasikan kelompok, atau menggantikan review
editorial independen. Laporan JSON dapat dibandingkan dengan
`content/flashcards/drafts/voc-03-batch-02/coverage.json`; kandidat integrasi di
folder tersebut bukan input importer. Coverage mengikat 574 accepted IDs, tujuh
source-held IDs, tiga laporan review, dan hash integrasi runtime. Lihat
[laporan batch kedua](../docs/syllabus/flashcards/vocabulary-batch-02-implementation.md).

`python3 scripts/flashcards/validate_vocabulary_holds.py` memvalidasi tujuh
resolusi hold batch 03, hash review, raw XML/CSV, preservasi identitas, empat
promosi baru dan nol active pending. Opsi `--draft-only` memeriksa handoff sebelum
integrasi. `--write-bootstrap /tmp/voc03-bootstrap.json` membuat subset manifest
untuk menyisipkan empat ID sebagai pending pada upgrade batch 02; gunakan hanya
sebelum promosi empat ID tersebut. Urutan seed dan retry ada pada
[operasi VOC-03](../drizzle/README.md#voc-03-reviewed-vocabulary-batch).
