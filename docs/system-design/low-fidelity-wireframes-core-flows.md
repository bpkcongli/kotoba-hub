# KotobaHub Low-Fidelity Wireframes For Core Flows

## Status
- Dokumen ini menyelesaikan task `DS-06`.
- Deliverable task ini terdiri dari dua bagian:
  - source of truth wireframe scope di repo melalui dokumen ini
  - low-fidelity wireframe pada Figma page `All Features`
- Fokus task ini adalah struktur layar, hierarchy, dan responsive behavior untuk flow inti MVP, bukan visual high-fidelity final.

## Dependencies
- [task-breakdown.md](../task-breakdown.md)
- [mvp-plan.md](../mvp-plan.md)
- [architecture-foundation.md](../architecture-foundation.md)
- [design-token-foundation.md](./design-token-foundation.md)
- [responsive-layout-rules.md](./responsive-layout-rules.md)
- [information-architecture-and-page-inventory.md](./information-architecture-and-page-inventory.md)
- [onboarding-personalization.md](../sequence-diagram/onboarding-personalization.md)
- [onboarding-personalization-with-ai-normalization.md](../sequence-diagram/onboarding-personalization-with-ai-normalization.md)
- [flashcard-and-answer-evaluation.md](../sequence-diagram/flashcard-and-answer-evaluation.md)
- [random-question-generator-and-answer-evaluation.md](../sequence-diagram/random-question-generator-and-answer-evaluation.md)
- [update-progress-snapshot.md](../sequence-diagram/update-progress-snapshot.md)

## Figma Reference
- Low-fidelity wireframe ditulis pada page `All Features` di file Figma yang sama dengan artefak `DS-02` dan `DS-03`:
  - https://www.figma.com/design/iCvRU1So1SOrAl58xFZurg/KotobaHub?node-id=3-2&p=f&t=ddPurcNfdFspetWW-0
- Jika ada perbedaan antara kanvas Figma dan dokumen ini, dokumen repo tetap menjadi baseline requirement untuk struktur flow dan cakupan layar.

## Objective
- Menurunkan IA, responsive rules, dan sequence diagram menjadi wireframe yang cukup jelas untuk:
  - memvalidasi urutan layar inti
  - memvalidasi area konten prioritas di mobile dan desktop
  - menjadi jembatan menuju `DS-07` component inventory dan `DS-08` high-fidelity system design

## Low-Fidelity Principles
- Wireframe tetap low-fidelity: gunakan block layout, label struktur, placeholder copy singkat, dan emphasis seperlunya.
- Gunakan hierarchy layout dan shell sesuai aturan responsive, tetapi jangan mengunci treatment visual akhir seperti ilustrasi, color styling detail, atau polish brand-heavy.
- Mobile selalu menjadi baseline untuk flow inti; desktop adalah adaptasi yang memanfaatkan ruang ekstra tanpa mengubah tujuan utama screen.
- `Flashcards` dan `Practice` harus terlihat sebagai focus-mode screen, dengan chrome lebih tenang dibanding dashboard atau syllabus.
- `Onboarding` harus terlihat seperti guided wizard terpisah dari app shell utama.

## Screen Inventory

| Flow | Mobile Variant | Desktop Variant | Primary Goal |
| --- | --- | --- | --- |
| Onboarding | `M1` | `D1` | mengumpulkan assessment terstruktur dan mengonfirmasi draft personalization |
| Syllabus Map | `M2` | `D2` | menunjukkan `track -> unit -> lesson` dengan progress context dan next learning path |
| Lesson Overview | `M2 Lesson Overview` | `D2 Lesson Overview` | memodelkan surface baca lesson berisi `contentBlocks` berurutan sebelum learner lanjut ke quiz wajib |
| Lesson Post-Study Quiz | `M2 Lesson Post-Study Quiz` | `D2 Lesson Post-Study Quiz` | memodelkan direct quiz deterministik `1` soal dan delta pemahaman `0-10` tanpa `practice_session` |
| Flashcard Session | `M3` | `D3` | menyiapkan script pair sebelum start lalu menjalankan loop flashcard multiple-choice dengan feedback cepat |
| Practice Session | `M4 Practice Short Free`, `M4 Practice Slot Fill`, `M4 Practice Arrange Token`, `M4 Practice Free Response` | `D4 Practice Short Free`, `D4 Practice Slot Fill`, `D4 Practice Arrange Token`, `D4 Practice Free Response` | menjalankan loop question-answer-feedback dengan progres sesi yang mudah dipantau untuk seluruh `questionType` practice MVP saat ini |
| Lesson Completion Cues | `M5 Lesson Completion Cues` | `D5 Lesson Completion Cues` | memvalidasi status `not started`, `reading`, `quiz required`, dan `completed` lintas syllabus dan progress |
| Progress Dashboard | `M5` | `D5` | memperlihatkan overview mastery, tren, weak-skill follow-up, dan ringkasan status completion lesson |

