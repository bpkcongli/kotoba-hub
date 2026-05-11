# KotobaHub Shadcn-Based Component Inventory

## Status
- Dokumen ini menyelesaikan task `DS-07`.
- Dokumen ini mendefinisikan inventaris komponen berbasis `shadcn/ui` yang dipakai sebagai fondasi implementasi UI `KotobaHub`.
- Fokus dokumen ini adalah menentukan:
  - komponen `shadcn` yang cukup di-theme ringan
  - komponen `shadcn` yang perlu wrapper atau variant khusus
  - pola komposit KotobaHub yang harus dibuat custom di atas primitive `shadcn`

## Dependencies
- [task-breakdown.md](../task-breakdown.md)
- [mvp-plan.md](../mvp-plan.md)
- [architecture-foundation.md](../architecture-foundation.md)
- [brand-identity-brief.md](./brand-identity-brief.md)
- [design-direction-board.md](./design-direction-board.md)
- [design-token-foundation.md](./design-token-foundation.md)
- [responsive-layout-rules.md](./responsive-layout-rules.md)
- [information-architecture-and-page-inventory.md](./information-architecture-and-page-inventory.md)
- [low-fidelity-wireframes-core-flows.md](./low-fidelity-wireframes-core-flows.md)
- [onboarding-personalization.md](../sequence-diagram/onboarding-personalization.md)
- [onboarding-personalization-with-ai-normalization.md](../sequence-diagram/onboarding-personalization-with-ai-normalization.md)
- [flashcard-and-answer-evaluation.md](../sequence-diagram/flashcard-and-answer-evaluation.md)
- [random-question-generator-and-answer-evaluation.md](../sequence-diagram/random-question-generator-and-answer-evaluation.md)
- [update-progress-snapshot.md](../sequence-diagram/update-progress-snapshot.md)

## Figma Reference
- Low-fidelity wireframe untuk flow inti ada di page `All Features` pada file Figma yang sama:
  - https://www.figma.com/design/iCvRU1So1SOrAl58xFZurg/KotobaHub?node-id=3-2&p=f&t=ddPurcNfdFspetWW-0
- Figma dipakai sebagai referensi visual pendamping. Jika ada mismatch, dokumen repo tetap menjadi source of truth untuk scope, state, dan prioritas komponen.

## Objective
- Menjembatani `DS-06` wireframe ke implementasi `IMP-11` sampai `IMP-16`.
- Menetapkan batas yang jelas antara `UI primitive`, `shared composition`, dan `feature-specific component`.
- Mengurangi risiko implementasi UI terlalu generik sehingga bertentangan dengan tone `academic but friendly` dan focus mode yang sudah dikunci.

## Adoption Strategy
- `shadcn/ui` dipakai sebagai baseline untuk accessibility, keyboard support, dan primitive structure.
- KotobaHub tidak boleh berhenti pada styling default `shadcn`; token warna, typografi, spacing, radius, focus ring, dan hierarchy wajib diturunkan dari [design-token-foundation.md](./design-token-foundation.md).
- Wrapper internal lebih diprioritaskan daripada memodifikasi source component `shadcn` secara agresif.
- Komponen yang mengandung semantic bisnis seperti `script pair lock`, `mastery delta`, `weak skill action`, atau `focus-mode session feedback` harus diperlakukan sebagai komponen KotobaHub, bukan sebagai variasi kosmetik biasa.

## Component Tiers

### Tier A: Theme-Only Shadcn Primitives
- Komponen pada tier ini cukup mengandalkan primitive `shadcn` dengan theme dan variant ringan.
- Ownership tetap di `src/frontend/shared/components`.

