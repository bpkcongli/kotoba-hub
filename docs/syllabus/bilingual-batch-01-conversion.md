# Konversi BIL-02 — batch 01

Tanggal: **6 November 2026**. Status: **authoring selesai untuk kedua bahasa; batch HELD karena atribusi belum dapat diselesaikan dalam allowlist**. `BIL-02` belum ditandai selesai dan dependency `BIL-03` belum terpenuhi.

## Artefak dan hasil

- [Manifest v2](../../content/syllabus/v2/manifest.json) dan [track v2](../../content/syllabus/v2/tracks/jlpt-n5-foundation.json) memuat tepat **16 lesson**, **94 skill**, **209 block** (105 paragraf, 58 contoh, 46 struktur), dan **160 soal**. Bersama satu track dan empat unit, terdapat **484 owner**, semuanya memiliki localization `en/id` lengkap/current dan provenance editorial internal.
- [Sumber kurasi](../../content/syllabus/v2/authoring/batch-01.json) menyimpan teks serta revisi secara eksplisit; [compiler](../../scripts/convert_bilingual_batch.py) tidak membuat ulang atau menimpa terjemahan dari v1. [Petunjuk authoring](../../content/syllabus/v2/README.md) menjelaskan regenerasi dan gate publikasi.
- [Hasil mesin](./bilingual-batch-01-conversion.json) mencatat ID seluruh perbaikan dan hold. **41** atribusi soal dan **4** referensi block dipetakan ke skill atomik existing dalam lesson yang sama. **18** referensi ditahan (15 soal, 3 block), tersebar di **7 lesson**. **9 lesson** lain siap untuk importer BIL-03 setelah runtime tersedia; batch penuh belum siap.
- Snapshot sumber cocok dengan checksum allowlist `a9815d2b692d0e401f7f1296cf5ab3d083b49c68e13bf01ac614009f91fb9153`. File v1, manifest aktif, database, migration, API, dan renderer tidak diubah.

Sesudah authoring, folder seed direorganisasi pada 6 November 2026: manifest/track aktif kini berada di `content/syllabus/v1/`, dengan isi dan checksum identik. `sourceFile` pada allowlist/laporan menunjuk lokasi baru. Path `retrievedFrom` di dalam provenance localization tetap historis agar relokasi tidak mengubah revisi editorial; lihat [peta relokasi](../../content/syllabus/README.md).

## Audit bahasa dan identitas

Baseline Inggris diperbaiki pada **47 owner**: tujuh objective lesson yang masih Indonesia, satu deskripsi unit Indonesia, dan 39 arti/deskripsi grammar yang sebelumnya mengulang objective generik Indonesia. Arti grammar Inggris/Indonesia kini menjelaskan fungsi masing-masing skill. Judul, deskripsi, objective, paragraf, contoh, rumus, gloss vocabulary, serta placeholder/hint/explanation quiz tersedia dalam kedua bahasa. Nama Jepang dan label canonical seperti POS/register tetap dipertahankan sesuai kontrak.

Materi Inggris pada block dan paket bantuan quiz dipertahankan; padanan Indonesia ditulis sebagai HTML dengan emphasis dan baris yang sesuai. HTML kalimat Jepang dan prompt quiz disalin persis. Seluruh fragmen Jepang dalam bantuan kedua bahasa juga diperiksa kesamaannya. UUID, slug, skill code, urutan asli, prerequisite, support flags, metadata lexical/curriculum, ID soal, difficulty, kunci, serta provenance canonical tidak diganti. Perubahan atribusi hanya memakai override ID yang tercatat, tidak membuat bundle atau skill baru.

Revisi canonical awal `1` menjadi `2` bila baseline Inggris/atribusi berubah. Localization awal memakai `translationRevision=1` dan `sourceRevision` sesuai owner; provenance penulisan/terjemahan menggunakan `KOTOBAHUB_INTERNAL`, terpisah dari source refs asli pada skill/soal. Ini review editorial awal dalam pekerjaan BIL-02, bukan klaim review oleh pengajar/native speaker independen.

Ada dua perbedaan presentasional plain/HTML pada snapshot asli: soal level 5 `ko-so-a-do-pronouns` menambahkan label `B：` di HTML; soal level 10 `irregular-verbs-and-purpose` menambahkan label `マリア：`/`ケン：`. Peran pembicara sudah dijelaskan narasi plain, sehingga isi kalimat/blank tetap setara secara makna. Keduanya dipertahankan dan dicatat per ID pada `presentationNotes`; compiler menolak perbedaan lain yang belum direview.

Prasyarat `kana_script_switch_basics` tetap berupa referensi canonical di luar subtree batch. BIL-03 perlu memvalidasi referensi tersebut terhadap katalog target; batch tidak boleh memperluas scope atau membuat ulang prerequisite secara otomatis.

## Keputusan kunci jawaban

