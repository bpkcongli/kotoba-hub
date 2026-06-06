# Syllabus Source Of Truth And Ingestion Plan

## Scope
- Dokumen ini mendefinisikan baseline untuk task `SYL-00`, `SYL-01`, `SYL-02`, dan `SYL-03`.
- Fokusnya adalah bagaimana KotobaHub mengambil referensi eksternal untuk `kana`, `kanji`, `grammar`, `vocabulary`, `example sentences`, dan `frequency`, lalu menurunkannya menjadi seed content yang cocok dengan ERD project.

## Design Principles
- `syllabus` tetap menjadi source of truth internal setelah data dikurasi dan dinormalisasi.
- Source eksternal hanya menjadi bahan baku referensi, bukan struktur final yang langsung ditampilkan ke user.
- Penempatan level, urutan belajar, prerequisite, dan support flags tetap ditentukan oleh syllabus KotobaHub.
- Jika source primer tidak menyediakan metadata yang dibutuhkan ERD, gap tersebut harus ditutup dengan kurasi internal yang terdokumentasi, bukan asumsi diam-diam.

## External Source Matrix

| Area | Source | Acquisition path | Data value utama | Constraint utama |
| --- | --- | --- | --- | --- |
| Kana | Internal build | Ditulis manual di repo | Kontrol penuh atas urutan gojuon, dakuten, handakuten, combo, dan romanization policy | Tidak ada dataset primer eksternal |
| Kanji | KANJIDIC2 | Download `kanjidic2.xml(.gz)` dari EDRDG | Literal kanji, reading, meaning, stroke/frequency metadata, legacy JLPT indicator | Field JLPT masih basis lama |
| Kanji JLPT overlay | Community JLPT tag dictionaries | Cross-reference tags terhadap literal/entry target | Sinyal tambahan level JLPT modern | Community-maintained, perlu verifikasi dan deduping |
| Grammar | Bunpro JLPT Grammar Decks + grammar point pages | Kurasi dari halaman deck resmi per level lalu resolve ke halaman grammar point | JLPT grouping, urutan deck, structure, register, examples, related points | Belum ada bulk export resmi yang terdokumentasi pada review ini |
| Grammar support | Tae Kim's Guide | Refer per chapter/topic | Penjelasan alternatif dan cross-check sequencing | Bukan source utama JLPT |
| Vocabulary | JMdict | Download current JMdict XML dari EDRDG | Headword, reading, gloss, POS, field, commonness/frequency-like priority tags | Tidak punya field JLPT native |
| Vocabulary JLPT overlay | [`yomitan-jlpt-vocab`](https://github.com/stephenmk/yomitan-jlpt-vocab) | Cross-reference ke `JMdict` entry id yang sudah disediakan repo | Sinyal JLPT level untuk entry vocabulary | Berbasis list Jonathan Waller yang bersifat heuristic |
| Example sentences | Tatoeba | Weekly exports atau custom sentence-pair export | Sentence pairs JP-EN, links, indices, transcriptions, audio refs | Perlu filter kualitas dan lisensi |
| Lesson post-study question bank | Tatoeba + Bunpro grammar point examples | Kurasi manual dari candidate sentence yang relevan per lesson | `10` soal `SHORT_FREE_RESPONSE` canonical per lesson dengan difficulty ladder `1..10` | Perlu editorial curation, provenance, dan normalisasi jawaban kana deterministik |
| Vocabulary frequency | Japanese Core 2k/6k | Referensi seri/course listing, lalu kurasi manual bila dipakai | Sinyal kata umum untuk ranking/ordering | Belum dijadikan field ERD dan jalur bulk export resmi belum dikunci |

## Source Details

### 1. Kana
- Kana dibangun internal agar product bisa mengontrol urutan belajar yang cocok dengan learner journey KotobaHub, bukan sekadar menyalin tabel alfabet statis.
- Data minimal yang perlu dimiliki:
  - `character`
  - `script_family`: `HIRAGANA` atau `KATAKANA`
  - `romanization`
  - `row_group`: `A`, `KA`, `SA`, dst.
  - `variant_type`: `BASIC`, `DAKUTEN`, `HANDAKUTEN`, `COMBINATION`
  - `prerequisite_skill_codes`
- Karena `kana` full internal, level JLPT dan placement unit/lesson langsung ditentukan oleh syllabus KotobaHub.

### 2. Kanji from KANJIDIC2
- EDRDG menyediakan halaman home `KANJIDIC2` dengan file `kanjidic2.xml` dan DTD/XSD untuk parsing XML.
- KANJIDIC2 relevan karena menyediakan metadata yang langsung cocok untuk kanji learning:
  - `literal`
  - `reading_meaning`
  - `ja_on`
  - `ja_kun`
  - `meaning`
  - `stroke_count`
  - `freq`
  - `jlpt`
- Caveat penting: dokumentasi DTD KANJIDIC2 menyebut field `jlpt` masih mengikuti sistem JLPT lama `1-4`, dan secara eksplisit menyebut tidak ada daftar resmi untuk level baru `N5 -> N1`.
- Konsekuensi untuk KotobaHub:
  - pakai KANJIDIC2 sebagai source primer metadata kanji
  - jangan memetakan field `jlpt` KANJIDIC2 langsung sebagai `curriculum_level` final di product
  - simpan `jlpt` dari source sebagai `legacyJlpt` di seed metadata
  - tetapkan `curriculumLevel` final melalui kurasi internal syllabus KotobaHub
- Overlay yang mungkin dipakai:
  - community JLPT tag dictionaries untuk Yomichan/Yomitan, mis. referensi dari [WaniKani Community](https://community.wanikani.com/t/yomichan-addon-jlpt-and-wanikani-level-tags/55567), dapat dipakai sebagai sinyal tambahan yang berdiri terpisah dari base dictionary
  - karena thread komunitas menyebut tag dictionary ini memang sengaja dipisahkan dari `JMDICT` dan `KANJIDIC`, model ini cocok dengan arsitektur enrichment layer untuk KotobaHub
  - tetap perlakukan hasilnya sebagai `jlpt signal`, bukan final truth
- Rekomendasi field normalisasi kanji:
  - `external_id`: literal kanji itu sendiri
  - `kanji`
  - `meanings_en[]`
  - `onyomi[]`
  - `kunyomi[]`
  - `stroke_count`
  - `frequency_rank`
  - `legacy_jlpt_level`
  - `jlpt_signal_candidates[]`
  - `source_url`

### 3. Grammar from Bunpro and Tae Kim
- Bunpro memiliki official JLPT grammar decks. Pada saat review ini:
  - `Bunpro N5 [Grammar]` berisi `130 Grammar Items`
  - `Bunpro N4 [Grammar]` berisi `179 Grammar Items`
- Bunpro juga memiliki official textbook deck `Tae Kim's Japanese Grammar Guide` dengan `223 Grammar Items`, sehingga Tae Kim cocok dipakai sebagai secondary reference untuk penjelasan atau crosswalk topic.
- Halaman grammar point Bunpro memuat data yang bernilai untuk seed grammar:
  - label JLPT
  - title / pattern
  - translation gloss
  - structure
  - register
  - examples
  - related / synonyms
- Pada review ini belum ditemukan dokumentasi bulk export resmi untuk grammar dataset Bunpro. Karena itu ingestion grammar disarankan memakai dua tahap:
  1. kurasi deck resmi per level sebagai daftar canonical grammar points per JLPT
  2. resolve tiap grammar point ke halaman detail untuk mengambil `structure`, `register`, dan contoh
- Peran Tae Kim:
  - dipakai hanya sebagai secondary explanation source
  - tidak mengalahkan placement JLPT yang datang dari Bunpro deck resmi
  - cocok untuk membantu grouping unit/lesson yang lebih pedagogis
- Rekomendasi field normalisasi grammar:
  - `external_id`
  - `bunpro_level`
  - `pattern`
  - `title`
  - `meaning`
  - `structure_lines[]`
  - `register`
  - `example_refs[]`
  - `related_points[]`
  - `tae_kim_refs[]`
  - `source_url`
- Contoh Bunpro juga relevan sebagai candidate untuk bank soal lesson `post-study quiz`, terutama pada lesson grammar yang membutuhkan kalimat pendek dengan slot yang jelas.

### 4. Vocabulary from JMdict
- JMdict adalah source primer untuk lexical entries. EDRDG menyediakan current version yang di-generate dari source database hampir setiap hari.
- Struktur JMdict cocok untuk kebutuhan vocabulary seed:
  - `ent_seq`
  - `k_ele/keb`
  - `r_ele/reb`
  - `sense/gloss`
  - `sense/pos`
  - `sense/field`
  - `ke_pri` dan `re_pri`
- Dokumentasi JMdict menunjukkan `ke_pri`/`re_pri` hanya sinyal priority/commonness seperti `news1`, `ichi1`, `spec1`, `gai1`, atau `nfxx`; tidak ada field `jlpt`.
- Repo [`yomitan-jlpt-vocab`](https://github.com/stephenmk/yomitan-jlpt-vocab) bisa dipakai sebagai overlay yang cukup kuat untuk vocabulary karena:
  - repo itu secara eksplisit menyatakan telah menambahkan `JMdict` entry id untuk setiap kata pada list JLPT Jonathan Waller
  - maintainer juga menjelaskan bahwa ia memakai data `JMdict` untuk memilih spelling yang lebih umum ketika list aslinya memakai bentuk langka
- Limitasi penting dari overlay ini:
  - list Jonathan Waller sudah lama dan repo tersebut menyatakan tidak mengkurasi ulang keseluruhan list
  - maintainer menyebut sendiri bahwa official vocabulary lists untuk JLPT memang tidak ada, sehingga hasilnya tetap berupa educated guess
- Konsekuensi untuk KotobaHub:
  - JMdict menjadi source primer untuk bentuk kata, reading, gloss, dan POS
  - `yomitan-jlpt-vocab` boleh dipakai untuk memberi `jlpt signal` awal pada entry vocabulary
  - JLPT placement vocabulary final tetap menjadi hasil kurasi internal syllabus
  - priority tags JMdict boleh dipakai sebagai salah satu ranking signal, tetapi bukan pengganti mapping JLPT
- Rekomendasi field normalisasi vocabulary:
  - `external_id`: `ent_seq`
  - `primary_spelling`
  - `alternate_spellings[]`
  - `readings[]`
  - `glosses_en[]`
  - `parts_of_speech[]`
  - `fields[]`
  - `priority_tags[]`
  - `commonness_rank_bucket`
  - `jlpt_signal_candidates[]`
  - `source_url`

### 4A. JLPT Overlay Strategy for Kanji and Vocabulary
- Kesimpulan praktisnya: ya, memungkinkan untuk combine `KANJIDIC2` dan `JMdict` dengan referensi tambahan yang Anda kirim.
- Model combine yang disarankan:
  1. pakai `KANJIDIC2` atau `JMdict` sebagai lexical/base layer
  2. pakai overlay repo/tag dictionary untuk menambahkan kandidat level JLPT
  3. simpan semua kandidat itu sebagai `jlpt signals`
  4. resolve satu `curriculumLevel` final lewat aturan internal KotobaHub
- Kenapa ini lebih aman:
  - source primer tetap memegang bentuk lexical resmi
  - overlay source membantu mengisi gap metadata JLPT
  - jika ada konflik atau multi-tag, kita masih punya ruang untuk kurasi product-layer
- Aturan resolve yang direkomendasikan:
  - jika `JMdict + yomitan-jlpt-vocab` punya kecocokan tunggal, pakai itu sebagai candidate utama vocabulary
  - jika source community memberi lebih dari satu tag JLPT untuk item yang sama, simpan semuanya di `jlpt_signal_candidates[]` lalu pilih satu level final secara internal
  - untuk kanji, jangan override `KANJIDIC2` lexical data; overlay hanya menambah signal level
  - jika tidak ada overlay, item tetap valid dan masuk antrean kurasi manual

### 5. Example Sentences from Tatoeba
- Tatoeba menyediakan dua jalur akuisisi resmi:
  - custom export sentence pairs sesuai pasangan bahasa
  - weekly exports yang diperbarui setiap Sabtu pukul `06:30 UTC`
- Untuk kebutuhan KotobaHub, file yang paling relevan:
  - `sentences`
  - `links`
  - `jpn_indices`
  - `transcriptions`
  - `sentences_with_audio`
- `jpn_indices` sangat berguna karena menghubungkan pasangan kalimat Jepang-Inggris dan membawa format indeks ala Tanaka Corpus.
- Rekomendasi penggunaan:
  - jadikan Tatoeba source primer untuk `example sentence candidates`, bukan auto-publish langsung ke lesson
  - filter hanya sentence pair `jpn -> eng`
  - prioritaskan sentence yang punya transcription
  - audio diperlakukan opsional karena lisensinya bisa berbeda per contributor
  - hindari sentence yang terlalu kompleks untuk level target
- Tatoeba juga cocok menjadi source primer candidate sentence untuk `post-study quiz` lesson selama:
  - kalimat bisa dipetakan jelas ke skill/lesson yang diuji
  - jawaban slot-fill dapat dibuat deterministik dengan tepat empat opsi
  - tingkat kompleksitasnya bisa diurutkan ke ladder `difficultyLevel` `1..10`
- Rekomendasi field normalisasi sentence:
  - `sentence_id`
  - `japanese_text`
  - `english_text`
  - `transcription`
  - `audio_refs[]`
  - `license`
  - `source_url`
  - `linked_skill_candidates[]`

### 6. Vocabulary Frequency from Japanese Core 2k/6k
- Referensi publik yang terlihat saat review ini menunjukkan seri `Japanese Core 2000` di iKnow! berisi `1000` item dan `1941` sentences, serta seri legacy `Core 2000` yang mencakup `2000` kata paling umum.
- Karena requirement project saat ini hanya "tambahkan dulu ke dokumentasi", frequency diperlakukan sebagai metadata opsional, bukan bagian dari source of truth syllabus.
- Rekomendasi:
  - jangan jadikan Core 2k/6k sebagai dasar penempatan JLPT
  - simpan hanya `frequencyBand`, `frequencyRank`, atau `coreListSource`
  - aktifkan hanya bila nanti flashcard sorting, recommendation, atau deck generation memang butuh sinyal frequency
- Sampai jalur lisensi dan bulk acquisition dikunci, metadata ini sebaiknya tetap seed-only dan optional.

## Normalization Strategy

### Layered Model
1. `raw source layer`
   - Menyimpan bentuk data sedekat mungkin dengan source asli.
   - Berguna untuk re-import bila transform berubah.
2. `curriculum seed layer`
   - Menyimpan bentuk data yang sudah diputuskan oleh KotobaHub.
   - Dipakai untuk generate `tracks`, `units`, `lessons`, `skills`, dan content support lain.
3. `jlpt overlay layer`
   - Menyimpan signal level dari source tambahan yang tidak menjadi lexical source utama.
   - Contoh: `yomitan-jlpt-vocab`, community tag dictionaries, atau mapping manual hasil review.

### Why This Matters
- `KANJIDIC2` dan `JMdict` tidak langsung cocok dengan kebutuhan `curriculum_level` modern.
- Bunpro dan Tatoeba juga lebih cocok dianggap sebagai referensi pedagogis, bukan struktur product tree final.
- Overlay JLPT dari repo komunitas bisa sangat membantu, tetapi perlu dipisahkan dari lexical source agar konflik dan ambiguitas bisa dikelola dengan jelas.
- Dengan model bertingkat ini, kita bisa menjaga source attribution tanpa mencampur logika kurasi ke parser mentah.

## Mapping To Current ERD

### Direct ERD Mapping

| ERD entity | Sumber keputusan utama | Notes |
| --- | --- | --- |
| `tracks` | Internal syllabus curation | Biasanya satu track per JLPT level atau fase besar |
| `units` | Internal syllabus curation | Disusun dari grouping pedagogis, bukan grouping source mentah |
| `lessons` | Internal syllabus curation | Menjadi objective terfokus di dalam unit |
| `skills` | Mixed: source metadata + internal curation | Item paling atomik yang di-track mastery-nya |
| `lesson_post_study_questions` | Mixed: Tatoeba/Bunpro candidates + internal curation | Bank soal canonical `10` short-free-response per lesson |
| `unit_skill_mappings` | Internal syllabus curation | Menentukan scope per unit dan urutan render |

### Skill Type Recommendations
- `KANA`
- `KANJI`
- `VOCABULARY`
- `GRAMMAR`
- `READING`

Catatan finalisasi:
- Taxonomy `skill_type` final dan policy support flags untuk `SYL-01` dikunci di [jlpt-syllabus-structure.md](./jlpt-syllabus-structure.md).

### Support Flag Heuristics
- `supports_flashcards = true`
  - kana
  - kanji
  - vocabulary
- `supports_practice_objective = true`
  - kana
  - kanji
  - vocabulary
  - sebagian grammar
- `supports_practice_free_response = true`
  - grammar
  - reading
  - vocabulary production tertentu

## Known Mismatches Against Current ERD
- ERD `syllabus` belum memiliki tabel dedicated untuk:
  - vocabulary frequency
  - external source attribution
  - raw JLPT overlay signals
- Untuk fase sekarang, tiga area itu disimpan di seed content sebagai metadata/support objects, bukan row tabel inti.
- Paragraf penjelasan lesson tidak lagi masuk daftar mismatch ini karena kini sudah dimodelkan langsung melalui tabel `lesson_content_blocks`.
- Candidate sentence dan provenance detail untuk `lesson_post_study_questions` masih boleh tetap tinggal di seed metadata walau canonical question bank-nya sendiri sudah dimodelkan di ERD.
- Jika nanti produk ingin query sentence/frequency secara langsung dari database, perlu task arsitektur lanjutan untuk menambah tabel baru atau read model turunan.

## Recommended Next Steps
1. Pakai [jlpt-syllabus-structure.md](./jlpt-syllabus-structure.md) sebagai baseline structural untuk `SYL-02` sampai `SYL-06`.
2. Tentukan scope konten `N5 -> N4` dan skeleton `N3 -> N2` untuk `SYL-02`.
3. Pakai schema di [seed-content-schema.md](./seed-content-schema.md) sebagai baseline `SYL-03`.
4. Baru setelah itu susun unit, lesson, dan skill detail untuk `SYL-04` sampai `SYL-06`.
