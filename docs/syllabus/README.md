# Syllabus Documentation

## Scope Dan Status

Folder ini menjadi baseline dokumentasi `SYL-00` sampai `SYL-07` dan `BIL-01` sampai `BIL-08`. Mulai dari [task breakdown](../task-breakdown.md), lalu baca dokumen sesuai tanggung jawab yang dikerjakan.

Seed aktif berada di `content/syllabus/v1/`. Artefak bilingual batch awal berstatus **READY_FOR_BIL_03**: 16 lesson, 492 owner bilingual, 102 skill, 209 block, dan 160 soal. Importer, database, dan cutover v2 tetap pekerjaan `BIL-03`; lihat [hasil konversi](bilingual/batch-01/bilingual-batch-01-conversion.md).

## Peta Tanggung Jawab

| Folder | Tanggung jawab | Task terkait |
| --- | --- | --- |
| [curriculum/](curriculum/) | Struktur JLPT, coverage, urutan unit, breakdown lesson/skill, dan dukungan aktivitas. | `SYL-01`, `SYL-02`, `SYL-04`, `SYL-05`, `SYL-06`, `SYL-07` |
| [ingestion/](ingestion/) | Prioritas sumber, akuisisi snapshot, normalisasi, kontrak seed, dan mapping persistence. | `SYL-00`, `SYL-03`, `SYL-03A`, `SYL-06B`, `IMP-05` |
| [flashcards/](flashcards/) | Mapping skill ke deck/item serta kontrak seeder kana dan vocabulary. | `SYL-06A`, `IMP-07` |
| [authoring/](authoring/) | Panduan penulisan/review konten bilingual dan atribusi sumber skill authoring. | Tooling `BIL-04` |
| [bilingual/](bilingual/) | Rencana tahapan bilingual dan kontrak konten, locale, revisi, publikasi, serta transisi runtime. | `BIL-01` sampai `BIL-08` |
| [bilingual/batch-01/](bilingual/batch-01/) | Inventaris scope batch awal, catatan konversi/kurasi, dan laporan mesin. | `BIL-02` |
| [schema/](schema/) | JSON Schema machine-readable untuk syllabus v1/v2 dan seed flashcard. | `SYL-03`, `SYL-06A`, `BIL-01` |
| [examples/](examples/) | Contoh payload dan fragment authoring untuk schema terkait. | `SYL-03`, `BIL-01`, tooling `BIL-04` |
| [licenses/](licenses/) | Notice lisensi yang menyertai adaptasi skill authoring. | Tooling `BIL-04` |

## Curriculum

- [Struktur syllabus JLPT](curriculum/jlpt-syllabus-structure.md): hierarki `track -> unit -> lesson -> skill` dan taxonomy.
- [Coverage seed](curriculum/seed-coverage-scope.md): scope detail N5/N4 dan skeleton N3/N2.
- [Urutan unit](curriculum/jlpt-unit-sequencing.md): urutan belajar dan objective unit.
- [Breakdown lesson dan skill](curriculum/jlpt-lesson-and-skill-breakdown.md): inventaris lesson dan skill trackable.
- [Dukungan aktivitas skill](curriculum/skill-activity-support-matrix.md): support flags untuk flashcard dan practice.

## Ingestion

- [Source of truth dan ingestion](ingestion/source-of-truth-and-ingestion-plan.md): prioritas sumber, lisensi, dan normalisasi.
- [Akuisisi sumber mentah](ingestion/raw-source-acquisition.md): snapshot provider, provenance, dan checksum.
- [Kontrak seed content](ingestion/seed-content-schema.md): bentuk seed dan pemetaan ke ERD syllabus.

## Flashcards

- [Mapping deck](flashcards/flashcard-deck-mapping.md): relasi `skill -> item -> deck`, grouping, dan batas import.
- [Seeder kana](flashcards/kana-flashcard-seeder-schema.md): kontrak artifact dan script seed kana.
- [Seeder vocabulary](flashcards/vocabulary-flashcard-seeder-schema.md): kontrak deck, item, dan membership vocabulary.
- [Kurasi dan authoring vocabulary](flashcards/vocabulary-authoring-guide.md): subagent/AI-skill, kelompok mandiri kandidat, handoff bilingual, review, dan dependency skill–lesson `VOC-01`–`VOC-03`.

## Authoring

- [Panduan authoring dan review](authoring/syllabus-authoring-guide.md): scope penugasan, format fragment/overlay, gaya bahasa, dan verifikasi.
- [Sumber skill authoring](authoring/syllabus-authoring-skill-sources.md): atribusi dan batas adaptasi prinsip pedagogi.

## Bilingual

- [Rencana dukungan bilingual](bilingual/bilingual-support-plan.md): urutan dan dependency `BIL-01` sampai `BIL-08`.
- [Kontrak konten bilingual](bilingual/bilingual-content-contract.md): schema v2, locale, revisi, publication/fallback, dan transisi importer/API.
- [Inventaris batch 01](bilingual/batch-01/bilingual-batch-01.json): input scope, identitas baseline, checksum, dan kurasi yang diizinkan.
- [Catatan konversi](bilingual/batch-01/bilingual-batch-01-conversion.md): hasil, gate verifikasi, dan riwayat blocker.
- [Catatan kurasi](bilingual/batch-01/bilingual-batch-01-curation.md): resolusi, evidence sumber, hasil review, dan batas acceptance.
- [Laporan mesin](bilingual/batch-01/bilingual-batch-01-conversion.json): output compiler berisi status dan hasil pemeriksaan batch.

