# KotobaHub Product Requirements Document

## Status dan cara menggunakan dokumen

- Status: **handoff produk untuk fase Code Implementation** (`IMP-01`–`IMP-17`), disusun dari keputusan yang sudah ada di `docs/`.
- Bahasa dokumen: Indonesia. Bahasa antarmuka produk: **English**. Materi bahasa Jepang tetap ditampilkan dalam aksara yang sesuai konteks belajar.
- Dokumen ini merangkum kebutuhan produk dan kriteria penerimaan. Bila rincian di sini berbeda dengan sumber yang lebih khusus, ikuti [task breakdown](docs/task-breakdown.md), [struktur folder/store/DI](ARCHITECTURE.md), [bounded context](docs/architecture-foundation.md), [ERD](docs/erd/), [kontrak API](docs/api-contract/), [syllabus](docs/syllabus/), dan [system design](docs/system-design/) sesuai area yang dikerjakan. Catat dan selaraskan mismatch sebelum implementasi area itu.
- Checklist task tetap berada di [docs/task-breakdown.md](docs/task-breakdown.md); membuat PRD ini tidak mengubah status `IMP-*` atau `SYL-07`.

## 1. Ringkasan produk

KotobaHub adalah aplikasi web belajar bahasa Jepang mandiri dengan jalur JLPT yang terstruktur. Learner membaca materi lesson, menjawab quiz wajib untuk menyelesaikannya, berlatih melalui flashcard dan random questions, lalu melihat hasil interaksi tersebut segera tercermin pada progress dan rekomendasi belajar berikutnya.

**Masalah yang ditangani:** learner memerlukan urutan belajar yang jelas, latihan yang relevan dengan kemampuan saat ini, dan bukti kemajuan yang lebih bermakna daripada sekadar membuka halaman materi.

**Target pengguna utama:** remaja akhir dan dewasa muda yang belajar bahasa Jepang secara mandiri, terutama pada fondasi N5 dan perluasan N4. Arah visual dan tone pengguna dijelaskan lebih rinci dalam [brand brief](docs/system-design/brand-identity-brief.md).

**Tujuan Core MVP:** memberi satu loop belajar lengkap dari login dan onboarding sampai syllabus, aktivitas, evaluasi, update progress, dan rekomendasi langkah berikutnya. Web harus nyaman di mobile dan desktop.

## 2. Cakupan rilis

| Area | Kebutuhan MVP | Rujukan utama |
| --- | --- | --- |
| Akses | Google OAuth, session cookie, guard berdasarkan login dan onboarding | [Auth API](docs/api-contract/auth-and-authorization.md) |
| Personalisasi awal | Wizard terstruktur, catatan opsional untuk normalisasi AI, review draft, konfirmasi user sebelum profil disimpan | [Profile API](docs/api-contract/user-profile-and-personalization.md) |
| Syllabus | Katalog read-only `track -> unit -> lesson -> skill`; N5/N4 published, N3/N2 skeleton unpublished | [Syllabus scope](docs/syllabus/seed-coverage-scope.md), [Syllabus API](docs/api-contract/syllabus.md) |
| Lesson | Baca `contentBlocks` berurutan lalu jalankan quiz wajib deterministik satu soal; understanding per lesson `0..10` | [Syllabus seed schema](docs/syllabus/seed-content-schema.md), [Practice API](docs/api-contract/practice.md) |
| Flashcards | System deck KANA/KANJI/VOCABULARY, sesi pilihan ganda, script pair terkunci per sesi, evaluasi deterministik, bucket Leitner | [Deck mapping](docs/syllabus/flashcard-deck-mapping.md), [Flashcards API](docs/api-contract/flashcards.md) |
| Random practice | Sesi default lima soal berbasis rekomendasi, grading deterministik atau AI sesuai tipe soal | [Practice API](docs/api-contract/practice.md) |
| Progress | Event per jawaban, mastery snapshot per skill, understanding snapshot per lesson, overview dan activity history | [Progress API](docs/api-contract/progress.md), [Learning activity ERD](docs/erd/learning-activity.md) |
| Delivery | Satu Next.js fullstack app, MySQL, Docker, CI/quality gates dan testing area kritikal | [MVP plan](docs/mvp-plan.md), [Architecture](docs/architecture-foundation.md) |