## Flow Notes

### 1. Onboarding
- Shell khusus onboarding tanpa sidebar atau bottom nav.
- Mobile memakai single-column wizard dengan urutan:
  - stepper
  - current assessment form
  - optional free-text note
  - CTA lanjut
- Desktop memakai dua zona:
  - kolom utama untuk form dan review draft
  - kolom pendamping untuk helper summary, recommendation preview, atau confirmation notes
- Wireframe harus menangkap dua state penting:
  - input assessment
  - review draft personalization sebelum confirm

### 2. Syllabus Map
- Mobile menampilkan track summary, continue-learning card, lalu unit stack vertikal dengan lesson preview ringkas.
- Desktop memakai layout `main map + support panel`.
- Support panel dipakai untuk progress snapshot, selected unit summary, dan CTA menuju lesson/activity.
- Peta syllabus harus terasa seperti structured learning path, bukan content feed.
- Syllabus map dan unit-level lesson list perlu menampilkan cue status lesson yang konsisten:
  - `not started`
  - `reading`
  - `quiz required`
  - `completed`

### 2A. Lesson Overview And Post-Study Quiz
- Lesson overview harus menunjukkan `contentBlocks` sebagai surface baca utama dengan urutan yang jelas sebelum CTA quiz muncul sebagai langkah lanjut wajib.
- Wireframe lesson overview perlu menampilkan:
  - heading lesson dan metadata durasi
  - paragraph/content block berurutan
  - covered skill context
  - cue `currentUnderstandingLevel`
  - CTA `Start post-study quiz`
- Wireframe post-study quiz perlu menampilkan:
  - direct one-question flow yang terpisah dari `practice_session`
  - cue `targetDifficultyLevel = currentUnderstandingLevel + 1`
  - state hasil benar/salah
  - delta pemahaman dan completion confirmation ketika level naik dari `0` ke `1`

### 3. Flashcard Session
- Wireframe flashcard harus menangkap dua state yang berbeda:
  - pre-session setup: deck summary, `questionScriptMode`, `answerScriptMode`, dan CTA `Start Session`
  - active session: satu card utama, progress indicator, dan answer options multiple-choice
- Pemilihan script mode dilakukan sebelum session dimulai. Selama session aktif tidak ada toggle mode inline; jika learner ingin mode lain, wireframe sediakan jalur `end/restart session`.
- Mobile menampilkan slim top bar, card canvas dominan, answer options stacked, feedback inline, dan action row sticky bila diperlukan.
- Desktop tetap single-focus, tetapi ruang samping boleh dipakai untuk metadata ringan seperti deck info, selected script pair, streak, atau session summary kecil.
- Feedback harus berada dekat area jawaban agar sesuai dengan flow `answer -> evaluation -> immediate feedback`.
- Untuk item kanji, feedback state perlu punya ruang untuk panel detail: kanji, English meaning, onyomi, kunyomi, dan contoh kata.
- Untuk item kana, feedback state cukup lebih ringkas: correct answer, bucket change, dan progress write-through confirmation.

### 4. Practice Session
- Struktur mirip focus mode flashcards, tetapi fallback default random practice tetap `questionType = SHORT_FREE_RESPONSE` sesuai kontrak `practice` terbaru.
- Wireframe practice pada Figma sekarang mencakup empat varian:
  - `SHORT_FREE_RESPONSE`
  - `SLOT_FILL`
  - `ARRANGE_TOKEN`
  - `FREE_RESPONSE`