| Component | Shadcn Base | KotobaHub Customization | Primary Usage |
| --- | --- | --- | --- |
| `Button` | `button` | variant `primary`, `secondary`, `accent`, `ghost`, `quiet`, `danger`; height minimum `44px`; focus ring token wajib aktif | CTA utama, session action, secondary action |
| `Card` | `card` | surface, border, radius, dan shadow mengikuti token; hindari card-grid generik yang terlalu dashboard-like | panel onboarding, progress summary, unit lane |
| `Badge` | `badge` | variant `skill`, `track`, `progress`, `warning`, `success`, `info` | weak skill pills, level tag, streak pill, state tag |
| `Input` | `input` | default density lebih lega; text color dan placeholder pakai token | onboarding form, settings, practice short answer |
| `Textarea` | `textarea` | dipakai untuk optional onboarding note dan free-response practice | AI note, long-form answer |
| `Label` | `label` | type token `type.label`, text token `text.secondary` | field label, helper caption |
| `Select` | `select` | menu surface, active row, dan trigger height harus konsisten dengan form rhythm | current level, target JLPT, daily goal, preferred script |
| `Separator` | `separator` | border token lembut, tidak terlalu kontras | sidebar grouping, section split, panel partition |
| `Progress` | `progress` | bar track dan fill perlu style brand-aware; jangan terasa seperti system default | session progress, weekly progress, unit completion |
| `Skeleton` | `skeleton` | shape mengikuti card/panel final; gunakan shimmer ringan | loading dashboard, syllabus, session setup |
| `Avatar` | `avatar` | simple, secondary role; bukan hero visual | profile affordance di topbar/settings |
| `Tooltip` | `tooltip` | dipakai hemat untuk explainers singkat | mastery hint, script mode hint, icon affordance |

### Tier B: Shadcn Primitives With Strong KotobaHub Wrappers
- Primitive dasarnya tetap `shadcn`, tetapi implementasi langsung tidak cukup karena membutuhkan pola layout atau state yang konsisten lintas screen.
- Wrapper tetap berada di shared layer, namun boleh punya prop API yang lebih dekat ke use case produk.

| Wrapper | Shadcn Base | Custom Need | Primary Usage |
| --- | --- | --- | --- |
| `AppSelectField` | `select`, `label`, `form` | pairing label, helper, error, dan description yang konsisten | onboarding dan settings form |
| `AppTextField` | `input`, `textarea`, `form` | error, hint, counter, optional badge | onboarding note, practice answer |
| `StatusPill` | `badge` | status semantic + icon slot opsional | `62% done`, `Weak skill`, `Score 80`, `7 day streak` |
| `MetricCard` | `card` | metric number, sublabel, optional delta, optional CTA | dashboard/progress summary |
| `ActionCard` | `card`, `button` | CTA-forward panel yang terasa seperti study guidance | continue learning, recommended next step |
| `InlineNotice` | `alert` atau `card` | success/warning/error/info tone yang lebih tenang dari banner generik | onboarding review note, progress confirmation |
| `TopbarActionMenu` | `dropdown-menu` | profile menu, sign out, low-frequency actions | topbar mobile/desktop |
| `BottomSheet` | `drawer` atau `sheet` | mobile secondary action container | deck picker, track picker, filter panel |
| `DesktopPopoverMenu` | `popover` atau `dropdown-menu` | desktop quick actions dan compact detail | profile quick menu, small stat detail |
| `ContentTabs` | `tabs` | section switch yang lebih instructional daripada tab default | future progress/detail split, optional lesson subviews |
| `CollapsibleSection` | `accordion` atau `collapsible` | unit stack atau expandable metadata dengan rhythm tenang | syllabus unit preview, settings group |
| `DataTableShell` | `table` | border density ringan dan emphasis instructional | unit mastery table desktop |
| `ChartPanel` | `card`, `chart` | visual tone harus seperti learning summary, bukan analytics-heavy dashboard | mastery trend, grouped mastery summary |

### Tier C: KotobaHub Custom Compositions
- Tier ini adalah komponen domain atau layout pattern yang harus dirakit khusus di atas primitive `shadcn`.
- Ownership utamanya mengikuti folder fitur di [architecture-foundation.md](../architecture-foundation.md).

## Shared Layout Inventory

| Component | Base Building Blocks | Why Custom | Source Screens |
| --- | --- | --- | --- |
| `PublicHeader` | `button`, `badge`, `separator` | header public harus tipis dan brand-forward, tidak sama dengan app shell | landing, login |
| `AppSidebar` | `button`, `separator`, `badge`, `avatar` | state aktif, low-frequency settings zone, dan tone study workspace perlu layout khusus | `D2`, `D5` |
| `MobileBottomNav` | `button`, `badge` | butuh active indicator + label penuh untuk lima destination utama | `M2`, `M5` |
| `ContextTopbar` | `button`, `badge`, `dropdown-menu` | page title, streak, profile menu, dan contextual action perlu hierarchy konsisten | syllabus, progress, dashboard |
| `FocusModeShell` | `button`, `progress`, `separator` | flashcards dan practice butuh chrome yang lebih tenang dan jalur keluar yang jelas | `M3`, `D3`, `M4`, `D4` |
| `EmptyStatePanel` | `card`, `button`, `badge` | copy dan CTA harus terasa seperti study guidance, bukan generic empty container | no due cards, empty progress, no weak skills |
| `ErrorStatePanel` | `alert`, `button` | error harus ringkas dan actionable tanpa merusak focus mode | failed fetch, failed grading, retry state |
| `LoadingPanel` | `skeleton`, `card`, `progress` | layout loading perlu meniru shape layar final agar transisi terasa stabil | all app routes |

