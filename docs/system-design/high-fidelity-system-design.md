# KotobaHub High-Fidelity System Design

## Status
- Dokumen ini menyelesaikan task `DS-08`.
- Deliverable task ini terdiri dari dua bagian:
  - source of truth di repo melalui dokumen ini
  - high-fidelity screens pada file Figma KotobaHub yang sama dengan artefak `DS-02`, `DS-03`, dan `DS-06`
- Fokus task ini adalah memfinalisasi arah visual high-fidelity untuk public entry dan flow inti MVP sambil memvalidasi konsistensi antar screen.

## Dependencies
- [task-breakdown.md](../task-breakdown.md)
- [mvp-plan.md](../mvp-plan.md)
- [brand-identity-brief.md](./brand-identity-brief.md)
- [design-direction-board.md](./design-direction-board.md)
- [design-token-foundation.md](./design-token-foundation.md)
- [responsive-layout-rules.md](./responsive-layout-rules.md)
- [information-architecture-and-page-inventory.md](./information-architecture-and-page-inventory.md)
- [low-fidelity-wireframes-core-flows.md](./low-fidelity-wireframes-core-flows.md)
- [shadcn-component-inventory.md](./shadcn-component-inventory.md)
- [login-session-established.md](../sequence-diagram/login-session-established.md)
- [onboarding-personalization.md](../sequence-diagram/onboarding-personalization.md)
- [onboarding-personalization-with-ai-normalization.md](../sequence-diagram/onboarding-personalization-with-ai-normalization.md)
- [flashcard-and-answer-evaluation.md](../sequence-diagram/flashcard-and-answer-evaluation.md)
- [random-question-generator-and-answer-evaluation.md](../sequence-diagram/random-question-generator-and-answer-evaluation.md)
- [update-progress-snapshot.md](../sequence-diagram/update-progress-snapshot.md)
- [practice.md](../api-contract/practice.md)
- [openapi.practice.yaml](../api-contract/openapi.practice.yaml)
- [enum-like-string-reference.md](../enum-like-string-reference.md)

## Figma Reference
- High-fidelity screens ditambahkan ke page `All Features` pada file Figma yang sama:
  - https://www.figma.com/design/iCvRU1So1SOrAl58xFZurg/KotobaHub?node-id=3-2&p=f&t=ddPurcNfdFspetWW-0
- Section baru pada page tersebut bernama `DS-08 High-Fidelity Screens`.
- Jika ada perbedaan antara Figma dan dokumen repo, requirement produk dan perilaku screen tetap mengikuti dokumen di repo.

## Objective
- Mengunci arah visual final sebelum implementasi UI dimulai.
- Memastikan tone `academic but friendly` konsisten dari area public hingga focus mode learning session.
- Memvalidasi bahwa layout, hierarchy, component usage, dan feedback pattern tetap selaras dengan wireframe low-fidelity serta component inventory yang sudah dibuat.

## Screen Inventory In Figma

| Area | Mobile | Desktop |
| --- | --- | --- |
| Public landing | `HF Landing Mobile` | `HF Landing Desktop` |
| Login | `HF Login Mobile` | `HF Login Desktop` |
| Onboarding | `HF Onboarding Mobile` | `HF Onboarding Desktop` |
| Syllabus map | `HF Syllabus Mobile` | `HF Syllabus Desktop` |
| Lesson overview | `HF Lesson Overview Mobile` | `HF Lesson Overview Desktop` |
| Lesson post-study quiz | `HF Lesson Post-Study Quiz Mobile` | `HF Lesson Post-Study Quiz Desktop` |
| Flashcards | `HF Flashcards Mobile` | `HF Flashcards Desktop` |
| Practice `SHORT_FREE_RESPONSE` | `HF Practice Short Free Mobile` | `HF Practice Short Free Desktop` |
| Practice `SLOT_FILL` | `HF Practice Slot Fill Mobile` | `HF Practice Slot Fill Desktop` |
| Practice `ARRANGE_TOKEN` | `HF Practice Arrange Token Mobile` | `HF Practice Arrange Token Desktop` |
| Practice `FREE_RESPONSE` | `HF Practice Free Response Mobile` | `HF Practice Free Response Desktop` |
| Lesson completion cues | `HF Lesson Completion Mobile` | `HF Lesson Completion Desktop` |
| Progress | `HF Progress Mobile` | `HF Progress Desktop` |

