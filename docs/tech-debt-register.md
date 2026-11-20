# Tech Debt Register

## Purpose
- Dokumen ini menampung tech debt aktif yang sudah dikenali selama fase dokumentasi dan perancangan KotobaHub.
- Tujuannya agar perubahan requirement atau arsitektur yang belum sempat diselaraskan ke semua artefak tidak hilang sebagai asumsi lisan.

## Status Rules
- `OPEN`: debt sudah dikenali tetapi belum ditangani.
- `PLANNED`: debt sudah punya arah penyelesaian, tetapi belum dieksekusi.
- `DONE`: debt sudah diselesaikan dan item bisa dipindahkan ke bagian arsip bila register nanti berkembang.

## Active Items

### `TD-001` System Design Alignment For Lesson Study Surface And Post-Study Quiz
- Status: `DONE`
- Created at: `2026-05-16`
- Trigger:
  - ERD syllabus kini menambahkan tabel `lesson_content_blocks`.
  - API syllabus kini perlu menyediakan lesson detail yang membawa `contentBlocks`.
  - Seed schema syllabus kini perlu membawa `lesson.contentBlocks`.
  - Lesson flow MVP kini mewajibkan `post-study quiz` deterministik tepat `1` soal `SHORT_FREE_RESPONSE` per attempt, yang dipilih dari bank `10` tingkat kesulitan berdasarkan `lesson_understanding_snapshots`.
- Affected artifacts:
  - [low-fidelity-wireframes-core-flows.md](./system-design/low-fidelity-wireframes-core-flows.md)
  - [high-fidelity-system-design.md](./system-design/high-fidelity-system-design.md)
- Debt summary:
  - Wireframe dan hi-fi saat ini belum secara eksplisit memodelkan surface lesson study yang menampilkan paragraf penjelasan materi berurutan.
  - Struktur screen `Syllabus` masih lebih menekankan `track -> unit -> lesson` overview dan CTA activity, belum menjelaskan bagaimana blok penjelasan lesson dibaca sebelum masuk atau saat berada di activity flow.
  - Alur transisi `finish reading -> answer required post-study quiz -> understanding level 0 to 1 -> lesson completed -> optional review ladder` belum divisualisasikan secara konsisten di lo-fi maupun hi-fi.
- Expected follow-up:
  - Tambahkan lesson study surface atau detail panel yang eksplisit pada low-fidelity.
  - Selaraskan high-fidelity agar hierarchy, scroll behavior, heading, treatment paragraph blocks, CTA `post-study quiz`, dan cue difficulty question terpilih dari bank `1-10` konsisten dengan schema baru.
  - Validasi apakah lesson explanation muncul sebagai halaman lesson tersendiri, expandable panel di unit detail, atau pre-activity study step.
  - Tentukan bagaimana state `completed` lesson, hasil quiz, understanding level `0-10`, dan next-step CTA divisualisasikan setelah quiz wajib atau review selesai.
- Resolution note:
  - Figma kini memiliki section `Codex / TD-001 TD-002 Low-Fi` dan `Codex / TD-001 TD-002 Hi-Fi` yang menambahkan `Lesson Overview` dan `Lesson Post-Study Quiz` mobile/desktop.
  - Surface lesson sekarang secara eksplisit menampilkan `contentBlocks`, CTA `Start post-study quiz`, cue target difficulty, serta delta understanding `0-10`.

### `TD-002` Lesson Completion Cues Across Syllabus And Progress Surfaces
- Status: `DONE`
- Created at: `2026-06-02`
- Trigger:
  - Completion lesson kini bergantung pada jawaban benar pertama di `post-study quiz` wajib sehingga `lesson_understanding_snapshots.current_understanding_level >= 1`, bukan sekadar kunjungan ke halaman lesson.
- Affected artifacts:
  - [information-architecture-and-page-inventory.md](./system-design/information-architecture-and-page-inventory.md)
  - [low-fidelity-wireframes-core-flows.md](./system-design/low-fidelity-wireframes-core-flows.md)
  - [high-fidelity-system-design.md](./system-design/high-fidelity-system-design.md)
- Debt summary:
  - Dokumen sistem desain belum menjelaskan bagaimana badge, progress cue, atau summary state lesson completed ditampilkan di syllabus map, unit detail, lesson page, dan progress area.
  - Pekerjaan ini penting untuk polish dan consistency, tetapi tidak memblokir penguncian kontrak backend lebih awal.