Kontrak backend flashcards juga mencakup pembuatan **custom deck** yang mereferensikan item yang sudah ada. Katalog dan persistence custom deck mengikuti [Flashcards API](docs/api-contract/flashcards.md); layar editor custom deck belum tercantum dalam daftar UI `IMP-11`–`IMP-16`, sehingga jangan mengasumsikan layar authoring baru tanpa menyelaraskan scope UI terlebih dahulu.

Di luar Core MVP: admin CMS, leaderboard, fitur sosial, voice conversation, push notification, multiplayer, RAG umum, dan dark mode yang belum dikunci. N3/N2 belum dianggap katalog materi siap belajar. Sumber: [MVP plan](docs/mvp-plan.md) dan [seed coverage](docs/syllabus/seed-coverage-scope.md).

## 3. Pengalaman pengguna inti

### 3.1 Masuk dan memulai belajar

1. Visitor melihat landing page, lalu memilih **Continue with Google**.
2. Session dibuat melalui Google login. User baru diarahkan ke onboarding; user dengan profil selesai menuju dashboard.
3. Wizard meminta current level, target JLPT, daily goal, preferred script, dan weak skill focuses. Catatan bebas bersifat opsional.
4. Jika catatan diproses AI, hasilnya tampil sebagai **draft** yang dapat diedit. Hanya konfirmasi user yang menyimpan `learner_profiles` dan menandai onboarding selesai.

**Kriteria penerimaan:** route belajar terlindungi; user tanpa session mendapat jalur login, user dengan onboarding belum selesai hanya mendapat jalur onboarding; hasil normalisasi AI tidak langsung menjadi klaim skill final. Rujukan: [login sequence](docs/sequence-diagram/login-session-established.md), [onboarding sequence](docs/sequence-diagram/onboarding-personalization-with-ai-normalization.md), [Auth API](docs/api-contract/auth-and-authorization.md).

### 3.2 Belajar dari syllabus

1. Dashboard dan syllabus map menampilkan track published, unit, lesson, status belajar, dan aksi lanjut yang relevan.
2. Lesson detail menampilkan tujuan, estimasi waktu, skill, serta `contentBlocks` sebagai materi baca utama.
3. Setelah membaca, learner diarahkan ke **post-study quiz** wajib. Satu attempt berisi tepat satu soal `SHORT_FREE_RESPONSE` dari bank canonical lesson yang berisi tepat sepuluh soal bertingkat `1..10`.
4. Difficulty soal berikutnya adalah `min(currentUnderstandingLevel + 1, 10)`. Jawaban benar menaikkan understanding satu tingkat, jawaban salah mempertahankannya. Lesson berstatus completed mulai level `>= 1`; review berikutnya dapat menaikkan level sampai `10`.
5. Quiz lesson memakai endpoint direct dan **tidak** membuat `practice_session` atau `practice_question`.

**Kriteria penerimaan:** membuka atau membaca lesson saja tidak menandai completed; syllabus dan progress memakai status yang konsisten (`not started`, `reading`, `quiz required`, `completed`); hasil quiz menampilkan soal/difficulty, feedback, perubahan level, dan next action. Rujukan: [Syllabus API](docs/api-contract/syllabus.md), [Practice API](docs/api-contract/practice.md), [Progress ERD](docs/erd/learning-activity.md).

### 3.3 Flashcards

1. Learner memilih deck dan pasangan `questionScriptMode`/`answerScriptMode` yang valid sebelum sesi dimulai.
2. Backend membentuk opsi pilihan ganda dari canonical answer dan distractor pool, lalu menyimpan snapshot opsi untuk grading yang stabil.
3. Sesi menampilkan satu kartu fokus pada satu waktu. Jawaban dinilai deterministik, bucket item diperbarui (`NEW`, `LEARNING`, `MASTERED`), dan feedback muncul dekat opsi jawaban.
4. Item dengan mapping skill resmi menghasilkan `progress_event` dan mastery terbaru; item tanpa mapping resmi boleh dilatih tetapi tidak menaikkan mastery syllabus.

**Kriteria penerimaan:** script pair terkunci selama sesi; untuk menggantinya user memulai sesi baru. Feedback kana ringkas, kanji dapat menampilkan meaning, onyomi, kunyomi, dan contoh. Hasil sesi memiliki ringkasan serta langkah lanjut. Rujukan: [Flashcards API](docs/api-contract/flashcards.md), [deck mapping](docs/syllabus/flashcard-deck-mapping.md).

### 3.4 Random practice dan progress

