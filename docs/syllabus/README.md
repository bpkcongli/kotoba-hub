# Syllabus Documentation

## Scope
- Folder ini menjadi baseline dokumentasi untuk task `SYL-01` sampai `SYL-07`.
- Fokus tahap awal bukan membuat seed final, tetapi mengunci source of truth eksternal, cara akuisisi dataset, dan bentuk seed content yang konsisten dengan ERD `syllabus`.
- Dokumen di folder ini harus dibaca sebelum menyusun unit, lesson, skill, atau seed import untuk domain `syllabus`.

## Related Tasks
- `SYL-00` Dokumentasi source-of-truth, ingestion, dan seed schema.
- `SYL-01` Finalisasi struktur `track -> unit -> lesson -> skill` berbasis JLPT.
- `SYL-02` Penetapan scope seed awal `N5 -> N4`, dengan skeleton `N3 -> N2`. Lihat [seed-coverage-scope.md](./seed-coverage-scope.md).
- `SYL-03` Definisi schema seed content.
- `SYL-04` Finalisasi daftar unit per level dan urutan belajar utama. Lihat [jlpt-unit-sequencing.md](./jlpt-unit-sequencing.md).
- `SYL-05` Turunan lesson dan skill canonical. Lihat [jlpt-lesson-and-skill-breakdown.md](./jlpt-lesson-and-skill-breakdown.md).
- `SYL-06` Finalisasi support flags skill terhadap flashcard dan random questions. Lihat [skill-activity-support-matrix.md](./skill-activity-support-matrix.md).
- `SYL-06A` sampai `SYL-07` mapping deck, seed JSON final, dan review alignment ke personalization/progress.

## Documents In This Folder
- [jlpt-syllabus-structure.md](./jlpt-syllabus-structure.md)
  Mengunci struktur resmi `track -> unit -> lesson -> skill`, taxonomy `curriculumLevel`, taxonomy `skillType`, serta policy support flags untuk task `SYL-01`.
- [seed-coverage-scope.md](./seed-coverage-scope.md)
  Menetapkan batas coverage seed awal: `N5 -> N4` harus detail dan boleh dipublish, sementara `N3 -> N2` hadir sebagai skeleton extensible untuk task `SYL-02`.
- [source-of-truth-and-ingestion-plan.md](./source-of-truth-and-ingestion-plan.md)
  Menjelaskan prioritas sumber referensi, cara mengambil dataset, limitasi lisensi/format, dan aturan normalisasi sebelum data masuk ke seed content.
- [seed-content-schema.md](./seed-content-schema.md)
  Menjelaskan bentuk seed content yang disarankan untuk repo dan bagaimana field seed dipetakan ke tabel `tracks`, `units`, `lessons`, `lesson_content_blocks`, `skills`, dan `unit_skill_mappings`.
- [jlpt-unit-sequencing.md](./jlpt-unit-sequencing.md)
  Mengunci daftar unit published `N5` dan `N4`, urutan learner journey utamanya, serta batas scope `N3/N2` pada task `SYL-04`.
- [jlpt-lesson-and-skill-breakdown.md](./jlpt-lesson-and-skill-breakdown.md)
  Menurunkan unit published `N5` dan `N4` menjadi lesson map canonical beserta bentuk skill trackable per lesson untuk task `SYL-05`.
- [skill-activity-support-matrix.md](./skill-activity-support-matrix.md)
  Mengunci support flags final seluruh skill published `N5` dan `N4`, termasuk terjemahan istilah produk "random questions" ke `supportsPracticeObjective` dan `supportsPracticeFreeResponse` untuk task `SYL-06`.
- [flashcard-deck-mapping.md](./flashcard-deck-mapping.md)
  Mengunci aturan normalisasi bundle `KANJI`/`VOCABULARY`, grouping deck system bawaan, dan relasi `skill -> flashcard item -> flashcard deck` untuk task `SYL-06A`.
- [raw-source-acquisition.md](./raw-source-acquisition.md)
  Mencatat hasil task `SYL-03A`, termasuk provider mana yang sudah tersnapshot di `content/syllabus/sources/`, mana yang masih partial, dan konvensi provenance/checksum yang dipakai.
- [schema/](./schema/)
  Berisi JSON Schema machine-readable untuk `manifest.json` dan file track seed agar bentuk payload dapat divalidasi otomatis.
- [examples/](./examples/)
  Berisi contoh payload minimal yang mengikuti schema final `SYL-03` tanpa mengklaim bahwa coverage syllabus final `N5 -> N4` sudah lengkap.

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
