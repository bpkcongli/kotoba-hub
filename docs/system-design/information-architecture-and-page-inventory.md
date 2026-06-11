# KotobaHub Information Architecture And Page Inventory

## Status
- Dokumen ini menyelesaikan task `DS-05`.
- Scope task ini hanya dokumentasi; tidak ada output Figma tambahan untuk fase ini.
- Dokumen ini menjadi source of truth awal untuk struktur halaman, grouping route, dan inventaris screen MVP sebelum wireframe dan implementasi app shell.

## Dependencies
- [task-breakdown.md](../task-breakdown.md)
- [mvp-plan.md](../mvp-plan.md)
- [architecture-foundation.md](../architecture-foundation.md)
- [design-token-foundation.md](./design-token-foundation.md)
- [responsive-layout-rules.md](./responsive-layout-rules.md)
- [sequence-diagram/login-session-established.md](../sequence-diagram/login-session-established.md)
- [sequence-diagram/onboarding-personalization.md](../sequence-diagram/onboarding-personalization.md)
- [sequence-diagram/onboarding-personalization-with-ai-normalization.md](../sequence-diagram/onboarding-personalization-with-ai-normalization.md)
- [sequence-diagram/flashcard-and-answer-evaluation.md](../sequence-diagram/flashcard-and-answer-evaluation.md)
- [sequence-diagram/random-question-generator-and-answer-evaluation.md](../sequence-diagram/random-question-generator-and-answer-evaluation.md)
- [sequence-diagram/update-progress-snapshot.md](../sequence-diagram/update-progress-snapshot.md)

## IA Goals
- Memisahkan dengan jelas area public, auth, onboarding, dan app area belajar.
- Menjadikan `dashboard` sebagai app home setelah onboarding selesai.
- Menjaga syllabus, flashcards, practice, dan progress sebagai jalur belajar inti yang mudah dicapai dari navigasi utama.
- Menempatkan settings sebagai area pendukung berfrekuensi rendah tanpa mengganggu focus area belajar.

## Primary IA Principles
- Struktur halaman harus mengikuti ownership produk, bukan sekadar daftar menu.
- Protected flow selalu melewati pemeriksaan `session established` lalu `onboarding_completed`.
- Route harus dangkal dan mudah diprediksi; detail nesting dipakai hanya jika benar-benar mewakili hirarki konten resmi seperti `track -> unit -> lesson`.
- Satu halaman utama harus punya satu tujuan utama; jangan mencampur analytics, content browsing, dan answering flow di satu screen tanpa alasan kuat.

## Route Grouping

| Route Group | Purpose | Access |
| --- | --- | --- |
| `(public)` | marketing dan entry point awal | public |
| `(auth)` | login handoff dan auth-related surface | public atau transitional |
| `(app)` | seluruh area belajar dan account setelah login | authenticated |

## Route Guard Rules
- User tanpa session hanya boleh mengakses area public/auth.
- User dengan session tetapi `onboarding_completed = false` harus diarahkan ke `/onboarding` saat mencoba masuk ke route `(app)`.
- User dengan session dan onboarding selesai masuk ke `dashboard` sebagai default app landing.
- Onboarding tidak muncul lagi di primary nav setelah selesai; akses ulang, jika nanti dibutuhkan, diperlakukan sebagai edit profile/assessment dari `settings`.

## Sitemap Overview

```text
/
  login
  onboarding
  dashboard
  syllabus
    units/[unitSlug]
    lessons/[lessonSlug]
  flashcards
    sessions/[sessionId]
    sessions/[sessionId]/summary
  practice
    sessions/[sessionId]
    sessions/[sessionId]/summary
  progress
  settings
```