1. Practice hub membuat sesi default **5** soal dari learner profile, weak skills, hasil flashcard/practice, dan understanding lesson.
2. Komposisi acuan: **60% weak**, **30% reinforcement**, **10% stretch**. Tipe soal yang didukung: `SHORT_FREE_RESPONSE`, `SLOT_FILL`, `ARRANGE_TOKEN`, `FREE_RESPONSE`. Jika recommendation tidak menyuplai tipe yang valid, fallback adalah `SHORT_FREE_RESPONSE`.
3. Soal yang bisa diperiksa dengan aturan deterministik dinilai oleh rules. `FREE_RESPONSE` memakai AI grading sesuai kontrak. Input romaji pada tipe yang relevan ditransform ke kana sebelum submit final.
4. Setelah setiap jawaban flashcard, random practice, atau quiz lesson, event dan snapshot ditulis segera; UI menampilkan feedback serta nilai terbaru melalui response dan revalidation. Realtime pada MVP berarti **write-through per interaksi**, bukan websocket.
5. Progress page menampilkan mastery, understanding/completion lesson, weak skills, sesi terbaru, timeline, dan CTA untuk langkah belajar berikutnya.

**Kriteria penerimaan:** jawaban tidak diam diam hanya mengubah state UI; event tersimpan, snapshot dapat dibaca ulang, dan rekomendasi sesi berikutnya memakai state terbaru. Rujukan: [Practice API](docs/api-contract/practice.md), [Progress API](docs/api-contract/progress.md), [progress sequence](docs/sequence-diagram/update-progress-snapshot.md).

## 4. Aturan produk dan data

- `syllabus` adalah sumber skill dan struktur kurikulum. `progress` memiliki learning events serta snapshot. `personalization` menghitung rekomendasi dari profile, syllabus, dan progress; `practice` membentuk serta menilai sesi. Producer aktivitas menulis progress melalui port/use case, bukan langsung ke tabel context lain. Lihat [architecture foundation](docs/architecture-foundation.md).
- Mastery skill memakai maksimal **20 attempt terakhir** dengan bobot **accuracy 70%**, **recency 20%**, **speed/confidence proxy 10%**. Difficulty naik saat mastery `>= 80` selama dua sesi dan turun/remediate saat `<= 50` selama dua sesi. Detail perhitungan tetap harus diuji di `TEST-01`. Lihat [MVP plan](docs/mvp-plan.md) dan [learning activity ERD](docs/erd/learning-activity.md).
- Bank post-study milik `syllabus`, sedangkan pemilihan dan grading direct quiz milik `practice`. `lesson_understanding_snapshots` adalah sumber level lesson; `skill_mastery_snapshots` tetap sumber mastery skill.
- Published catalog hanya menampilkan N5/N4 pada seed awal. N3/N2 disimpan sebagai shell dengan `isPublished=false`. Source eksternal dinormalisasi dan dikurasi sebelum menjadi seed; provenance tidak boleh hilang. Lihat [syllabus ingestion](docs/syllabus/source-of-truth-and-ingestion-plan.md).
- API publik memakai prefix `/api/v1`, session cookie, response envelope `status`/`data`, serta metadata pagination untuk list. Nama endpoint lama tanpa `/v1` dalam [MVP plan](docs/mvp-plan.md) adalah ringkasan awal; implementasi mengikuti [API base](docs/api-contract/README.md) dan kontrak feature yang lebih rinci.
- AI memakai provider abstraction dengan structured output, schema validation, request observability, dan default adapter OpenAI saat implementasi. AI dipakai hanya untuk kebutuhan yang ditentukan kontrak; canonical post-study bank serta grading objective tetap deterministik. Lihat [MVP plan](docs/mvp-plan.md) dan [AI observability ERD](docs/erd/ai-support-and-observability.md).

## 5. Navigasi dan surface

Public: `/`, `/login`. Onboarding: `/onboarding`. Area belajar: `/dashboard`, `/syllabus`, detail unit/lesson, `/flashcards`, `/practice`, `/progress`, `/settings`. Quiz lesson memiliki route `/syllabus/lessons/[lessonSlug]/post-study`; sesi flashcard dan practice memiliki route sesi dan summary masing masing. Rujukan lengkap: [information architecture](docs/system-design/information-architecture-and-page-inventory.md).

