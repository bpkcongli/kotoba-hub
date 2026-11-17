# Kurasi canonical BIL-02 — batch 01

Otorisasi: permintaan pemilik proyek pada **17 November 2026** untuk menyelesaikan BIL-02 menggunakan `syllabus-maker` dan `syllabus-reviewer`. Status artefak: **READY_FOR_BIL_03** — seluruh 16 lesson lolos gate publishable. Status ini berlaku untuk hasil authoring offline, bukan import atau cutover runtime.

## Scope dan identitas

Snapshot `content/syllabus/v1/tracks/jlpt-n5-foundation.json` tetap memiliki SHA-256 `a9815d2b692d0e401f7f1296cf5ab3d083b49c68e13bf01ac614009f91fb9153`; manifest/runtime aktif tidak berubah. [Allowlist](bilingual-batch-01.json) mempertahankan inventaris historis 16 lesson, 94 skill, 209 block dan 160 soal. Scope kurasi v2 ditambahkan pada field `curation`, berisi path/checksum artefak, identitas skill tambahan per lesson, block pengganti dan mapping soal yang diizinkan.

[Artefak kurasi](../../../../content/syllabus/v2/authoring/batch-01-curation.json) memuat delapan skill v2 baru, tujuh block pengganti beserta kedua localization, dua koreksi prerequisite, alasan dan source refs. Owner pengganti hanya memiliki satu sumber teks authoring di artefak ini; record lamanya dikeluarkan dari `authoring/batch-01.json` saat integrasi. Owner lain tetap dikurasi di overlay batch awal. Compiler menyatukan keduanya; generated track bukan jalur edit.

- Semua ID/slug lesson dan parent, identitas existing skill, urutan existing serta support flags existing dipertahankan. Dua perubahan prerequisite yang diizinkan dicatat eksplisit di bawah; edge lain tetap.
- Pertahankan seluruh ID soal, HTML prompt Jepang, prompt plain selain dua koreksi label yang diotorisasi, accepted-answer array/urutannya, normalisasi, difficulty, sortOrder dan source refs canonical. Kurasi hanya memperbaiki atribusi skill dan revisinya. Dua perbedaan label dialog plain/HTML diselaraskan melalui `promptCorrections` atas persetujuan pemilik proyek pada BIL-03, dengan kenaikan revisi canonical/source; HTML dan kunci tetap.
- Tambahkan skill lexical yang benar dengan kode/UUID baru di lesson yang membutuhkan. Dua lesson boleh mengajarkan lexeme JMdict yang sama dengan identitas lesson-owned berbeda; sumber entry yang sama tetap terlihat. Ini tidak memindahkan skill existing atau mengubah kunci mastery lama.
- Entry salah `n5_kosoado_modifiers_kyuu` (`九`) dan `n5_which_noun_dono_dono` (`殿`) tetap berada pada ID/content lama dan unpublished. Perbaikan memakai entry baru, bukan perubahan makna di balik ID lama.
- Tiga block yang ditahan serta empat struktur existing yang menunjuk `VOCABULARY` menjadi `PARAGRAPH` tanpa owner grammar palsu. ID/sortOrder dan seluruh HTML pola/contoh Jepang lama dipertahankan di body baru; semua makna penjelasan Inggris/Indonesia tetap tercakup. Revisi canonical dan translation dinaikkan. Seluruh 39 struktur yang tersisa mempunyai owner `GRAMMAR` published.
- `n5_kosoado_modifiers_sono` mengganti prerequisite `..._kyuu` dengan `n5_kosoado_modifiers_kono`; `n5_vocab_people_reference_basic_watashi` mengganti `..._dono_dono` dengan `n5_which_noun_dono_determiner`. Identitas/content skill existing tidak berubah. New skill di-append untuk menjaga sortOrder lama; prerequisite menyatakan dependency, bukan nomor tampilan. Graph terjangkau dari skill published diperiksa tanpa siklus, target hilang atau target unpublished, termasuk referensi eksternal terhadap katalog v1 yang tidak berubah. Dependency `kana_script_switch_basics` tetap perlu dicek pada DB tujuan BIL-03.

## Pembagian kerja

`syllabus-maker` menyiapkan artefak kurasi berdasarkan Bunpro/Tae Kim serta JMdict untuk lexeme. Agent utama mengintegrasikan overlay, daftar scope, compiler dan guard. `syllabus-reviewer` memeriksa sumber, atribusi, kedua bahasa, diff identitas dan batas acceptance secara independen tanpa mengedit.

Scope ini menyelesaikan 18 referensi yang ditahan pada tujuh lesson, ditambah empat ketidaksesuaian tipe owner struktur, dua edge prerequisite retired dan empat hint yang membocorkan jawaban. Penambahan lesson N5/N4 lain tetap BIL-04. Batas penugasan maker umum yang hanya dua array tetap berlaku di luar usulan kurasi eksplisit ini.

## Resolusi dan sumber

