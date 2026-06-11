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