## High-Fidelity Direction Locked

### 1. Visual Tone
- Area public memakai atmosfer yang sedikit lebih ekspresif, tetapi tetap ditahan oleh `Seifuku Navy` sebagai anchor utama.
- Area aplikasi tetap terang, rapi, dan instructional, dengan `Coral Energy` dipakai hemat untuk CTA, progress emphasis, dan focus moments.
- Panel, card, dan shell utama mempertahankan rasa `study planner` atau `digital workbook`, bukan dashboard enterprise dan bukan app gamified yang ramai.

### 2. Typography
- `Plus Jakarta Sans` menjadi font UI dominan untuk heading, body, dan control label.
- `Noto Sans JP` dipakai untuk text Jepang yang menjadi bagian materi belajar agar prompt, sentence pattern, dan kanji state terasa natural.
- Hierarchy heading mengikuti token `display`, `h1`, `h2`, dan `h3` dari [design-token-foundation.md](./design-token-foundation.md), dengan landing memakai skala paling besar dan screen aplikasi tetap lebih padat-terkendali.

### 3. Surface And Color Use
- `brand.primary` dipakai untuk public hero, sidebar desktop, focus rail, dan CTA primer dengan intensitas tinggi.
- `brand.secondary` dipakai untuk supporting emphasis seperti info pills, progress support, dan metadata context.
- `brand.accent` dipakai untuk progress fill, CTA momentum, active session emphasis, dan focus moments.
- Semantic surfaces dipakai konsisten:
  - `success-bg` untuk correct answer, mastery up, dan progress confirmation
  - `warning-bg` untuk weak skill, due review, dan challenge band
  - `info-bg` untuk context, payload hint, dan non-critical support metadata

## Consistency Validation

### Public To App Transition
- Landing dan login tetap terasa satu keluarga visual dengan app shell melalui palet, radius, dan typography yang sama.
- Perbedaan utamanya ada pada density dan atmosfer:
  - public screens lebih terbuka dan naratif
  - app screens lebih terstruktur dan task-oriented

### Shell Behavior
- Mobile app screens mempertahankan topbar + bottom nav untuk area reguler.
- Desktop app screens mempertahankan sidebar kiri + contextual topbar untuk `Syllabus` dan `Progress`.
- `Flashcards` dan `Practice` tetap memakai focus-mode shell yang lebih tenang dibanding area browsing.

### Component Language
- Screen hi-fi mengikuti inventory pada [shadcn-component-inventory.md](./shadcn-component-inventory.md), terutama untuk:
  - `ActionCard`
  - `MetricCard`
  - `StatusPill`
  - `FocusModeShell`
  - `FlashcardFeedbackPanel`
  - `PracticeGradingPanel`
  - `WeakSkillActionPanel`
- Tidak ada screen yang mengandalkan styling generic `shadcn` tanpa adaptasi token KotobaHub.

## Flow Notes

### Landing
- Hero memakai mood lebih atmosferik untuk membedakan area public dari area belajar inti.
- Preview panel di landing sengaja menampilkan rasa `study workspace` agar value proposition langsung terhubung ke loop harian produk.

### Login
- Login tetap simple dan terpusat sesuai responsive rule untuk auth surface.
- CTA `Continue with Google` menjadi fokus tunggal, dengan supporting context yang menjelaskan flow `session established -> onboarding check -> app ready`.

### Onboarding
- Stepper, form, dan preview draft profile divalidasi kembali agar tetap terasa guided, bukan seperti form admin.
- Draft profile preview secara visual menegaskan bahwa suggestion AI masih editable dan belum menjadi source of truth final.

### Syllabus
- High-fidelity tetap mempertahankan `structured learning path`, bukan card feed.
- Support panel desktop dipakai untuk selected unit context, weak skill signal, dan entry action ke lesson atau activity.
- Syllabus hi-fi kini juga perlu menunjukkan vocabulary state lesson yang konsisten:
  - `not started`
  - `reading`
  - `quiz required`
  - `completed`