| Penambahan lexical | Lesson pemilik | JMdict entry |
| --- | --- | --- |
| 失礼します / しつれいします | greetings-and-polite-openers | 2276200 |
| 大学生 / だいがくせい | belonging-role-and-basic-preference | 1413260 |
| インドネシア人 / インドネシアじん | belonging-role-and-basic-preference | 2582220 |
| どれ | ko-so-a-do-pronouns | 1009290 |
| この / 此の | ko-so-a-do-modifiers | 1582920 |
| どの / 何の | ko-so-a-do-modifiers dan choice-and-person-reference, masing-masing ID baru | 1920240 |
| 寝る / ねる | polite-verb-basics | 1360010 |

Entry dibaca langsung dari snapshot `JMdict_e.gz`. Pola demonstratif/interogatif diperiksa dari snapshot Bunpro `この/その/あの/どの/どれ/ここ/そこ/あそこ/どこ/誰/の`; source refs menyimpan file/URL yang tepat. Konjugasi `寝る → ねます` juga diperiksa dengan Tae Kim §4.1.2–4.1.3, PDF/cetak hlm. 84–87. Evidence lengkap per owner tersedia pada `resolutions` (22 record: 15 soal + 7 block); dua koreksi prerequisite membawa evidence tersendiri.

Empat perbaikan hint mengubah `hintTexts[1]` kedua bahasa pada soal `e2428888-83a2-5189-9b4f-02bccb94f3b7`, `06713a0b-506b-5852-be82-9c58682229e6`, `745dcf70-a820-5eff-a400-eae03ef141d5`, dan `1dca1e7b-2713-5b7d-bfa1-7bd65f2491ec`. Hint kini menjelaskan waktu/register atau sudut pandang pembicara tanpa mengeja kunci. Penjelasan bantuan tetap setara; revisi canonical, translation dan provenance dinaikkan. Source refs canonical soal tidak berubah.

## Gate verifikasi

```sh
python3 scripts/syllabus/validate_bilingual_contracts.py
python3 scripts/syllabus/test_bilingual_batch.py
python3 scripts/syllabus/convert_bilingual_batch.py --check --require-publishable
```

Compiler memeriksa scope dan checksum kurasi, keunikan ID/kode/urutan, atribusi same-lesson yang published, tipe owner grammar, bilingual current, revisi monotonic serta graph prerequisite. Tes preservasi memeriksa identitas/Jepang/kunci/provenance dan bank sepuluh soal `1..10`. Gate tidak dapat diloloskan hanya dengan mengosongkan daftar hold: referensi serta resolusi kurasinya harus valid. `READY_FOR_BIL_03` berarti acceptance artefak BIL-02, bukan importer/database/cutover yang telah dijalankan.

## Hasil review dan batas pemeriksaan

Verdict `syllabus-reviewer`: **READY_FOR_INTEGRATION**, tanpa temuan wajib tersisa untuk acceptance artefak BIL-02. Reviewer memeriksa baseline 16 lesson, kedua bahasa seluruh 94 skill/209 block/160 soal, kemudian delapan skill tambahan, tujuh block pengganti, dua dependency yang diperbaiki, empat hint dan generated diff terhadap baseline Git. Sumber diperiksa secara independen: JMdict spelling/readings/POS untuk seluruh 63 owner vocabulary terhadap 60 entry unik, sebelas snapshot Bunpro, serta Tae Kim hlm. 84–87. Review AI bukan klaim verifikasi oleh pengajar/native speaker independen.

DFS independen memeriksa 121 skill published yang terjangkau: 100 skill published pada batch ditambah 21 node pada rantai prerequisite eksternal. Seluruhnya tersedia pada katalog sumber dan tanpa siklus. Importer BIL-03 memastikan seluruh rantai eksternal tersebut tersedia pada DB tujuan, termasuk backfill terbatas yang diotorisasi pemilik proyek untuk node yang hilang; keberadaan satu node langsung `kana_script_switch_basics` saja belum mencukupi.

Hasil mesin: **492 owner**, **102 skill** (dua entry salah tetap unpublished), **209 block** (112 paragraf, 58 contoh, 39 struktur), **160 soal**, **16/16 lesson siap**, tanpa hold. `validate_bilingual_contracts.py`, 17 tes batch dan gate publishable lulus. Source v1/checksum, semua existing ID, semua HTML prompt/kunci/difficulty/source refs canonical soal tetap, dengan dua koreksi label prompt plain yang diotorisasi BIL-03; delapan ID baru dibatasi allowlist kurasi.

Keterbatasan desain soal baseline yang dibekukan:

- Modifier soal `d2ddb742-b2eb-5ed7-9560-bf80a19b455b` tidak membatasi posisi benda lewat prompt Jepang saja; konteks maksud ditopang paket bantuan.
- Soal `b40d74e7-b7fa-5bb9-b49c-92edd78a30f4` tidak membatasi desire/register dari prompt saja.
- Soal `a2fd5062-a1b8-5656-9879-a35b881be704` menerima `ではありません`; padanan alami lain belum diperluas karena keputusan mempertahankan kunci.
- Ladder numerik `1..10` lengkap, tetapi kelulusannya bukan bukti progression pedagogis atau bank yang bebas semua ambiguitas.

Hal-hal tersebut adalah follow-up kurasi assessment canonical, terpisah dari acceptance konversi bilingual/atribusi BIL-02. Jangan mengganti prompt/kunci diam-diam untuk menyembunyikannya. Runtime/importer/database, dry-run MySQL dan cutover tetap BIL-03 dan tahap rollout berikutnya.