- Expected follow-up:
  - Definisikan affordance visual untuk status `not started`, `reading`, `quiz required`, dan `completed`.
  - Tentukan apakah completion cue tampil sebagai badge, progress marker, atau summary card lintas halaman.
- Resolution note:
  - Figma kini menambahkan `Lesson Completion Cues` mobile/desktop pada section debt yang sama.
  - Status `not started`, `reading`, `quiz required`, dan `completed` sudah divisualisasikan lintas syllabus dan progress, dengan rule bahwa lesson dianggap selesai saat `current_understanding_level >= 1`.

### `TD-005` Vocabulary System Flashcard Seeder And Repo-Native Seed Schema
- Status: `DONE`
- Created at: `2026-06-17`
- Trigger:
  - Vocabulary sudah dikunci tetap hidup sebagai `skill` canonical di syllabus, tetapi learning surface utamanya diarahkan ke system flashcard deck bawaan, bukan ke `lesson.contentBlocks` atau `lesson.postStudyQuestions`.
  - Dokumen `SYL-06A` sudah mengunci relasi `skill -> flashcard item -> flashcard deck`, tetapi repo belum punya seeder khusus yang menurunkan published vocabulary skill menjadi payload deck system yang siap diimport.
  - Repo juga belum punya schema dokumentatif yang mengunci kontrak input-output untuk script seeder vocabulary, sehingga ada risiko implementasi nanti menebak-nebak bentuk artifact, path file, dan aturan validasinya.
- Affected artifacts:
  - [flashcard-deck-mapping.md](./syllabus/flashcards/flashcard-deck-mapping.md)
  - [source-of-truth-and-ingestion-plan.md](./syllabus/ingestion/source-of-truth-and-ingestion-plan.md)
  - [vocabulary-flashcard-seeder-schema.md](./syllabus/flashcards/vocabulary-flashcard-seeder-schema.md)
- Debt summary:
  - Saat ini raw source dan syllabus seed sudah cukup untuk menurunkan item vocabulary atomik, tetapi belum ada jalur resmi dari `content/syllabus/v1/tracks/*.json` ke artifact flashcard seed yang eksplisit dan bisa diaudit.
  - Tanpa kontrak repo-native untuk `decks`, `items`, dan membership ordering, implementasi script berisiko mencampur ownership syllabus dengan katalog flashcard runtime atau menghasilkan slug/id yang tidak stabil.
  - Area ini penting untuk `IMP-07`, tetapi aman dipisahkan sebagai debt dokumentasi + generator planning agar implementasi nanti tinggal mengikuti kontrak yang sudah dikunci.
- Expected follow-up:
  - Tambahkan script `scripts/flashcards/generate_vocabulary_flashcard_seed.py` yang bisa dijalankan langsung untuk membaca syllabus seed published `N5` dan `N4`, lalu menghasilkan artifact flashcard seed vocabulary bawaan sistem.
  - Pastikan script memakai `JMdict` sebagai lexical base yang sudah dinormalisasi ke skill seed, serta `yomitan-jlpt-vocab` hanya sebagai `jlpt signal`, bukan lexical truth baru.
  - Hasilkan payload repo-native yang eksplisit untuk `flashcard_decks`, `flashcard_items`, dan `flashcard_deck_items` vocabulary beserta provenance dan ordering membership yang stabil.
  - Validasi bahwa hanya skill `VOCABULARY` dengan `supportsFlashcards = true` dan `isPublished = true` yang masuk output.
- Resolution note:
  - Repo sekarang memiliki script generator langsung di `scripts/flashcards/generate_vocabulary_flashcard_seed.py`.
  - Artifact utama kini ada di `content/flashcards/system-decks/vocabulary-foundation.json`.
  - Candidate `N5` dari `JMdict + yomitan-jlpt-vocab` yang belum punya mapping lesson resmi kini dicatat terpisah di `content/flashcards/system-decks/vocabulary-foundation-pending-n5-skill-codes.json`.
  - Deck vocabulary system kini di-segment per `10` item, dengan segment terakhir boleh menjadi remainder.

