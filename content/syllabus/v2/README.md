# BIL-02 — batch authoring v2

Untuk melengkapi lesson N5/N4 di luar batch frozen, gunakan [panduan subagent authoring/review dan snippet v2](../../../docs/syllabus/authoring/syllabus-authoring-guide.md). Draft baru berisi hanya `contentBlocks` dan `postStudyQuestions`, disimpan per lesson pada path yang ditugaskan; draft bukan tambahan otomatis pada overlay/manifest batch-01.

**READY_FOR_BIL_03 — authoring offline siap.** Seluruh 16 lesson allowlist mempunyai kedua bahasa current dan lolos gate publishable setelah [kurasi canonical](../../../docs/syllabus/bilingual/batch-01/bilingual-batch-01-curation.md). Lihat [laporan konversi](../../../docs/syllabus/bilingual/batch-01/bilingual-batch-01-conversion.md) dan [hasil mesin](../../../docs/syllabus/bilingual/batch-01/bilingual-batch-01-conversion.json). Importer/migration/reader BIL-03 tersedia dan diuji pada MySQL terisolasi; rollout DB tujuan tetap eksplisit. Lihat [operasi runtime](../../../docs/syllabus/bilingual/bilingual-runtime-implementation.md).

- `manifest.json` memakai `MERGE_LESSONS` dan memuat tepat 16 ID lesson asli, bukan pengganti katalog v1.
- `tracks/jlpt-n5-foundation.json` adalah artefak hasil kompilasi: 492 owner, 102 skill, 209 block dan 160 soal. Seluruh 16 lesson siap; dua entry lexical salah tetap unpublished pada identitas/content lama.
- `authoring/batch-01.json` menyimpan kurasi teks `en/id`, revisi, provenance editorial dan atribusi owner existing di luar tujuh block pengganti.
- `authoring/batch-01-curation.json` menyimpan delapan skill baru, tujuh block pengganti, dua perbaikan prerequisite serta evidence resolusi. Tujuh block pengganti mempunyai satu sumber localization di file ini. Edit sumber authoring yang memiliki owner terkait, bukan hasil kompilasi. Allowlist mengunci checksum dan scope kurasi; perubahan file ini memerlukan review diff serta pembaruan checksum yang disengaja. Isi Jepang, ID/prompt/kunci/provenance canonical soal serta identitas/urutan existing tetap.
- Compiler Python tidak menulis DB. CLI default tetap v1 sebelum DB mempunyai row v2; pilih v2 dengan `bun run db:seed:syllabus --manifest content/syllabus/v2/manifest.json`. Reseed v1 ditolak setelah merge v2. Tidak memilih subset siap otomatis.

Jalankan dari root repository dengan Python yang menyediakan `jsonschema` dan `PyYAML`:

```sh
python3 scripts/syllabus/convert_bilingual_batch.py --check
python3 scripts/syllabus/test_bilingual_batch.py
python3 scripts/syllabus/validate_bilingual_contracts.py
```

Untuk meregenerasi sesudah mengedit sumber kurasi:

```sh
python3 scripts/syllabus/convert_bilingual_batch.py
```

English/canonical yang berubah membutuhkan `contentRevision` baru; teks/provenance localization yang berubah membutuhkan `translationRevision` baru. Review kedua bahasa dan perbarui `sourceRevision` secara eksplisit. Compiler menolak revisi mundur atau payload baru dengan revisi lama. Kurasi tidak diturunkan ulang dari teks v1 saat regenerasi. Perubahan checksum sumber menghentikan proses; review diff dan inventaris secara sengaja sebelum melanjutkan.

Gate kesiapan batch:

```sh
python3 scripts/syllabus/convert_bilingual_batch.py --check --require-publishable
```

Gate ini **lulus untuk seluruh 16 lesson**. Compiler memeriksa scope/evidence kurasi dan graph prerequisite; tes preservasi menjaga identitas/Jepang/kunci/provenance. Review bahasa dan keterbatasan assessment baseline dicatat pada laporan kurasi. Importer BIL-03 memvalidasi schema, scope, revisi dan katalog DB tujuan secara mandiri, termasuk seluruh rantai prerequisite eksternal, sebelum transaksi atomik. Manifest ini tidak boleh dipakai oleh importer v1.