## Route Notes
- `/` adalah landing page public.
- `/login` adalah auth entry utama untuk Google sign-in.
- `/onboarding` adalah wizard multi-step yang mencakup assessment, draft review, dan final confirmation dalam satu flow.
- `/dashboard` adalah app home setelah user authenticated dan onboarding selesai.
- `/syllabus` menampilkan peta belajar tingkat atas; detail belajar turun ke `unit` lalu `lesson`.
- `/flashcards` dan `/practice` masing-masing memiliki hub/start page serta session page tersendiri.
- `summary` untuk flashcards dan practice dipisahkan dari session aktif agar hasil akhir punya state yang jelas dan mudah direvisit bila nanti dibutuhkan.
- `/progress` difokuskan untuk overview dan history perkembangan.
- `/settings` memuat profil, preferensi belajar dasar, dan pengaturan akun MVP.

## Navigation Model

### Primary Navigation
- `Dashboard`
- `Syllabus`
- `Flashcards`
- `Practice`
- `Progress`

### Secondary Navigation
- `Settings`
- `Profile / account menu`
- `Sign out`

### Navigation Intent
- Primary nav hanya memuat area yang paling sering dipakai untuk ritme belajar harian.
- `Settings` sengaja ditempatkan sebagai secondary destination karena bukan area core loop.
- `Onboarding` tidak pernah menjadi permanent nav item.

## Page Inventory

| Page | Suggested Route | Access | Primary Goal | Key Content And Actions |
| --- | --- | --- | --- | --- |
| Landing | `/` | public | menjelaskan value proposition dan mengarahkan user untuk mulai login | hero, product thesis, feature highlights, CTA `Continue with Google` |
| Login | `/login` | public | memulai Google sign-in dengan friction minimum | brand context singkat, auth CTA, trust/support copy |
| Onboarding Wizard | `/onboarding` | authenticated, onboarding required | mengumpulkan current level, target, daily goal, preferred script, weak skills, dan optional free-text note | multi-step form, stepper, validation, submit assessment |
| Onboarding Review | `/onboarding` | authenticated, onboarding required | meminta user mengonfirmasi draft profile dan suggestion hasil normalisasi AI | draft summary, editable suggestion chips, confirm action |
| Dashboard | `/dashboard` | authenticated, onboarding complete | memberi titik masuk belajar harian dan recommended next step | recommended action, today progress, weak skills, recent activity, shortcut ke syllabus/flashcards/practice |
| Syllabus Map | `/syllabus` | authenticated | menampilkan struktur `track -> unit -> lesson` dan progress per area | track selector, unit grouping, completion markers, status `not started/reading/quiz required/completed`, continue-learning CTA |
| Unit Detail | `/syllabus/units/[unitSlug]` | authenticated | menjelaskan isi unit, daftar lesson, dan skill focus | unit summary, lesson list, skill tags, progress snapshot, lesson completion cues |
| Lesson Overview | `/syllabus/lessons/[lessonSlug]` | authenticated | menunjukkan breakdown lesson, materi baca, dan langkah lanjut setelah belajar | lesson goals, ordered content blocks, covered skills, understanding level `0-10`, required deterministic post-study quiz CTA, recommended flashcards/practice entry |
| Flashcards Hub | `/flashcards` | authenticated | memilih deck atau melanjutkan sesi flashcard | due cards summary, deck list, continue session/start session CTA |
| Flashcard Session | `/flashcards/sessions/[sessionId]` | authenticated | menjalankan answering loop flashcard dengan feedback cepat | flashcard canvas, answer action, progress indicator, immediate feedback |
| Flashcard Summary | `/flashcards/sessions/[sessionId]/summary` | authenticated | menutup sesi dan memberi hasil ringkas + next action | result summary, mastery delta hint, continue/review CTA |
| Practice Hub | `/practice` | authenticated | memulai random question session berbasis recommendation | generate session CTA, difficulty context, question mix summary |
| Practice Session | `/practice/sessions/[sessionId]` | authenticated | menjalankan loop answer -> grading -> feedback untuk random practice | question prompt, input area, feedback state, question progress, source context, selected difficulty cue |
| Lesson Post-Study Quiz | `/syllabus/lessons/[lessonSlug]/post-study` | authenticated | menjalankan quiz wajib/review lesson direct tanpa membuat `practice_session` | one-question quiz prompt, difficulty level `1-10`, feedback state, understanding level delta, completion confirmation saat level `>= 1`, review CTA |
| Practice Summary | `/practice/sessions/[sessionId]/summary` | authenticated | menampilkan hasil akhir practice dan arahan lanjut | completion summary, weak-skill callout, next study CTA |
| Progress Overview | `/progress` | authenticated | memperlihatkan perkembangan mastery dan history utama | overview metrics, lesson completed counts, quiz-required reminders, understanding ladders, mastery groups, trends, recent timeline |
| Settings | `/settings` | authenticated | mengelola profile, preferred script, daily goal, dan account basics | learner profile form, preference controls, account actions |