## Onboarding Inventory

| Component | Base Building Blocks | Custom Need | Source Screens |
| --- | --- | --- | --- |
| `OnboardingStepper` | `progress`, `badge`, `separator` | stepper butuh state current/complete/upcoming yang lebih jelas daripada progress bar biasa | `M1`, `D1` |
| `OnboardingAssessmentForm` | `form`, `select`, `input`, `textarea`, `label` | form perlu grouping field, helper text, dan pacing wizard yang tenang | `M1`, `D1` |
| `WeakSkillMultiSelect` | `toggle-group` atau `checkbox`, `badge` | chip selection harus terasa ringan dan scan-friendly | `M1`, `D1` |
| `DraftProfilePreview` | `card`, `badge`, `separator`, `button` | preview hasil normalisasi AI harus terlihat seperti draft yang masih bisa dikonfirmasi atau diubah | `D1`, onboarding review state |
| `RecommendationPreviewPanel` | `card`, `badge` | memuat next lesson hint dan rationale singkat dari personalization | `D1` |
| `OnboardingWizardFooter` | `button`, `inline notice` | CTA area perlu konsisten antara continue, back, confirm, dan validation message | `M1`, `D1` |

### Onboarding Notes
- `DraftProfilePreview` tidak cukup memakai `Card` biasa karena harus merepresentasikan prinsip bahwa hasil AI bukan source of truth final sebelum user konfirmasi.
- `WeakSkillMultiSelect` sebaiknya tidak tampil seperti checkbox list tradisional; gunakan chip/pill selection agar sesuai wireframe.

## Syllabus Inventory

| Component | Base Building Blocks | Custom Need | Source Screens |
| --- | --- | --- | --- |
| `TrackSwitcher` | `select` di mobile, `tabs` atau segmented wrapper di desktop | perilaku beda breakpoint tetapi semantic tetap sama | `M2`, `D2` |
| `ContinueLearningCard` | `action-card`, `progress`, `button`, `badge` | harus menonjolkan next step tanpa terasa seperti promo banner | `M2`, `D2` |
| `UnitLaneCard` | `card`, `progress`, `badge`, `button` | unit lane memuat title, progress, lesson summary, dan CTA dalam ritme planner | `M2`, `D2` |
| `LessonPreviewStack` | `collapsible`, `badge`, `button` | daftar lesson dan status perlu tetap ringkas di mobile | `M2`, future unit detail |
| `SelectedUnitSupportPanel` | `card`, `badge`, `button`, `separator` | support panel desktop menggabungkan progress context, weak skill, dan entry activity | `D2` |
| `SkillTagGroup` | `badge` | perlu taxonomy visual yang konsisten untuk skill, weak area, dan status | syllabus, onboarding, progress |

### Syllabus Notes
- `UnitLaneCard` adalah pattern inti KotobaHub dan kemungkinan dipakai kembali di dashboard recommendation lane.
- `TrackSwitcher` tidak boleh memaksa pattern yang sama di semua breakpoint; mobile lebih cocok `Select`, desktop bisa lebih eksplisit.

## Flashcards Inventory

