# Konversi BIL-02 — batch 01

Konversi awal: **6 November 2026**. Kurasi lanjutan: **17 November 2026**. Status artefak: **READY_FOR_BIL_03** — seluruh 16 lesson lolos gate publishable setelah kurasi eksplisit dan review independen. [Catatan kurasi dan batas acceptance](bilingual-batch-01-curation.md) memuat resolusi, sumber dan keterbatasan baseline. Import/database/cutover belum dijalankan.

## Artefak dan hasil

- [Manifest v2](../../../../content/syllabus/v2/manifest.json) dan [track v2](../../../../content/syllabus/v2/tracks/jlpt-n5-foundation.json) memuat tepat **16 lesson**, **102 skill**, **209 block** (112 paragraf, 58 contoh, 39 struktur), dan **160 soal**. Bersama satu track dan empat unit, terdapat **492 owner**, semuanya memiliki localization `en/id` lengkap/current dan provenance editorial.
- [Overlay awal](../../../../content/syllabus/v2/authoring/batch-01.json) menyimpan teks serta revisi owner existing. [Overlay kurasi canonical](../../../../content/syllabus/v2/authoring/batch-01-curation.json) menjadi sumber delapan skill baru dan tujuh block pengganti serta dua perbaikan prerequisite. [Compiler](../../../../scripts/syllabus/convert_bilingual_batch.py) mempertahankan kedua sumber kurasi; generated track bukan jalur edit. [Petunjuk authoring](../../../../content/syllabus/v2/README.md) menjelaskan regenerasi dan gate.
- [Hasil mesin](./bilingual-batch-01-conversion.json) mencatat **56** atribusi soal yang diperbaiki (41 awal + 15 lanjutan), tujuh konversi block, dua perbaikan prerequisite dan evidence kurasi. **Seluruh 18 hold awal selesai**, ditambah empat struktur existing yang sebelumnya menunjuk vocabulary. Seluruh **16 lesson** siap sebagai input BIL-03 setelah runtime tersedia.
- Snapshot sumber cocok dengan checksum allowlist `a9815d2b692d0e401f7f1296cf5ab3d083b49c68e13bf01ac614009f91fb9153`. File v1, manifest aktif, database, migration, API, dan renderer tidak diubah.

Sesudah authoring, folder seed direorganisasi pada 6 November 2026: manifest/track aktif kini berada di `content/syllabus/v1/`, dengan isi dan checksum identik. `sourceFile` pada allowlist/laporan menunjuk lokasi baru. Path `retrievedFrom` di dalam provenance localization tetap historis agar relokasi tidak mengubah revisi editorial; lihat [peta relokasi](../../../../content/syllabus/README.md).

## Audit bahasa dan identitas

Baseline Inggris awal diperbaiki pada **47 owner**: tujuh objective lesson yang masih Indonesia, satu deskripsi unit Indonesia, dan 39 arti/deskripsi grammar yang sebelumnya mengulang objective generik Indonesia. Kurasi lanjutan mengubah representasi tujuh block dan memperbaiki empat hint, sehingga laporan kini mencatat **58 owner existing** dengan paket Inggris berbeda dari baseline. Arti grammar Inggris/Indonesia menjelaskan fungsi masing-masing skill. Judul, deskripsi, objective, paragraf, contoh, rumus, gloss vocabulary, serta placeholder/hint/explanation quiz tersedia dalam kedua bahasa. Nama Jepang dan label canonical seperti POS/register dipertahankan.

Materi Inggris pada block dan paket bantuan quiz dipertahankan selain tujuh konversi block dan empat hint yang direview. Padanan Indonesia memakai HTML dengan emphasis dan baris yang sesuai. HTML contoh Jepang dan seluruh prompt quiz disalin persis. Fragmen Jepang dalam bantuan kedua bahasa diperiksa kesamaannya. Seluruh UUID/slug/kode/urutan existing serta metadata lexical/curriculum dan support flags existing tetap; delapan skill tambahan mempunyai identitas baru. Dua prerequisite menuju entry salah diperbaiki secara eksplisit. ID soal, difficulty, kunci dan provenance canonical soal tidak berubah. Tidak ada bundle palsu atau pemindahan identitas existing.

Revisi canonical dinaikkan bila isi Inggris/atribusi/tipe block/prerequisite berubah; revision lama tidak di-reset. Translation revision bertambah bila teks/provenance paket berubah, dengan sourceRevision disamakan setelah review. Skill baru mulai pada revision 1. Provenance penulisan/terjemahan `KOTOBAHUB_INTERNAL` terpisah dari source refs canonical; sumber JMdict/Bunpro/Tae Kim pada tambahan tercatat eksplisit. `syllabus-reviewer` melakukan review independen dari maker; ini bukan klaim review oleh pengajar/native speaker.

Ada dua perbedaan presentasional plain/HTML pada snapshot asli: soal level 5 `ko-so-a-do-pronouns` menambahkan label `B：` di HTML; soal level 10 `irregular-verbs-and-purpose` menambahkan label `マリア：`/`ケン：`. Peran pembicara sudah dijelaskan narasi plain, sehingga isi kalimat/blank tetap setara secara makna. Keduanya dipertahankan dan dicatat per ID pada `presentationNotes`; compiler menolak perbedaan lain yang belum direview.

Prasyarat `kana_script_switch_basics` tetap berupa referensi canonical di luar subtree batch. BIL-03 perlu memvalidasi referensi tersebut terhadap katalog target; batch tidak boleh memperluas scope atau membuat ulang prerequisite secara otomatis.