Teks materi yang diedit tetap berada di [sumber authoring v2](../../content/syllabus/v2/README.md). Folder batch dokumentasi menyimpan scope dan laporan, sedangkan compiler berada di [scripts/syllabus/](../../scripts/syllabus/).

## Relokasi Dan Provenance

Dokumen yang sebelumnya langsung berada di `docs/syllabus/` dipindahkan ke folder tanggung jawab di atas dengan nama file yang sama. Path baru digunakan untuk navigasi, input generator, dan lokasi laporan compiler. Folder `schema/`, `examples/`, serta `licenses/` tetap pada lokasi semula.

Path dan URL dalam provenance seed frozen tetap historis agar pemindahan dokumentasi tidak mengubah checksum, revisi, atau hasil kompilasi konten. Referensi historis berikut dapat ditelusuri ke lokasi baru:

| Referensi historis | Dokumen saat ini |
| --- | --- |
| `docs/syllabus/source-of-truth-and-ingestion-plan.md` | [Source plan](ingestion/source-of-truth-and-ingestion-plan.md) |
| `docs/syllabus/jlpt-lesson-and-skill-breakdown.md` | [Breakdown lesson/skill](curriculum/jlpt-lesson-and-skill-breakdown.md) |
| `docs/syllabus/bilingual-batch-01-curation.md` | [Catatan kurasi batch 01](bilingual/batch-01/bilingual-batch-01-curation.md) |

## Source Priority

| Area | Primary source | Secondary / support | Ownership di KotobaHub |
| --- | --- | --- | --- |
| Kana | Internal curation | none | Full internal |
| Kanji | KANJIDIC2 | JLPT overlay tags community-maintained + internal curation untuk penyesuaian level/unit | Mixed |
| Grammar | Bunpro JLPT Grammar Decks + grammar point pages | Tae Kim's Guide to Learning Japanese | Mixed |
| Vocabulary | JMdict | [`yomitan-jlpt-vocab`](https://github.com/stephenmk/yomitan-jlpt-vocab) / Jonathan Waller JLPT list + internal curation untuk penempatan level/unit | Mixed |
| Example sentences | Tatoeba | Internal filtering/selection | Mixed |
| Vocabulary frequency | Japanese Core 2k/6k | none | Optional metadata only |

## High-Level Decisions
- Syllabus product tetap memakai struktur resmi `track -> unit -> lesson -> skill` sebagaimana dikunci di [erd/syllabus-domain.md](../erd/syllabus-domain.md).
- Source eksternal tidak diimpor mentah langsung ke tabel domain. Semua data harus melewati lapisan normalisasi dan kurasi syllabus KotobaHub terlebih dahulu.
- Penempatan JLPT di product layer tetap menjadi keputusan internal KotobaHub, karena tidak semua source primer membawa field JLPT modern yang siap dipakai apa adanya.
- Untuk `kanji` dan `vocabulary`, metadata JLPT boleh datang dari overlay source tambahan selama tetap ditandai sebagai `jlpt signal`, bukan langsung dianggap `curriculumLevel` final.
- Example sentences dan vocabulary frequency tetap boleh ikut dibawa di seed content sebagai metadata, walau saat ini ERD `syllabus` belum punya tabel dedicated untuk keduanya.
- Paragraf penjelasan materi yang menjadi bagian lesson tidak lagi dianggap metadata longgar; area ini kini diposisikan sebagai konten first-class melalui tabel `lesson_content_blocks`.

## Known Constraints
- `KANJIDIC2` menyediakan indikator JLPT lama, bukan daftar resmi `N5 -> N1` modern.
- `JMdict` tidak menyediakan field JLPT native.
- [`yomitan-jlpt-vocab`](https://github.com/stephenmk/yomitan-jlpt-vocab) berguna sebagai overlay vocabulary-to-JLPT yang sudah dipetakan ke `JMdict` entry, tetapi tetap membawa limitasi list Jonathan Waller yang bersifat heuristic.
- JLPT tag dictionaries dari komunitas Yomichan/Yomitan, mis. thread [WaniKani Community ini](https://community.wanikani.com/t/yomichan-addon-jlpt-and-wanikani-level-tags/55567), dapat dipakai sebagai enrichment layer untuk `JMdict` dan `KANJIDIC2`, tetapi sifatnya community-maintained dan tidak boleh dijadikan source of truth tunggal.
- Bunpro menyediakan deck dan halaman grammar point resmi, tetapi pada review ini belum ditemukan dokumentasi bulk export resmi di situsnya; ingestion grammar perlu dimulai dari kurasi halaman deck + detail grammar point.
- Tatoeba dan EDRDG punya syarat atribusi/lisensi yang harus dibawa ke dokumentasi produk atau halaman attribution saat data dipakai.
- `Japanese Core 2k/6k` diperlakukan hanya sebagai metadata frequency cadangan sampai ada kebutuhan produk dan dasar lisensi/akuisisi yang lebih final.
