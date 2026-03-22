# KotobaFlow Task Breakdown

## Summary
- Format task breakdown menggunakan checklist agar mudah ditandai `done` atau `not done` di file ini.
- Urutan kerja dikunci sesuai arahan: architecture dulu, lalu UI system design, lalu syllabus, lalu implementasi backend/database per fitur, baru UI, dan terakhir unit testing untuk area yang paling penting.
- Khusus system design, task awal menunggu brief brand identity final; task lain tetap bisa jalan paralel selama tidak bergantung pada visual identity final.

## Development Tasks

### 1. System Architecture
- [x] `ARCH-01` Finalisasi daftar bounded context modular monolith: `auth`, `users`, `syllabus`, `flashcards`, `practice`, `progress`, `personalization`, `shared`. Lihat [architecture-foundation.md](./architecture-foundation.md).
- [x] `ARCH-02` Tetapkan struktur folder final untuk Next.js App Router agar pemisahan frontend, backend adapter, dan domain modules jelas. Lihat [architecture-foundation.md](./architecture-foundation.md).
- [x] `ARCH-03` Definisikan alur data utama antar module, terutama relasi `syllabus -> progress -> personalization -> practice`. Lihat [architecture-foundation.md](./architecture-foundation.md).
- [ ] `ARCH-04` Buat sequence diagram untuk `Login with Google + first-time onboarding personalization`.
- [ ] `ARCH-05` Buat sequence diagram untuk `Flashcard answer -> progress event -> mastery snapshot update`.
- [ ] `ARCH-06` Buat sequence diagram untuk `Generate random questions -> answer submission -> grading -> progress update`.
- [ ] `ARCH-07` Buat sequence diagram untuk `Personalization assessment -> AI normalization -> user confirmation -> learner profile update`.
- [ ] `ARCH-08` Susun ERD untuk auth dan user profile: `users`, `accounts`, `sessions`, `learner_profiles`.
- [ ] `ARCH-09` Susun ERD untuk syllabus domain: `tracks`, `units`, `lessons`, `skills`, `unit_skill_mappings`.
- [ ] `ARCH-10` Susun ERD untuk learning activity: `flashcard_decks`, `flashcard_items`, `practice_sessions`, `practice_questions`, `practice_answers`, `progress_events`, `skill_mastery_snapshots`.
- [ ] `ARCH-11` Susun ERD untuk AI support dan observability minimum bila diperlukan: `ai_request_logs` atau tabel/log sink setara.
- [ ] `ARCH-12` Draft OpenAPI/Swagger base document: metadata, auth scheme, error response format, pagination/query convention.
- [ ] `ARCH-13` Definisikan Swagger contract untuk endpoint syllabus dan personalization.
- [ ] `ARCH-14` Definisikan Swagger contract untuk endpoint flashcard, practice, dan progress tracking.
- [ ] `ARCH-15` Review konsistensi antara sequence diagram, ERD, dan Swagger agar tidak ada mismatch field atau flow.

### 2. UI System Design
- [ ] `DS-01` Kumpulkan brief brand identity KotobaFlow dari stakeholder sebelum masuk ke visual system final.
- [ ] `DS-02` Buat design direction board: tone, keywords, visual references, dan learning-product personality.
- [ ] `DS-03` Definisikan design tokens awal: color roles, typography, spacing, radius, shadow, focus state, motion principles.
- [ ] `DS-04` Definisikan responsive layout rules untuk mobile dan desktop, termasuk pattern bottom nav dan sidebar/topbar.
- [ ] `DS-05` Buat information architecture dan page inventory untuk landing, auth, onboarding, dashboard, syllabus, flashcard, practice, progress, settings.
- [ ] `DS-06` Buat low-fidelity wireframe untuk flow inti: onboarding, syllabus map, flashcard session, practice session, progress dashboard.
- [ ] `DS-07` Buat component inventory berbasis shadcn yang perlu di-custom untuk KotobaFlow.
- [ ] `DS-08` Finalisasi high-fidelity system design setelah brief brand diterima dan validasi konsistensi antar screen.