| Component | Base Building Blocks | Custom Need | Source Screens |
| --- | --- | --- | --- |
| `FlashcardSetupPanel` | `card`, `form`, `select`, `button`, `badge` | pre-session setup harus mengunci `questionScriptMode` dan `answerScriptMode` sebelum sesi mulai | `M3`, `D3` |
| `ScriptPairSelector` | `toggle-group` atau custom segmented wrapper | pilihan script pair perlu sangat jelas dan terlihat locked setelah start | `M3`, `D3` |
| `FlashcardCanvas` | `card`, `badge`, `progress` | card utama harus bisa menampung prompt kana/kanji dengan hierarchy yang berbeda | `M3`, `D3` |
| `AnswerOptionGrid` | `button`, `card` | multiple-choice harus punya target tap besar, state selected, correct, incorrect, disabled | `M3`, `D3` |
| `FlashcardFeedbackPanel` | `inline notice`, `card`, `badge`, `button` | feedback muncul inline dekat jawaban dan memuat bucket change + progress write-through | `M3`, `D3` |
| `KanjiFeedbackDetailPanel` | `card`, `separator`, `badge` | item kanji perlu panel detail richer untuk meaning, onyomi, kunyomi, dan example | `D3`, optional expanded state `M3` |
| `SessionCounterCard` | `metric-card` | desktop side rail butuh index dan streak summary yang ringkas | `D3` |
| `LockedModePanel` | `card`, `badge`, `button` | menjelaskan bahwa mode tidak bisa diubah saat session aktif; jalur restart harus eksplisit | `D3` |

### Flashcard Notes
- `AnswerOptionGrid` adalah komponen kritikal karena memengaruhi kecepatan loop belajar; jangan bergantung pada styling `button` default saja.
- `FlashcardFeedbackPanel` harus mendukung dua densitas:
  - compact untuk kana
  - expanded untuk kanji
- `ScriptPairSelector` tidak boleh dirender ulang sebagai toggle inline ketika session sudah aktif.

## Practice Inventory

| Component | Base Building Blocks | Custom Need | Source Screens |
| --- | --- | --- | --- |
| `PracticeQuestionPanel` | `card`, `badge`, `separator` | prompt area harus stabil untuk objective maupun free-response question | `M4`, `D4` |
| `PracticeResponseField` | `input` atau `textarea`, `label`, `form` | field perlu adaptif sesuai tipe jawaban tanpa mengubah flow utama | `M4`, `D4` |
| `DifficultyHintPill` | `badge` | menampilkan `fit`, `stretch`, atau difficulty cue ringan | `M4` |
| `PracticeSubmitBar` | `button`, `inline notice` | CTA submit dan validasi ringan perlu tetap dekat area answer | `M4`, `D4` |
| `PracticeGradingPanel` | `card`, `badge`, `separator`, `button` | grading result harus inline dan memuat score, feedback singkat, skill attribution, next action | `M4`, `D4` |
| `QuestionIndexRail` | `badge`, `separator`, `button` | desktop support rail butuh status `done`, `active`, `queued` | `D4` |
| `PracticeSessionRail` | `metric-card`, `card`, `badge` | timer, question count, feedback notes, dan follow-up CTA berada di support rail | `D4` |

### Practice Notes
- `PracticeGradingPanel` harus siap menerima dua sumber feedback:
  - deterministic grading
  - AI grading structured output
- Karena alur practice lebih panjang daripada flashcards, spacing vertikal dan submit rhythm perlu lebih stabil daripada hanya mengandalkan `form` default.

## Progress Inventory

| Component | Base Building Blocks | Custom Need | Source Screens |
| --- | --- | --- | --- |
| `ProgressOverviewHero` | `metric-card`, `progress`, `badge` | hero mobile dan desktop harus terasa instructional, bukan KPI dashboard generik | `M5`, `D5` |
| `WeakSkillActionPanel` | `card`, `badge`, `button` | gabungkan diagnosis dan next action dalam satu panel | `M5`, `D5` |
| `MasteryTrendPanel` | `chart-panel`, `badge`, `separator` | chart perlu tone ringan dan readable, bukan data-heavy | `D5` |
| `MasteryByUnitPanel` | `chart-panel` atau `data-table-shell` | tampilan mobile dan desktop berbeda tetapi data meaning tetap sama | `M5`, `D5` |
| `RecentActivityTimeline` | `card`, `separator`, `badge` | timeline harus menjelaskan hubungan antar flashcards, practice, dan progress update | `M5`, `D5` |
| `RecommendationActionRow` | `button`, `badge` | CTA ke `Practice` dan `Syllabus` harus tampil sebagai next step guidance | `D5` |

### Progress Notes
- `RecentActivityTimeline` adalah komponen domain, bukan sekadar list biasa, karena event yang ditampilkan berasal dari alur write-through lintas module.
- `MasteryTrendPanel` dan `MasteryByUnitPanel` boleh memakai library chart di balik layar, tetapi container, caption, legend, dan empty state harus tetap mengikuti semantic KotobaHub.

