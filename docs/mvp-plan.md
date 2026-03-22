# KotobaFlow MVP Plan

## Summary
- Dokumentasi ini berisi arsitektur, design system, roadmap implementasi, API contract, data model, dan strategi testing untuk `KotobaFlow`.
- Target stack dikunci ke Next.js App Router `16.1.1` pada Bun, dengan React `19.2.1+`, karena Next.js 15/16 App Router sempat terkena advisory besar pada Desember 2025 dan rilis patch aman berada di line `16.0.10+`; gunakan patch terbaru di line `16.1.x` saat bootstrap.
- Scope v1 adalah `Core MVP`: Google login, onboarding personalization, online syllabus read-only, flashcard, AI random questions, realtime progress tracking berbasis event, responsive web untuk mobile dan desktop, Docker image, dan baseline CI/quality gates.
- Arah produk yang dikunci: UI language `English`, syllabus `JLPT ladder` dengan progression ala Duolingo namun bukan cloning konten/struktur proprietary, database production tetap `MySQL`, dan AI architecture `provider-agnostic` dengan adapter default OpenAI saat implementasi AI dimulai.

## Key Changes
- Buat satu Next.js fullstack app, bukan monorepo. Struktur utama: `src/app` untuk App Router pages/layouts dan thin API entrypoints, `src/backend` untuk modular monolith backend per bounded context, `src/frontend` untuk `shared` UI/app-shell concerns dan folder domain-specific sejajar, `src/content` untuk syllabus/deck seed data, dan `tests` untuk unit/integration/component.
- Gunakan modular monolith per feature: `auth`, `users`, `syllabus`, `flashcards`, `practice`, `progress`, `personalization`, `shared`. Tiap backend module punya batas jelas `domain`, `application`, `interface`, dan `infrastructure`, sementara frontend dipecah ke `src/frontend/shared` plus folder feature seperti `src/frontend/auth`, `src/frontend/syllabus`, dan `src/frontend/progress`.
- Kunci fondasi engineering: Bun, TypeScript strict, ESLint flat config, Prettier, Husky + lint-staged, commit hooks untuk `lint`, `typecheck`, dan `test --changed`. Karena `next lint` sudah deprecated sejak Next 15.5, linting dijalankan via ESLint CLI.
- Data layer: MySQL + Drizzle + `mysql2` + `drizzle-kit`; validasi DTO/API pakai Zod. Tambahkan env validation di startup dan secret separation untuk local/dev/prod.
- Auth pakai Auth.js dengan Google provider dan adapter Drizzle. Simpan `users`, `accounts`, `sessions`/session metadata, lalu tambah `learner_profiles` untuk level target, daily goal, preferred script support, dan onboarding completion.
- Design system dibuat dulu sebelum feature coding: Tailwind CSS + shadcn/ui + custom token layer. Brand direction: clean study-product, academic but friendly; font pair `Plus Jakarta Sans` + `Noto Sans JP`; token warna utama `ink`, `paper`, `matcha`, `amber`, `coral`; token radius, spacing, elevation, focus ring, and semantic states didefinisikan sebagai source of truth.
- Information architecture: landing page, auth flow, onboarding personalization wizard, dashboard, syllabus map, unit detail, flashcard game, random question session, progress analytics, profile/settings. Navigation pattern: bottom nav di mobile dan sidebar/topbar hybrid di desktop.
- Online syllabus v1 bersifat read-only dan seeded from repo. Buat course map N5→N2, namun kepadatan konten awal difokuskan pada N5→N4; N3→N2 boleh hadir sebagai expandable structure agar schema dan routing tidak perlu diubah nanti.
- Konten syllabus disusun sebagai `track -> unit -> lesson -> skill`. Skill menjadi elemen inti untuk progress dan personalization. Contoh skill: `hiragana_basic`, `katakana_loanwords`, `n5_particles_wa_ga_o`, `n4_past_plain_form`.
- Flashcard bukan sekadar random card. Pakai lightweight Leitner-style buckets: `new`, `learning`, `mastered`. Setiap jawaban menulis `progress_event`, mengubah bucket, dan meng-update mastery snapshot per skill.
- Random Questions dibuat sebagai 5-question session by default, dengan komposisi `60% weak skills`, `30% reinforcement`, `10% stretch`. Gunakan campuran objective tasks dan short free-response tasks agar biaya AI terkendali.
- Jangan menyerahkan semua evaluasi ke AI. Untuk kana, vocab match, multiple choice, dan sentence slot-fill yang deterministik, nilai dengan rules biasa. AI hanya dipakai untuk generate set, grade free-response, normalize personalization input, dan memberi feedback singkat.
- Realtime progress tracking di MVP diartikan sebagai write-through per interaction, bukan websocket. Setelah setiap flashcard answer atau practice answer, simpan `progress_event` langsung, recompute `skill_mastery_snapshot`, dan refresh UI secara optimistik + revalidation.
- Mastery model v1: hitung dari 20 attempt terakhir per skill dengan bobot `accuracy 70%`, `recency 20%`, `speed/confidence proxy 10%`; naikkan difficulty jika mastery `>= 80` selama 2 session, turunkan/remediate jika `<= 50` selama 2 session.
- Personalization onboarding jangan pure chat. Gabungkan structured wizard dan optional AI note. User memilih current level, script familiarity, weak areas, target JLPT, dan daily goal; optional free-text seperti “I already know N5 grammar” dinormalisasi AI menjadi daftar skill yang harus dikonfirmasi user sebelum disimpan.
- Public API contracts yang perlu dikunci: `GET /api/syllabus`, `GET /api/syllabus/units/:slug`, `GET /api/flashcards/decks`, `POST /api/flashcards/sessions`, `POST /api/flashcards/sessions/:id/answer`, `POST /api/practice/sessions/generate`, `POST /api/practice/sessions/:id/answer`, `GET /api/progress/overview`, `GET /api/progress/timeline`, `POST /api/personalization/assessment`.
- Interface AI provider yang perlu dibekukan sejak awal: `generatePracticeSession(input)`, `gradePracticeAnswer(input)`, `summarizePlacement(input)`, `generateStudyRecommendation(input)`. Semua output wajib structured JSON schema agar provider bisa diganti tanpa menyentuh UI.
- Default AI adapter saat implementasi: OpenAI Responses API dengan structured outputs. Default cost profile: `gpt-5-mini` untuk generation/grading yang butuh reasoning, `gpt-5-nano` untuk classification/summarization ringan, Batch/Flex untuk recalculation async dan offline content tagging.
- Konteks untuk AI tidak menggunakan RAG umum di v1. AI hanya menerima context bundle dari DB: target level, recent mistakes, weak skills, mastered skills, current unit, dan allowed question types. Ini menjaga biaya tetap rendah dan mengurangi hallucination.
- Tambahkan observability minimum untuk AI: request id, provider, model, latency, token usage, estimated cost, schema-parse success, retry count, and failure reason. Log ini juga dipakai untuk tuning prompt dan budget guardrails.
- Build and deploy: multi-stage Dockerfile untuk Bun + Next standalone output, plus `docker-compose` local untuk app + MySQL. Target demo/hobby deploy primer: Koyeb free web service untuk app container dan Aiven free MySQL untuk database; siapkan fallback docs untuk Render/Koyeb app deploy dan paid-upgrade path bila traffic naik.
- Git baseline: inisialisasi repo, `.gitignore`, branch strategy sederhana (`main` + feature branches), dan GitHub Actions untuk `lint`, `typecheck`, `unit/integration test`, dan `docker build`.