## Page Priority By Core MVP Loop

| Priority | Pages |
| --- | --- |
| `P0` | Landing, Login, Onboarding Wizard, Onboarding Review, Dashboard |
| `P0` | Syllabus Map, Unit Detail, Lesson Overview |
| `P0` | Flashcards Hub, Flashcard Session, Flashcard Summary |
| `P0` | Practice Hub, Practice Session, Practice Summary |
| `P0` | Progress Overview, Settings |

## Flow Relationships

### New User Entry
1. Landing
2. Login
3. Onboarding Wizard
4. Onboarding Review
5. Dashboard

### Daily Learning Loop
1. Dashboard
2. Syllabus or direct activity hub
3. Flashcard Session or Practice Session
4. Session Summary
5. Progress Overview or back to Dashboard

### Syllabus-Led Learning Loop
1. Dashboard or Syllabus Map
2. Unit Detail
3. Lesson Overview
4. Start Flashcards or Start Practice
5. Session Summary

## Relationship To App Router Structure
- `src/app/(public)` memuat landing dan public marketing surface.
- `src/app/(auth)` memuat login entry dan auth-adjacent routes bila nanti diperlukan.
- `src/app/(app)` memuat dashboard, syllabus, flashcards, practice, progress, settings, dan onboarding gate flow.
- `src/frontend/onboarding`, `src/frontend/dashboard`, `src/frontend/syllabus`, `src/frontend/flashcards`, `src/frontend/practice`, `src/frontend/progress`, dan `src/frontend/settings` harus mengikuti pembagian area di dokumen ini saat implementasi dimulai.

## Page-State Notes
- `Onboarding Wizard` dan `Onboarding Review` boleh berada dalam route yang sama dengan state internal bertahap; yang penting step ownership tetap jelas.
- `Flashcard Session` dan `Practice Session` harus dianggap sebagai focus-mode pages yang dapat menyembunyikan sebagian navigasi global sesuai aturan di [responsive-layout-rules.md](./responsive-layout-rules.md).
- `Progress Overview` boleh memuat section timeline di halaman yang sama selama hierarchy dan scroll depth tetap terkendali.
- `Settings` adalah satu halaman utama pada MVP; bila nantinya tumbuh menjadi beberapa subpage, pecahannya harus tetap mengikuti prinsip low-frequency support area.

## Deferred Or Out-Of-Scope For Current IA
- Admin CMS
- Leaderboard atau social area
- Notification center terpisah
- Multi-route settings taxonomy yang kompleks
- Dedicated review page di luar `flashcards` dan `practice` flow inti

## Handoff To Next Tasks
- `DS-06` harus memakai page inventory ini saat membuat wireframe onboarding, syllabus map, flashcard session, practice session, dan progress dashboard.
- `IMP-11` sampai `IMP-16` harus menjaga kesesuaian route, screen purpose, dan navigation intent dari dokumen ini.
- Jika nanti ada penambahan halaman baru, update dokumen ini lebih dulu sebelum flow atau app shell diperluas.