Pemilik proyek memilih **mempertahankan kunci lama dan menyelaraskan schema** pada 6 November 2026. Lima soal terdampak memiliki alternatif `こちらこそ、よろしくおねがいします` (dua soal) atau `誰` (tiga soal). Semua alternatif dipertahankan byte-for-byte pada payload JSON, termasuk urutannya.

Schema v2 kini menerima alternatif kana/kanji Jepang serta `、`, menolak Latin/tanda baca saja, dan tetap mewajibkan setidaknya satu alternatif kana per soal. Tidak ada normalisasi baru atau penghapusan tanda baca; pencocokan tetap mengikuti NFKC/trim. [Kontrak bilingual](./bilingual-content-contract.md) diselaraskan. Validator runtime v2 harus mengikuti aturan ini pada BIL-03; memperluas validator v1 bukan bagian perubahan ini.

## Blocker publikasi

Nomor soal pada tabel adalah `difficultyLevel`, bukan ID baru. ID lengkap dan alasan per referensi ada di laporan mesin.

| Lesson | Referensi yang ditahan | Alasan |
| --- | --- | --- |
| `greetings-and-polite-openers` | Soal 9 | Tidak ada skill atomik `しつれいします`; menggantinya dengan `すみません` mengubah lexeme yang diukur. |
| `belonging-role-and-basic-preference` | Soal 1, 4 | Jawaban `大学生` dan `インドネシア人` tidak mempunyai skill lexical yang tepat. `学生` mempunyai reading berbeda; `日本人` kebangsaan berbeda. |
| `ko-so-a-do-pronouns` | Soal 6, 9 | Skill `どれ` ada di lesson lain. Atribusi lintas lesson tidak dibenarkan oleh kontrak. |
| `ko-so-a-do-modifiers` | Soal 1, 4, 5, 8, 10; satu struktur | Skill yang tampak cocok dengan `この` sebenarnya entry `九` (sembilan). Skill pewatas `どの` tidak tersedia; block empat pewatas tidak punya satu owner atomik yang mewakili seluruh isi. |
| `place-reference-and-location-questions` | Satu struktur | Semua soal sudah dapat diatribusikan, tetapi block `ここ/そこ/あそこ` merujuk bundle yang tidak ada. Memilih salah satu atom secara arbitrer tidak mewakili seluruh struktur. |
| `choice-and-person-reference` | Soal 3, 6, 9, 10; satu struktur | Entry bernama `dono` berisi `殿`, suffix kehormatan, bukan pewatas `どの`. Reading sama tidak membuktikan kesamaan lexeme. |
| `polite-verb-basics` | Soal 2 | Tidak ada skill lexical `寝る/ねる`; pemetaan ke kata kerja lain atau sekadar akhiran sopan tidak mencatat kemampuan lexical yang diukur soal. |

Skill salah entry `n5_kosoado_modifiers_kyuu` dan `n5_which_noun_dono_dono` ditandai unpublished pada artefak v2, tanpa mengubah ID atau mengarang provenance baru. Referensi yang belum terselesaikan dan lesson pemiliknya juga unpublished. Localizations tetap lengkap/current untuk kelanjutan kurasi.

Kontrak BIL-01 meminta **menahan publikasi dan melaporkan** jika tidak ada skill yang sesuai. Karena allowlist mengunci seluruh skill/block/soal, penyelesaian memerlukan keputusan kurasi eksplisit: perluasan baseline/allowlist dengan skill atomik yang benar dan provenance terverifikasi, serta penataan ulang block multi-skill, atau revisi isi/kontrak atribusi yang disepakati. Tidak mengganti identitas lexical skill `九`/`殿` di balik ID lama, tidak memindahkan skill lintas lesson, dan tidak mengubah soal/kunci untuk menyamarkan gap.

## Verifikasi

```sh
python3 scripts/validate_bilingual_contracts.py
python3 scripts/convert_bilingual_batch.py --check
python3 scripts/test_bilingual_batch.py
python3 scripts/convert_bilingual_batch.py --check --require-publishable
```

Tiga perintah pertama lulus: schema/examples/OpenAPI struktural dan 23 kasus invalid, checksum/identitas allowlist, konsistensi artefak, serta sembilan tes preservasi/guard. Tes meliputi Japanese/kunci/provenance, scope, draft/hold, stale/missing locale, false match `この` ke `九`, HTML tidak aman, revisi, dan regenerasi. Perintah terakhir **gagal sebagaimana diharapkan** karena batch `HELD`; tidak menulis artefak atau melakukan import.

Verifikasi ini bersifat offline, bukan dry-run importer v2/MySQL atau bukti kesiapan cutover. BIL-03 baru dapat dijalankan setelah blocker BIL-02 selesai, lalu tetap memeriksa katalog DB tujuan dan merge atomik tanpa menonaktifkan konten luar batch.