## Keputusan kunci jawaban

Pemilik proyek memilih **mempertahankan kunci lama dan menyelaraskan schema** pada 6 November 2026. Lima soal terdampak memiliki alternatif `こちらこそ、よろしくおねがいします` (dua soal) atau `誰` (tiga soal). Semua alternatif dipertahankan byte-for-byte pada payload JSON, termasuk urutannya.

Schema v2 kini menerima alternatif kana/kanji Jepang serta `、`, menolak Latin/tanda baca saja, dan tetap mewajibkan setidaknya satu alternatif kana per soal. Tidak ada normalisasi baru atau penghapusan tanda baca; pencocokan tetap mengikuti NFKC/trim. [Kontrak bilingual](../bilingual-content-contract.md) diselaraskan. Validator runtime v2 harus mengikuti aturan ini pada BIL-03; memperluas validator v1 bukan bagian perubahan ini.

## Riwayat blocker publikasi — seluruhnya terselesaikan

Tabel berikut mencatat kondisi 6 November yang mendasari kurasi. Nomor soal adalah `difficultyLevel`, bukan ID baru. Resolusi 17 November: tambahkan delapan skill lexical yang benar untuk 15 soal; ubah tiga struktur yang ditahan serta empat struktur vocabulary lain menjadi paragraf. ID dan evidence lengkap ada pada [artefak kurasi](../../../../content/syllabus/v2/authoring/batch-01-curation.json) dan laporan mesin.

| Lesson | Referensi yang ditahan | Alasan |
| --- | --- | --- |
| `greetings-and-polite-openers` | Soal 9 | Tidak ada skill atomik `しつれいします`; menggantinya dengan `すみません` mengubah lexeme yang diukur. |
| `belonging-role-and-basic-preference` | Soal 1, 4 | Jawaban `大学生` dan `インドネシア人` tidak mempunyai skill lexical yang tepat. `学生` mempunyai reading berbeda; `日本人` kebangsaan berbeda. |
| `ko-so-a-do-pronouns` | Soal 6, 9 | Skill `どれ` ada di lesson lain. Atribusi lintas lesson tidak dibenarkan oleh kontrak. |
| `ko-so-a-do-modifiers` | Soal 1, 4, 5, 8, 10; satu struktur | Skill yang tampak cocok dengan `この` sebenarnya entry `九` (sembilan). Skill pewatas `どの` tidak tersedia; block empat pewatas tidak punya satu owner atomik yang mewakili seluruh isi. |
| `place-reference-and-location-questions` | Satu struktur | Semua soal sudah dapat diatribusikan, tetapi block `ここ/そこ/あそこ` merujuk bundle yang tidak ada. Memilih salah satu atom secara arbitrer tidak mewakili seluruh struktur. |
| `choice-and-person-reference` | Soal 3, 6, 9, 10; satu struktur | Entry bernama `dono` berisi `殿`, suffix kehormatan, bukan pewatas `どの`. Reading sama tidak membuktikan kesamaan lexeme. |
| `polite-verb-basics` | Soal 2 | Tidak ada skill lexical `寝る/ねる`; pemetaan ke kata kerja lain atau sekadar akhiran sopan tidak mencatat kemampuan lexical yang diukur soal. |

Skill salah entry `n5_kosoado_modifiers_kyuu` dan `n5_which_noun_dono_dono` tetap unpublished pada artefak v2 tanpa perubahan ID/content. Soal dan block kini mempunyai atribusi/representasi yang valid; seluruh 16 lesson published-ready. Localizations lengkap/current, termasuk pada dua owner retired yang tetap dapat diaudit.

Kontrak BIL-01 meminta hold ketika tidak ada skill sesuai. Otorisasi kurasi eksplisit telah dicatat dalam [kontrak bilingual](../bilingual-content-contract.md#kurasi-canonical-bil-02-yang-diotorisasi-17-november-2026); allowlist kini memuat scope/checksum overlay v2 tambahan sementara snapshot v1 tetap utuh. `九`/`殿` tidak diganti identitasnya, skill existing tidak dipindahkan lintas lesson, dan soal/kunci tidak diubah untuk menyamarkan gap.

## Verifikasi

```sh
python3 scripts/syllabus/validate_bilingual_contracts.py
python3 scripts/syllabus/convert_bilingual_batch.py --check
python3 scripts/syllabus/test_bilingual_batch.py
python3 scripts/syllabus/convert_bilingual_batch.py --check --require-publishable
```

**Seluruh perintah lulus**, termasuk gate `--require-publishable`: schema/examples/OpenAPI struktural dan 23 kasus invalid, checksum/identitas baseline serta kurasi, konsistensi artefak, dan **17 tes preservasi/guard**. Tes mencakup Jepang/kunci/provenance, scope, stale/missing locale, false match `この` ke `九`, retirement, graph prerequisite (target hilang/unpublished/siklus), tipe grammar owner, evidence kurasi, hint leakage pada empat perbaikan, HTML, revisi dan regenerasi. Perintah dengan `--check` tidak menulis artefak atau melakukan import.

Verifikasi ini bersifat offline, bukan dry-run importer v2/MySQL atau bukti kesiapan cutover. Dependency konten BIL-03 telah terpenuhi; implementasi BIL-03 tetap memeriksa katalog DB tujuan, prerequisite eksternal, revisi dan merge atomik tanpa menonaktifkan konten luar batch. [Catatan kurasi](bilingual-batch-01-curation.md#hasil-review-dan-batas-pemeriksaan) memisahkan keterbatasan desain assessment baseline dari acceptance BIL-02.
