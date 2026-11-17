# BIL-02 — batch authoring v2

Untuk melengkapi lesson N5/N4 di luar batch frozen, gunakan [panduan subagent authoring/review dan snippet v2](../../../docs/syllabus/syllabus-authoring-guide.md). Draft baru berisi hanya `contentBlocks` dan `postStudyQuestions`, disimpan per lesson pada path yang ditugaskan; draft bukan tambahan otomatis pada overlay/manifest batch-01.

**HELD — belum boleh diimport.** Seluruh 16 lesson allowlist sudah dikonversi ke Inggris/Indonesia, tetapi tujuh lesson masih mempunyai blocker atribusi. Lihat [laporan konversi](../../../docs/syllabus/bilingual-batch-01-conversion.md) dan [hasil mesin](../../../docs/syllabus/bilingual-batch-01-conversion.json).

- `manifest.json` memakai `MERGE_LESSONS` dan memuat tepat 16 ID lesson asli, bukan pengganti katalog v1.
- `tracks/jlpt-n5-foundation.json` adalah artefak hasil kompilasi. Lesson dengan referensi yang belum dapat diselesaikan tetap ada sebagai draft/unpublished agar identitas dan seluruh soal dapat diaudit.
- `authoring/batch-01.json` adalah sumber kurasi teks `en/id`, revisi, provenance editorial, perbaikan atribusi, dan alasan hold. Edit file ini, bukan JSON hasil kompilasi. Isi Jepang, lexical content, UUID, slug, urutan, prerequisite, kunci, dan provenance sumber tetap berasal dari snapshot v1 yang checksum-nya dikunci.
- Manifest/runtime aktif tetap `content/syllabus/v1/manifest.json` versi `1.0.0`. Script ini tidak menulis database, tidak mengaktifkan importer v2, dan tidak memilih subset siap secara otomatis.

Jalankan dari root repository dengan Python yang menyediakan `jsonschema` dan `PyYAML`:

```sh
python3 scripts/convert_bilingual_batch.py --check
python3 scripts/test_bilingual_batch.py
python3 scripts/validate_bilingual_contracts.py
```

Untuk meregenerasi sesudah mengedit sumber kurasi:

```sh
python3 scripts/convert_bilingual_batch.py
```

English/canonical yang berubah membutuhkan `contentRevision` baru; teks/provenance localization yang berubah membutuhkan `translationRevision` baru. Review kedua bahasa dan perbarui `sourceRevision` secara eksplisit. Compiler menolak revisi mundur atau payload baru dengan revisi lama. Kurasi tidak diturunkan ulang dari teks v1 saat regenerasi. Perubahan checksum sumber menghentikan proses; review diff dan inventaris secara sengaja sebelum melanjutkan.

Gate kesiapan batch:

```sh
python3 scripts/convert_bilingual_batch.py --check --require-publishable
```

Gate ini **harus gagal selama status `HELD`**. Lolos schema/tes authoring bukan acceptance BIL-02 dan bukan izin import sembilan lesson saja. Jangan memberikan manifest ini kepada importer sebelum seluruh blocker diselesaikan dan gate lulus. Importer BIL-03 tetap harus memvalidasi scope dan referensi secara mandiri sebelum transaksi atomik.
