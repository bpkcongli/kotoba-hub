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
| Flashcards | `HF Flashcards Mobile` | `HF Flashcards Desktop` |
| Practice `SLOT_FILL` | `HF Practice Slot Fill Mobile` | `HF Practice Slot Fill Desktop` |
| Practice `SHORT_FREE_RESPONSE` | `HF Practice Short Free Mobile` | `HF Practice Short Free Desktop` |
| Practice `ARRANGE_TOKEN` | `HF Practice Arrange Token Mobile` | `HF Practice Arrange Token Desktop` |
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

### Flashcards
- High-fidelity mempertahankan keputusan UX bahwa `questionScriptMode` dan `answerScriptMode` dikunci sebelum session aktif.
- Feedback tetap inline dekat answer options.
- Desktop side rail dipakai untuk metadata ringan dan kanji detail, bukan chrome distraktif.

### Practice
- Varian utama yang tetap dianggap baseline dari low-fidelity adalah `SLOT_FILL`.
- Atas permintaan task ini, high-fidelity juga menambahkan eksplorasi visual untuk:
  - `SHORT_FREE_RESPONSE`
  - `ARRANGE_TOKEN`
- Ketiga varian ini mengikuti kontrak `practice` yang sudah dikunci di [practice.md](../api-contract/practice.md), [openapi.practice.yaml](../api-contract/openapi.practice.yaml), dan [enum-like-string-reference.md](../enum-like-string-reference.md).
- Catatan alignment:
  - `DS-06` tetap benar sebagai baseline low-fidelity MVP yang fokus ke `SLOT_FILL`
  - `DS-08` memperluas hi-fi practice sebagai validasi visual tambahan berdasarkan kontrak API terbaru
  - perluasan ini tidak membatalkan posisi `SLOT_FILL` sebagai default varian practice yang paling matang di wireframe awal

### Progress
- Progress dashboard tetap instructional dan action-oriented.
- Grafik, summary metric, dan weak-skill CTA dibatasi agar tidak berubah menjadi analytics-heavy admin panel.

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
- `IMP-14` mengikuti flashcard hi-fi terutama pada setup state, locked script pair, active card, dan inline feedback.
- `IMP-15` mengikuti practice hi-fi dengan `SLOT_FILL` sebagai baseline utama, lalu mempertimbangkan dua varian tambahan bila implementasi practice scope memang mencakupnya.
- `IMP-16` mengikuti progress hi-fi untuk metric hierarchy, chart container, dan weak-skill action pattern.

## Documentation Note
- Jika nanti `DS-06` ingin ikut mencerminkan seluruh practice question type yang sekarang sudah muncul pada kontrak API, wireframe low-fidelity practice dapat diperluas di task dokumentasi lanjutan.
- Untuk saat ini, `DS-06` tetap diperlakukan sebagai baseline struktur awal, sementara `DS-08` sudah memvalidasi arah visual untuk tiga question type practice yang paling relevan dengan kontrak MVP.