### Lesson Overview And Post-Study Quiz
- Lesson overview hi-fi menampilkan `contentBlocks` sebagai reading surface utama, bukan sekadar CTA wrapper menuju activity.
- CTA `post-study quiz` harus terlihat sebagai langkah wajib setelah reading selesai, dengan cue difficulty target dari bank `1-10`.
- Screen post-study quiz harus menegaskan bahwa flow ini adalah direct lesson quiz, bukan `practice_session`.
- State hasil benar perlu menunjukkan:
  - understanding delta, misalnya `0 -> 1`
  - completion confirmation saat level menjadi `>= 1`
  - optional review ladder hingga `10`

### Flashcards
- High-fidelity mempertahankan keputusan UX bahwa `questionScriptMode` dan `answerScriptMode` dikunci sebelum session aktif.
- Feedback tetap inline dekat answer options.
- Desktop side rail dipakai untuk metadata ringan dan kanji detail, bukan chrome distraktif.

### Practice
- High-fidelity practice mengikuti kontrak `practice` terbaru, dengan `SHORT_FREE_RESPONSE` sebagai fallback default random practice session.
- Screen hi-fi pada Figma mencakup seluruh `questionType` practice MVP saat ini:
  - `SHORT_FREE_RESPONSE`
  - `SLOT_FILL`
  - `ARRANGE_TOKEN`
  - `FREE_RESPONSE`
- Keempat varian ini mengikuti kontrak `practice` yang sudah dikunci di [practice.md](../api-contract/practice.md), [openapi.practice.yaml](../api-contract/openapi.practice.yaml), dan [enum-like-string-reference.md](../enum-like-string-reference.md).
- Catatan alignment:
  - `DS-06` sekarang ikut memvisualisasikan empat `questionType` practice yang sedang aktif pada kontrak MVP
  - `DS-08` menerjemahkan struktur yang sama ke visual final dengan treatment grading deterministic vs AI yang berbeda
  - lesson `post-study quiz` tetap berada di jalur terpisah dan tidak memakai screen `practice_session`

### Progress
- Progress dashboard tetap instructional dan action-oriented.
- Grafik, summary metric, dan weak-skill CTA dibatasi agar tidak berubah menjadi analytics-heavy admin panel.
- Progress hi-fi perlu menampilkan completion cue lesson yang sejalan dengan syllabus, termasuk jumlah lesson `completed`, `quiz required`, dan understanding ladder yang paling relevan.

## Implementation Handoff

### For `IMP-11`
- Gunakan screen hi-fi ini untuk implementasi visual app shell final:
  - public header
  - sidebar
  - topbar
  - mobile bottom nav
  - focus rail

### For `IMP-12` To `IMP-16`
- `IMP-12` mengikuti login dan onboarding hi-fi sebagai baseline auth + wizard UI.
- `IMP-13` mengikuti syllabus hi-fi untuk lane structure, support panel, dan CTA rhythm.
- `IMP-13` juga mengikuti lesson overview dan lesson post-study quiz hi-fi untuk surface baca, CTA quiz wajib, dan completion confirmation state.
- `IMP-14` mengikuti flashcard hi-fi terutama pada setup state, locked script pair, active card, dan inline feedback.
- `IMP-15` mengikuti practice hi-fi dengan `SHORT_FREE_RESPONSE` sebagai fallback default, lalu tetap mendukung `SLOT_FILL`, `ARRANGE_TOKEN`, dan `FREE_RESPONSE` sesuai `questionType` yang dikirim backend.
- `IMP-16` mengikuti progress hi-fi untuk metric hierarchy, chart container, weak-skill action pattern, dan lesson completion state summary.

## Documentation Note
- `DS-06` dan `DS-08` sekarang sama-sama merepresentasikan empat `questionType` practice yang aktif pada kontrak MVP.
- `TD-001` dan `TD-002` kini divisualisasikan pada section Figma `Codex / TD-001 TD-002 Hi-Fi`.