## Cross-Feature State Inventory

| State Pattern | Base Building Blocks | Why Shared |
| --- | --- | --- |
| `Inline success feedback` | `inline notice`, `badge` | dipakai di flashcards, practice, onboarding confirmation |
| `Inline warning feedback` | `inline notice`, `badge` | dipakai untuk retry state, low-confidence suggestion, or due review |
| `Optimistic progress update` | `badge`, `progress`, `skeleton` | write-through progress butuh transisi state yang konsisten |
| `Retry action block` | `alert`, `button` | failure di generate session, answer submit, atau fetch overview |
| `Section loading shell` | `skeleton`, `card` | agar app tidak meloncat layout saat server/client state berubah |

## Suggested Ownership In Codebase

### Shared Layer
- `src/frontend/shared/components/atoms`
  - `Button`, `Badge`, `Input`, `Textarea`, `Progress`, `Skeleton`
- `src/frontend/shared/components/molecules`
  - `AppTextField`, `AppSelectField`, `StatusPill`, `InlineNotice`
- `src/frontend/shared/components/organisms`
  - `MetricCard`, `ActionCard`, `DataTableShell`, `ChartPanel`
- `src/frontend/shared/components/layouts`
  - `AppSidebar`, `MobileBottomNav`, `ContextTopbar`, `FocusModeShell`

### Feature Layers
- `src/frontend/onboarding`
  - `OnboardingStepper`, `OnboardingAssessmentForm`, `DraftProfilePreview`
- `src/frontend/syllabus`
  - `TrackSwitcher`, `ContinueLearningCard`, `UnitLaneCard`, `SelectedUnitSupportPanel`
- `src/frontend/flashcards`
  - `FlashcardSetupPanel`, `ScriptPairSelector`, `FlashcardCanvas`, `AnswerOptionGrid`, `FlashcardFeedbackPanel`
- `src/frontend/practice`
  - `PracticeQuestionPanel`, `PracticeResponseField`, `PracticeGradingPanel`, `PracticeSessionRail`
- `src/frontend/progress`
  - `ProgressOverviewHero`, `WeakSkillActionPanel`, `MasteryTrendPanel`, `RecentActivityTimeline`

## Implementation Priority

### P0 For `IMP-11` App Shell
- `Button`
- `Card`
- `Badge`
- `Progress`
- `AppSidebar`
- `MobileBottomNav`
- `ContextTopbar`
- `FocusModeShell`
- `EmptyStatePanel`
- `LoadingPanel`

### P0 For `IMP-12` Onboarding
- `OnboardingStepper`
- `OnboardingAssessmentForm`
- `WeakSkillMultiSelect`
- `DraftProfilePreview`
- `OnboardingWizardFooter`

### P0 For `IMP-13`
- `TrackSwitcher`
- `ContinueLearningCard`
- `UnitLaneCard`
- `SelectedUnitSupportPanel`

### P0 For `IMP-14`
- `FlashcardSetupPanel`
- `ScriptPairSelector`
- `FlashcardCanvas`
- `AnswerOptionGrid`
- `FlashcardFeedbackPanel`

### P0 For `IMP-15`
- `PracticeQuestionPanel`
- `PracticeResponseField`
- `PracticeGradingPanel`
- `PracticeSessionRail`

### P0 For `IMP-16`
- `ProgressOverviewHero`
- `WeakSkillActionPanel`
- `MasteryTrendPanel`
- `RecentActivityTimeline`

## Non-Goals
- Jangan menjadikan default example style `shadcn` sebagai visual final tanpa adaptasi ke token KotobaHub.
- Jangan memakai komponen data-dense seperti admin dashboard table atau analytics chart style sebagai pattern utama untuk area belajar.
- Jangan mengubah komponen session aktif menjadi multi-column complex layout yang bertentangan dengan focus mode di wireframe.
- Jangan memakai icon-only navigation untuk mobile bottom nav.

## Handoff To Next Tasks
- `DS-08` harus memakai inventory ini saat menyusun high-fidelity system design agar tidak ada komponen penting yang terlewat.
- `IMP-11` sampai `IMP-16` harus memulai dari primitive dan wrapper di dokumen ini sebelum membuat improvisasi UI baru.
- Jika implementasi menemukan kebutuhan komponen baru yang belum tercantum di sini, update dokumen ini terlebih dahulu bila komponen tersebut bersifat reusable lintas screen.