- Mobile menumpuk prompt, area jawaban, dan feedback dalam satu sumbu utama untuk setiap varian, dengan perubahan hanya pada bentuk input.
- Desktop boleh menambah side rail untuk timer, question index, atau quick session summary, tetapi tidak menjadi layout tiga kolom.
- `SHORT_FREE_RESPONSE` perlu menampilkan text input bebas singkat dengan cue transform romaji ke kana pada state utama practice.
- `SLOT_FILL` perlu menampilkan tepat empat opsi jawaban berbahasa Jepang.
- `ARRANGE_TOKEN` perlu menampilkan source sentence, answer lane, dan token bank yang disusun ulang user.
- `FREE_RESPONSE` perlu menampilkan prompt kalimat English penuh, textarea jawaban bahasa Jepang, dan cue bahwa grading default berasal dari AI.
- Seluruh varian tetap merepresentasikan alur yang sama: `generate session -> render question -> submit answer -> grading -> continue`.

### 5. Progress Dashboard
- Mobile menyusun:
  - overview hero
  - mastery summary
  - lesson completion summary
  - weak skills / review due
  - recent timeline
- Desktop memakai pola `hero metrics + analytics section dua kolom`.
- Halaman ini harus terasa instructional, bukan analytics-heavy dashboard enterprise.
- CTA ke `Syllabus`, `Flashcards`, atau `Practice` harus muncul sebagai next-step guidance, bukan menu tambahan acak.
- Progress dan syllabus perlu memakai vocabulary state lesson yang sama:
  - `not started`
  - `reading`
  - `quiz required`
  - `completed`

## Responsive Translation Rules Applied
- `0-1023px`: top bar + bottom nav untuk area aplikasi reguler; shell onboarding terpisah; focus mode boleh menyembunyikan bottom nav saat sesi aktif.
- `1024px+`: sidebar kiri + topbar untuk `Syllabus` dan `Progress`; varian session desktop boleh memakai shell lebih tenang atau sidebar collapsed.
- Container mengikuti baseline:
  - onboarding max width `720px`
  - app content max width `1280px`
  - learning session canvas max width `960px`
- Untuk flashcard setup state, mode selector boleh muncul sebagai inline form card di desktop dan bottom sheet / stacked setup card di mobile sebelum masuk ke active session canvas.

## Frame Naming Convention In Figma
- `M1 Onboarding`
- `M2 Syllabus Map`
- `M2 Lesson Overview`
- `M2 Lesson Post-Study Quiz`
- `M3 Flashcard Session`
- `M4 Practice Short Free`
- `M4 Practice Slot Fill`
- `M4 Practice Arrange Token`
- `M4 Practice Free Response`
- `M5 Lesson Completion Cues`
- `M5 Progress Dashboard`
- `D1 Onboarding`
- `D2 Syllabus Map`
- `D2 Lesson Overview`
- `D2 Lesson Post-Study Quiz`
- `D3 Flashcard Session`
- `D4 Practice Short Free`
- `D4 Practice Slot Fill`
- `D4 Practice Arrange Token`
- `D4 Practice Free Response`
- `D5 Lesson Completion Cues`
- `D5 Progress Dashboard`

## Handoff To Next Tasks
- `DS-07` harus memakai wireframe ini untuk mengidentifikasi komponen `shadcn` yang cukup di-theme dan area yang butuh custom patterns.
- `DS-08` harus mempertahankan hierarchy, shell behavior, dan responsive intent dari wireframe ini saat masuk ke high-fidelity design.
- `IMP-11` sampai `IMP-16` harus menjaga kesesuaian screen purpose, focus mode, dan navigation behavior yang sudah divalidasi di task ini.
- `IMP-13` perlu memperlakukan lesson overview sebagai pre-activity study surface dan post-study quiz sebagai langkah wajib untuk mengubah status completion lesson.
- `IMP-15` harus memperlakukan `SHORT_FREE_RESPONSE` sebagai fallback default practice session, sambil tetap menyiapkan surface untuk `SLOT_FILL`, `ARRANGE_TOKEN`, dan `FREE_RESPONSE` bila scope implementasi practice aktif memakainya.
- Khusus `Flashcard Session`, implementasi UI perlu mempertahankan keputusan UX bahwa script pair dikonfirmasi sebelum session dimulai dan tidak diubah saat session aktif.

## Tech Debt Note
- `TD-001` dan `TD-002` kini divisualisasikan pada section Figma `Codex / TD-001 TD-002 Low-Fi`.