Mobile/tablet memakai topbar dan bottom nav lima tujuan utama. Desktop mulai `1024px` memakai sidebar dan topbar. Onboarding memiliki shell sendiri; sesi aktif flashcard/practice memakai focus mode. Spesifikasi UI ada di [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

## 6. Kebutuhan kualitas dan penerimaan rilis

| Area | Kriteria |
| --- | --- |
| Data dan akses | Semua endpoint terlindungi sesuai state `ANONYMOUS`, `ONBOARDING_REQUIRED`, `APP_READY`; update event dan snapshot konsisten setelah jawaban. |
| Integritas belajar | Tidak ada lesson completed tanpa jawaban post-study benar; soal quiz berasal dari bank lesson dan difficulty yang cocok; attribution skill berasal dari katalog. |
| AI | Output provider lolos schema validation; kegagalan tercatat dengan trace/request id, model, latency, usage, retry, dan failure reason; objective grading tetap berjalan tanpa AI. |
| Pengalaman | Flow inti dapat dipakai mobile dan desktop, state loading/error/empty/feedback jelas, interaksi keyboard dan target sentuh mengikuti design system. |
| Engineering | Bun, TypeScript strict, lint/format/typecheck, MySQL migration/env validation, Docker, dan baseline CI mengikuti [MVP plan](docs/mvp-plan.md). FE menggunakan MobX + mobx-react-lite, container Inversify, dan MSW untuk mock API pada development/testing sesuai [ARCHITECTURE.md](ARCHITECTURE.md). |
| Verifikasi | Unit test aturan mastery, Leitner, evaluator deterministik, parser AI, dan normalizer; component test flow kritikal; integration test endpoint jawaban serta progress overview; Playwright E2E smoke untuk journey inti sesuai `TEST-01`–`TEST-11` di [task breakdown](docs/task-breakdown.md). |

Belum ada target angka untuk retensi, completion rate, latency, atau AI cost per learner yang dikunci di repo. Jangan memperlakukan angka eksperimen sebagai acceptance gate resmi tanpa keputusan produk baru.

## 7. Urutan implementasi dan prasyarat yang masih perlu diselaraskan

Ikuti urutan `IMP-01`–`IMP-17` dan ketentuan bahwa backend/database setiap fitur selesai sebelum UI fiturnya di [task breakdown](docs/task-breakdown.md). Task bootstrap dapat memakai dokumen ini sebagai handoff. Sebelum implementasi area terkait, selesaikan atau dokumentasikan keputusan berikut:

1. **`SYL-07` masih `[ ]`.** Review alignment syllabus terhadap personalization dan mastery tracking belum ditandai selesai.
2. **Bank quiz seed belum memenuhi kontrak published lesson.** Pada snapshot repo saat PRD dibuat, ada **82** lesson published (42 N5, 40 N4); **16** lesson memiliki sepuluh `postStudyQuestions`, sedangkan **66** lesson belum memiliki bank. Requirement published lesson pada [seed schema](docs/syllabus/seed-content-schema.md) dan [Practice API](docs/api-contract/practice.md) meminta bank `1..10`. Lengkapi/kurasi seed atau selaraskan publish gate sebelum `IMP-05`, `IMP-09`, dan UI lesson/quiz `IMP-13`/`IMP-15` mengandalkan seluruh katalog published.
3. **Copy seed perlu ditinjau terhadap bahasa UI English.** Beberapa `description`, `learningObjective`, dan blok materi pada [seed track](content/syllabus/tracks/) masih berbahasa Indonesia. Tentukan translasi konten yang tampil pada UI sebelum `IMP-13`; jangan mengubah bahasa UI berdasarkan copy seed yang belum dirapikan.

## 8. Peta referensi implementasi

- Scope dan task: [task breakdown](docs/task-breakdown.md), [MVP plan](docs/mvp-plan.md).
- Struktur folder BE/FE, store, dan DI: [ARCHITECTURE.md](ARCHITECTURE.md). Batas module serta alur bisnis: [architecture foundation](docs/architecture-foundation.md).
- Persistence: [auth/user ERD](docs/erd/auth-and-user-profile.md), [syllabus ERD](docs/erd/syllabus-domain.md), [learning activity ERD](docs/erd/learning-activity.md), [AI observability ERD](docs/erd/ai-support-and-observability.md).
- Kontrak transport: [API base](docs/api-contract/README.md) dan file naratif/OpenAPI per context di [docs/api-contract/](docs/api-contract/).
- Content: [syllabus README](docs/syllabus/README.md), [seed schema](docs/syllabus/seed-content-schema.md), [deck mapping](docs/syllabus/flashcard-deck-mapping.md), [published seed](content/syllabus/manifest.json).
- UI: [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) dan dokumen rinci di [docs/system-design/](docs/system-design/).