## Implementation Sequence
1. Bootstrap project dengan Next.js 16.1.1, Bun, TypeScript, Tailwind, shadcn, ESLint, Prettier, Husky, Jest, Testing Library, Drizzle, Auth.js, Docker, dan CI skeleton.
2. Bangun design system dan app shell lebih dulu: tokens, typography, layout primitives, navigation, form patterns, feedback states, empty/loading/error states.
3. Implement auth + onboarding personalization + learner profile schema + protected dashboard shell.
4. Seed syllabus/read-only content model, unit pages, lesson pages, dan progress-aware course map.
5. Implement flashcard engine, session flow, progress event pipeline, mastery snapshots, dan dashboard progress widgets.
6. Implement AI practice module dengan provider abstraction, prompt templates, structured outputs, grading pipeline, and recommendation logic tied ke progress/mastery.
7. Tutup dengan Docker hardening, deploy guide, observability, and CI stabilization.

## Test Plan
- Unit tests: mastery calculator, flashcard scheduling, personalization normalizer, AI response mappers, prompt-context builders, and domain services per module.
- Component tests: onboarding wizard, flashcard session UI, practice question cards, feedback panel, progress charts, and responsive navigation behavior.
- Integration/API tests: auth guards, protected route access, syllabus fetch, flashcard answer submission, practice generation/grading endpoints, and progress aggregation queries.
- AI contract tests: mock provider responses against Zod schema, malformed JSON recovery, retry logic, budget guardrails, and provider swap compatibility.
- AI quality eval set: small curated dataset of learner profiles, generated sessions, and expected grading outcomes; ukur relevance, difficulty fit, feedback clarity, and non-hallucination before production rollout.
- E2E smoke tests direkomendasikan dengan Playwright walau requirement inti hanya Jest/RTL; fokus pada login stub flow, onboarding, flashcard session, practice session, dan dashboard refresh.

## Assumptions And Defaults
- Planning doc akan ditulis dalam bahasa Indonesia, sementara UI product tetap English.
- “Duolingo-like” ditafsirkan sebagai progression style dan learning cadence, bukan penyalinan unit names, content order, atau proprietary assets Duolingo.
- MVP tidak mencakup admin CMS, leaderboard, social features, voice conversation, push notifications, atau multiplayer.
- Realtime pada MVP berarti event tercatat seketika setelah user interaction dan langsung memengaruhi rekomendasi session berikutnya; websocket/live collaboration tidak masuk scope awal.
- Production tetap memakai MySQL sesuai preferensi, walau ini membuat opsi free hosting lebih sempit; konsekuensinya path deploy awal difokuskan ke app-host gratis + free managed MySQL.