### 3. Online Syllabus
- [ ] `SYL-01` Finalisasi struktur syllabus `track -> unit -> lesson -> skill` berbasis JLPT.
- [ ] `SYL-02` Tetapkan coverage scope seed awal: detail konten N5 sampai N4, dengan skeleton extensible untuk N3 sampai N2.
- [ ] `SYL-03` Definisikan schema seed content agar mudah diimport ke database atau dibaca langsung dari repo.
- [ ] `SYL-04` Susun daftar unit per level JLPT dan urutan belajar yang masuk akal untuk learner journey KotobaFlow.
- [ ] `SYL-05` Turunkan setiap unit menjadi lesson dan daftar skill yang bisa di-track oleh sistem.
- [ ] `SYL-06` Tandai skill yang dipakai oleh flashcard, skill yang dipakai oleh random questions, dan skill yang dipakai keduanya.
- [ ] `SYL-07` Review syllabus supaya align dengan personalization rules dan mastery tracking.

### 4. Code Implementation
- [ ] `IMP-01` Bootstrap project foundation: Next.js App Router, Bun, TypeScript strict, ESLint, Prettier, Husky, Tailwind, shadcn, Jest, RTL, Drizzle, Docker.
- [ ] `IMP-02` Implement database foundation: koneksi MySQL, migration workflow, env validation, dan base schema auth/user.
- [ ] `IMP-03` Implement authentication backend dengan Google login dan protected route strategy.
- [ ] `IMP-04` Implement backend learner profile dan onboarding personalization persistence.
- [ ] `IMP-05` Implement backend syllabus read model dan endpoint fetch track/unit/lesson.
- [ ] `IMP-06` Implement backend progress engine: `progress_events`, `skill_mastery_snapshots`, dan summary aggregation.
- [ ] `IMP-07` Implement backend flashcard engine: session creation, answer evaluation, Leitner bucket update, dan progress write-through.
- [ ] `IMP-08` Implement backend AI abstraction layer: provider contract, prompt/template structure, schema validation, observability hooks.
- [ ] `IMP-09` Implement backend random questions: session generation, answer grading, feedback generation, dan progress integration.
- [ ] `IMP-10` Implement backend personalization assessment endpoint yang bisa menerima structured form + optional AI note normalization.
- [ ] `IMP-11` Implement UI app shell dan shared layout primitives berdasarkan design system yang sudah final.
- [ ] `IMP-12` Implement UI auth flow dan onboarding wizard.
- [ ] `IMP-13` Implement UI syllabus map, unit detail, dan lesson overview.
- [ ] `IMP-14` Implement UI flashcard game flow dan result/feedback state.
- [ ] `IMP-15` Implement UI random questions session, answer submission, feedback, dan completion summary.
- [ ] `IMP-16` Implement UI progress dashboard dan progress indicators yang mengambil data realtime write-through.
- [ ] `IMP-17` Integrasikan seluruh flow end-to-end dan pastikan state progress benar-benar memengaruhi personalization serta practice generation.

### 5. Unit Testing
- [ ] `TEST-01` Buat unit test untuk mastery calculation dan difficulty adjustment rule.
- [ ] `TEST-02` Buat unit test untuk flashcard scheduling/Leitner bucket update.
- [ ] `TEST-03` Buat unit test untuk deterministic answer evaluator pada flashcard dan objective practice question.
- [ ] `TEST-04` Buat unit test untuk AI response mapper atau schema parser agar output provider selalu valid.
- [ ] `TEST-05` Buat unit test untuk personalization normalizer atau learner profile mapper.
- [ ] `TEST-06` Buat component test untuk onboarding wizard pada path kritikal.
- [ ] `TEST-07` Buat component test untuk flashcard session UI dan feedback state.
- [ ] `TEST-08` Buat component test untuk practice question UI dan completion summary.
- [ ] `TEST-09` Buat integration test ringan untuk endpoint paling kritikal: `POST /api/flashcards/sessions/:id/answer`, `POST /api/practice/sessions/:id/answer`, dan `GET /api/progress/overview`.
- [ ] `TEST-10` Review coverage agar hanya area inti yang ter-cover tanpa membuat test suite terlalu luas.

## Assumptions And Tracking Rules
- Gunakan status checklist sederhana `[ ]` untuk `todo` dan `[x]` untuk `done`; jika perlu blocker, tulis suffix singkat seperti `(blocked: waiting brand brief)`.
- Task `DS-01` adalah dependency utama untuk visual system final; wireframe dan architecture tetap boleh lanjut sebelum brand brief datang.
- Implementasi backend/database harus selesai lebih dulu untuk setiap feature sebelum task UI feature tersebut mulai dikerjakan.
- Swagger, ERD, dan sequence diagram dianggap deliverable wajib sebelum implementasi feature inti dimulai.