### `TD-006` Vocabulary Flashcard Distractor Diversity And Curated Pool Expansion
- Status: `DONE`
- Created at: `2026-11-20`
- Related tasks: `IMP-07`, `BIL-05`, `VOC-03`; verifikasi rollout mengikuti `BIL-08`/`DEP-05`.
- Trigger:
  - Banyak item vocabulary hasil kurasi memakai `answerOptionPayload.reviewedDistractorPoolItemIds` yang hanya berisi tiga peer: 紙 (paper/kertas), 切手 (postage stamp/prangko), dan 封筒 (envelope/amplop).
  - Engine memilih maksimal tiga distractor dari pool, lalu mengacak opsi final. Bila seluruh tiga kandidat lolos filter, ketiganya selalu tampil; pengacakan hanya mengubah posisi. Pada arah jawaban Jepang/kana, repetisi yang sama muncul sebagai bentuk Jepang/reading peer tersebut.
  - Pembatasan awal mencegah sinonim atau arti tumpang tindih ikut dinilai salah, tetapi membuat jawaban mudah ditebak dari pola opsi dan mengurangi kualitas latihan.
- Affected artifacts:
  - [Kontrak seed vocabulary dan reviewed distractor pools](./syllabus/flashcards/vocabulary-flashcard-seeder-schema.md#reviewed-distractor-pools-voc-03)
  - [Panduan authoring dan pemeriksaan ambiguitas](./syllabus/flashcards/vocabulary-authoring-guide.md)
  - [Artifact vocabulary aktif](../content/flashcards/system-decks/vocabulary-foundation.json) dan [overlay bilingual](../content/flashcards/system-decks/localizations.v2.json)
  - [Planner seed canonical](../src/backend/flashcards/application/services/impl/prepare-flashcard-seed.service.impl.ts), [planner localized](../src/backend/flashcards/application/helpers/flashcard-localized-seed.ts), serta generator/compiler dan validator vocabulary terkait.
  - [Session option builder](../src/backend/flashcards/domain/services/option-snapshot-builder.ts), [aturan engine/ERD](./erd/learning-activity.md), dan [aturan revisi/reseed bilingual](./syllabus/bilingual/bilingual-flashcards-implementation.md).
- Debt summary:
  - Perbaikan harus **memperluas dan memvariasikan pool distractor terkurasi per item**, kemudian memperbarui seed. Mengacak ulang urutan saja tidak menyelesaikan sumber repetisi.
  - Menghapus strict allowlist agar semua item menjadi kandidat global juga belum memadai: normalisasi alias dapat menemukan collision teks, tetapi tidak membuktikan dua arti berbeda secara semantik.
  - Kertas, prangko, dan amplop tetap vocab yang sah serta boleh dipakai bila cocok; ketiganya tidak perlu menjadi distractor tetap lintas item.
- Keputusan pemilik proyek:
  - Tag semantik adalah metadata authoring/kurasi untuk mengusulkan kandidat; tag tidak masuk seed runtime, database, atau API. Tidak diperlukan migration DB untuk tag.
  - Review konten dan validasi harus menutup sinonim serta arti yang tumpang tindih, lalu menghasilkan allowlist eksplisit per item. Runtime mengambil opsi dari bank terkurasi yang sudah di-seed.
  - Tag sama bukan bukti bahwa kandidat aman. Periksa sinonim, sense yang tumpang tindih, homograf, reading yang juga sah, alias dan terjemahan setara untuk setiap pasangan soal yang didukung dalam `en`/`id` serta mode legacy. Simpan alasan pengecualian kandidat ambigu agar tidak terpilih lagi saat regenerasi.
  - Setiap item memerlukan sedikitnya enam distractor unik yang lolos kurasi dan filter per bank item/locale/script. Enam kandidat menyediakan 20 kombinasi atau 120 urutan tiga distractor. Item yang belum cukup kandidat aman ditahan, bukan diisi kandidat ambigu atau fallback global diam-diam.
- Expected follow-up:
  - Audit ukuran pool efektif setelah filter, pemakaian peer lintas item, dan coverage tiap locale/pasangan soal; gunakan hasilnya untuk menentukan prioritas kurasi dan mengukur pengurangan repetisi.
  - Kunci strategi pool dan, bila dipilih, taxonomy tag serta aturan kombinasi tag. Perbarui kontrak seed, panduan authoring, validator, generator/compiler, dan planner yang terdampak sebelum meregenerasi artifact aktif. Pertahankan strict allowlist dan pemeriksaan collision.
  - Simpan tag hanya dalam artifact authoring; validasi dan compiler hanya menulis allowlist existing pada artifact seed runtime.
  - Perbarui seed vocabulary dan paket bilingual dengan pool baru; naikkan `contentRevision` dan `translationRevision`/`sourceRevision` sesuai aturan revisi. Perubahan harus dapat diregenerasi dan ditelusuri ke hasil kurasi, bukan hanya edit manual pada output.
  - Jalankan validasi artifact, seed dry-run dan reseed pada DB uji, lalu verifikasi rollout seed. Pertahankan ID item/deck, membership, progress, key Leitner, custom deck, serta snapshot opsi/jawaban dan retry sesi existing; bank baru berlaku untuk sesi baru.
- Acceptance criteria:
  - Pool efektif tiap item/locale/script yang diperbaiki memiliki minimal enam distractor unik; coverage dan item yang belum lolos review tercatat dalam laporan.
  - Uji dengan sumber acak terkontrol membuktikan item yang sama dapat memperoleh kombinasi distractor berbeda dari pool yang diperluas, bukan hanya urutan berbeda; setiap opsi tetap berasal dari pool yang direview dan memiliki tepat satu jawaban sah.
  - Review konten dan validasi menutup sinonim/arti tumpang tindih, collision lintas script, duplikat, referensi invalid serta konsistensi bahasa; statistik distribusi peer menunjukkan berkurangnya dominasi tiga kandidat lama.
  - Regenerasi/reseed repeatable dengan revisi valid; sesi baru memakai bank baru, sementara grading/retry sesi lama serta histori belajar tetap terjaga. Debt selesai setelah seed yang diperbarui dan verifikasi tersebut tersedia.
- Progress:
  - [Draft dan kontrak TD-006](./syllabus/flashcards/distractor-expansion.md) mencakup 746 item aktif dan usulan enam peer per item. Audit mekanis menemukan enam nilai efektif pada 636 item di katalog published, serta 110 item lain memakai katalog sintetis; ini bukan review semantik.
  - Review sampel menemukan collision 有難う/済みません dan 飴/お菓子 yang tidak tertangkap alias canonical; filter gloss JMdict dan exclusion dua arah ditambahkan. [Manifest preview](../content/flashcards/drafts/distractor-expansion-01/preview/manifest.json) hanya memuat kandidat belum direview dan tidak dapat diimport sebagai seed.
  - Tiga reviewer read-only memeriksa seluruh 746 item/4.476 referensi peer. Sepuluh collision tambahan ditambahkan ke exclusion, 15 pool diregenerasi, dan delta pengganti direview ulang tanpa hold tersisa. [Laporan review](../content/flashcards/drafts/distractor-expansion-01/review.md) dan ledger per item/peer mengikat hash draft final.
  - [Manifest reviewed](../content/flashcards/drafts/distractor-expansion-01/reviewed/manifest.json) berstatus editorial `READY_FOR_INTEGRATION`, membawa dua artifact seed revisi `5/5`, dan kini memiliki `integrationStatus: CANONICAL_SEED_INTEGRATED`.
  - [Validasi database](../content/flashcards/drafts/distractor-expansion-01/database-validation.md) lulus pada MySQL disposable `8.4.13`: 636 item runtime-eligible aktif/mapped direseed dua kali, seluruh bank efektif memiliki minimal enam distractor, kombinasi sesi baru bervariasi, dan ID/ownership/custom deck/Leitner/progress/frozen session/replay tetap terjaga. Guard drift revisi dan rollback gagal secara transactional tanpa partial write.
  - Artifact reviewed telah dipromosikan byte-for-byte ke seed canonical aktif. Hash canonical vocabulary adalah `6ff3689eb435e0e9d96778ce152cac804c711b9fa7209d2055b966507bf7ebc3`; hash overlay adalah `7341ef7527a2c6eac3c41fa10b77c679bc5d0cdac8aed11a99eaf2b22c2c0496`. TD-006 selesai; import database production dan rollout aplikasi tetap menjadi scope BIL-08/DEP-05.
