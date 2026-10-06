# KotobaHub Architecture Foundation

## Scope
- Dokumen ini mengunci hasil task `ARCH-01`, `ARCH-02`, dan `ARCH-03`.
- Fokusnya adalah tiga hal: bounded context final untuk modular monolith `KotobaHub`, struktur folder final yang cocok untuk Next.js App Router, dan alur data utama antar module.
- Ownership dan alur bisnis mengikuti dokumen ini; struktur folder serta frontend store/DI mengikuti [ARCHITECTURE.md](../ARCHITECTURE.md).

## Decision Summary
- KotobaHub tetap dibuat sebagai satu aplikasi Next.js fullstack, bukan monorepo.
- App Router tetap tinggal di `src/app` sebagai lapisan routing, layout, dan transport adapter tipis.
- Backend dipisahkan ke `src/backend` dengan struktur per bounded context dan layering `domain -> application -> interface -> infrastructure`.
- Frontend dipisahkan ke `src/frontend` dengan folder `shared` sejajar domain-specific; store memakai MobX dan dependency injection memakai Inversify sesuai [ARCHITECTURE.md](../ARCHITECTURE.md).
- Cross-cutting code tidak ditaruh di satu folder umum besar; gunakan `src/backend/shared` untuk common kernel backend dan `src/frontend/shared` untuk shared UI/application client concerns.
- Alur bisnis utama dikunci sebagai `syllabus -> progress -> personalization -> practice`, dengan `flashcards` sebagai activity producer paralel yang juga memberi input ke `progress`.

## ARCH-01 Final Bounded Contexts

### Final Context List
1. `auth`
2. `users`
3. `syllabus`
4. `flashcards`
5. `practice`
6. `progress`
7. `personalization`
8. `shared`

### Context Responsibilities

| Context | Tanggung jawab utama | Data / aggregate yang dimiliki |
| --- | --- | --- |
| `auth` | Login Google, session, account linking, auth guard integration | `accounts`, `sessions`, auth metadata |
| `users` | User profile, learner profile persistence, settings, preference dasar user | `users`, `learner_profiles` |
| `syllabus` | Kurikulum `track -> unit -> lesson -> skill`, mapping skill antar level | `tracks`, `units`, `lessons`, `skills`, `unit_skill_mappings` |
| `flashcards` | Deck, card session, Leitner bucket, answer evaluation yang deterministik | `flashcard_decks`, `flashcard_items`, flashcard sessions |
| `practice` | Session random questions, komposisi soal, grading orchestration, feedback | `practice_sessions`, `practice_questions`, `practice_answers` |
| `progress` | Event belajar, mastery snapshot, overview/timeline progress | `progress_events`, `skill_mastery_snapshots` |
| `personalization` | Onboarding assessment, AI normalization, recommendation policy, learner adaptation rules | assessment models, recommendation policy, optional assessment logs |
| `shared` | Shared kernel dan technical abstractions lintas module | base error/result, ids, time abstractions, pagination, observability contracts |

### Boundary Rules
- `auth` hanya mengurus authentication dan session lifecycle. Ia boleh memicu provisioning user, tetapi tidak memiliki rule bisnis learner profile.
- `users` adalah pemilik data profile. `personalization` boleh menghitung rekomendasi atau normalized assessment, tetapi penyimpanan profile final tetap lewat use case di `users`.
- `syllabus` adalah source of truth untuk struktur `track -> unit -> lesson -> skill`. Module lain hanya membaca katalog ini, bukan mengubahnya langsung.
- `flashcards` dan `practice` adalah producer aktivitas belajar. Keduanya tidak boleh menyimpan mastery langsung ke tabel milik `progress`; mereka menulis lewat port/use case `progress`.
- `progress` adalah source of truth untuk state perkembangan belajar. Ia menerima event dari `flashcards`, `practice`, dan direct lesson post-study quiz, lalu menghasilkan snapshot yang dibaca modul lain.
- `personalization` membaca `users`, `syllabus`, dan `progress` untuk menyesuaikan rekomendasi, tetapi tidak boleh mengambil alih ownership data dari ketiga context itu.
- `shared` diperlakukan sebagai common kernel, bukan dumping ground. Jika logic hanya relevan untuk satu context, logic itu harus tetap tinggal di context tersebut.

### Allowed Dependency Direction
- `auth -> users -> shared`
- `syllabus -> shared`
- `progress -> syllabus, users, shared`
- `flashcards -> syllabus, progress, shared`
- `practice -> syllabus, progress, personalization, shared`
- `personalization -> users, syllabus, progress, shared`

### Implementation Rules For Cross-Module Calls
- Akses lintas module harus lewat `application` port/facade atau domain event, bukan import langsung ke repository implementation module lain.
- Tidak ada module yang boleh mengakses tabel module lain secara langsung dari adapter persistence-nya.
- Jika butuh read model lintas context, sediakan query port atau dedicated read service di module pemilik data.
- Relasi utama `syllabus -> progress -> personalization -> practice` dikunci sebagai arah bisnis utama dan dirinci di section `ARCH-03` di bawah.

## ARCH-02 Final Folder Structure

- Struktur folder final BE dan FE, tanggung jawab setiap layer, serta contoh penempatan kode ditetapkan di [ARCHITECTURE.md](../ARCHITECTURE.md).
- Frontend menggunakan MobX untuk store dan Inversify untuk dependency injection. Interface, external API service, internal store, container, provider, dan hook mengikuti template pada dokumen tersebut.
- `src/app` tetap lapisan route/transport tipis, `src/backend` memuat bounded context, dan `src/frontend` memuat domain UI serta `shared`.
- Canonical seed tetap berada di root `content/`; loader/importer berada di backend.
- Dokumen ini tetap menjadi sumber ownership bounded context dan alur bisnis pada `ARCH-01` serta `ARCH-03`. Definisi folder, store, dan DI mengikuti `ARCHITECTURE.md`.

## ARCH-03 Main Data Flow

### Ownership Summary
- `syllabus` memiliki katalog konten dan definisi skill.
- `progress` memiliki fakta perkembangan belajar hasil interaksi user.
- `personalization` memiliki policy untuk menerjemahkan profile + progress menjadi rekomendasi belajar.
- `practice` memiliki orchestration sesi latihan dan grading flow.
- `flashcards` tetap berada di luar rantai utama ini, tetapi menulis event ke `progress` dengan pola ownership yang sama seperti `practice`.

### Syllabus Source Of Truth Terms

Istilah `track -> unit -> lesson -> skill` adalah model konten inti KotobaHub. Artinya bukan sekadar struktur halaman, tetapi struktur kurikulum yang menjadi referensi resmi untuk navigation, progress attribution, personalization, dan practice generation.

| Term | Arti di KotobaHub | Ukuran scope | Contoh |
| --- | --- | --- | --- |
| `track` | Jalur belajar besar yang mewakili satu ladder atau fase utama belajar | Paling besar | `jlpt-n5-foundation`, `jlpt-n4-expansion` |
| `unit` | Kelompok materi dalam satu track yang menyatukan tema/topik belajar | Menengah | `n5-kana-and-sound-system`, `n5-core-particles` |
| `lesson` | Sesi belajar yang lebih kecil dan fokus, biasanya satu objective pembelajaran yang jelas | Lebih kecil | `hiragana-basics`, `particles-wa-ga-o` |
| `skill` | Kemampuan atomik yang bisa diukur mastery-nya oleh sistem | Paling kecil | `hiragana_basic`, `katakana_loanwords`, `n5_particles_wa_ga_o`, `n4_past_plain_form` |

### Relationship Between The Terms
- Satu `track` berisi banyak `unit`.
- Satu `unit` berisi banyak `lesson`.
- Satu `lesson` menargetkan satu atau lebih `skill`.
- `skill` adalah level terkecil yang benar-benar di-track oleh `progress` dan dipakai oleh `personalization`.
- Unit dan lesson boleh menampilkan ringkasan progress, tetapi ringkasan itu selalu diturunkan dari mastery per `skill`, bukan disimpan sebagai source of truth terpisah.

### Example Syllabus Tree

```text
track: jlpt-n5-foundation
  unit: n5-kana-and-sound-system
    lesson: hiragana-basics
      skill: hiragana_basic
    lesson: katakana-loanwords
      skill: katakana_loanwords
  unit: n5-core-grammar
    lesson: particles-wa-ga-o
      skill: n5_particles_wa_ga_o

track: jlpt-n4-expansion
  unit: n4-verb-forms
    lesson: plain-past-form
      skill: n4_past_plain_form
```

### Why `syllabus` Is The Source Of Truth
- `syllabus` menentukan skill apa saja yang valid. Module lain tidak boleh menciptakan `skill_id` sendiri.
- `syllabus` menentukan skill mana yang berada di lesson, unit, dan track mana, sehingga attribution progress selalu konsisten.
- `syllabus` juga menjadi referensi untuk metadata seperti level JLPT, urutan belajar, prerequisite, dan activity support seperti apakah suatu skill cocok untuk flashcard, practice objective, atau free-response.

### End-To-End Flow

| Step | Producer | Main output | Primary consumer | Purpose |
| --- | --- | --- | --- | --- |
| 1 | `syllabus` | Catalog `track/unit/lesson/skill` + metadata | `progress`, `personalization`, `practice`, `flashcards` | Memberi struktur resmi materi dan daftar skill valid |
| 2 | `flashcards` / `practice` / lesson `post-study quiz` | Jawaban user dan hasil evaluasi per skill/lesson | `progress` | Menghasilkan fakta belajar mentah dalam bentuk event |
| 3 | `progress` | `progress_events`, `skill_mastery_snapshots`, `lesson_understanding_snapshots`, rollup lesson/unit/track | `personalization`, `practice`, UI progress | Mengubah event mentah menjadi state perkembangan yang stabil |
| 4 | `personalization` | Recommendation spec, weak-skill focus, difficulty band, next-best lesson/unit hints | `practice`, onboarding/dashboard UI | Menentukan adaptasi belajar berdasar profile dan mastery terbaru |
| 5 | `practice` | Random practice session dari recommendation atau direct post-study quiz question dari bank syllabus | User, lalu kembali ke `progress` | Menyajikan soal yang relevan, baik sebagai random practice maupun `post-study quiz` lesson, lalu menulis feedback loop baru |

### Main Handoffs Between Modules

#### `syllabus -> progress`
- `progress` membaca `skill_id`, mapping `skill -> lesson -> unit -> track`, dan metadata level agar setiap `progress_event` bisa diatribusikan dengan benar.
- Jika ada answer untuk skill yang tidak dikenal oleh `syllabus`, event harus dianggap invalid.
- `progress` boleh membuat agregasi lesson/unit/track, tetapi agregasi itu selalu hasil turunan dari katalog `syllabus`.

#### `progress -> personalization`
- `personalization` membaca mastery snapshot per skill, lesson understanding level `0-10`, recent mistakes, weak skills, completed skills, dan tanda stagnasi.
- Input ini digabung dengan data dari `users`, misalnya target JLPT, daily goal, dan preferensi learner.
- Hasilnya bukan update mastery baru, melainkan policy output seperti prioritas remedial, reinforcement, atau stretch.

#### `personalization -> practice`
- `practice` menerima recommendation spec seperti `target_skill_ids`, `difficulty_band`, `question_mix`, `allowed_question_types`, dan candidate lesson/unit.
- Jika recommendation spec tidak menyuplai `allowed_question_types` atau hasilnya kosong, `practice` memakai fallback default `SHORT_FREE_RESPONSE` untuk random practice session.
- Untuk lesson `post-study quiz`, `practice` tidak membuat `practice_session` dan tidak meminta komposisi soal dari `personalization`; ia memilih tepat `1` soal `SHORT_FREE_RESPONSE` dari bank soal lesson resmi di `syllabus`. Difficulty yang dipilih adalah `current_understanding_level + 1`, dibatasi maksimum `10`.
- `practice` tetap membaca `syllabus` untuk memastikan soal hanya diambil dari skill dan lesson yang sah.
- `practice` boleh membaca `progress` juga untuk guard tambahan yang sifatnya near-realtime, misalnya menghindari skill yang baru saja ditanya beberapa menit lalu.

#### `practice -> progress`
- Setelah jawaban dinilai, `practice` menulis structured event ke `progress`, bukan mengubah mastery snapshot secara langsung.
- Payload minimal perlu mengandung `user_id`, `skill_id`, `session_id`, `question_type`, `score/is_correct`, `answered_at`, dan metadata yang relevan untuk mastery calculation.
- Jika event berasal dari lesson `post-study quiz`, metadata handoff juga perlu menjaga relasi ke lesson source, question template, difficulty ladder question, dan `understanding_level_before/after` agar `progress` bisa meng-upsert `lesson_understanding_snapshots`.
- `progress` lalu menghitung ulang `skill_mastery_snapshot` dan menyediakan state baru untuk loop berikutnya.

### Practical Rule For Future Implementation
- Jika pertanyaannya adalah "apa yang sedang dipelajari user?", baca `syllabus`.
- Jika pertanyaannya adalah "seberapa baik user menguasainya?", baca `progress`.
- Jika pertanyaannya adalah "apa yang sebaiknya dipelajari berikutnya?", baca `personalization`.
- Jika pertanyaannya adalah "bagaimana sesi soal dibentuk dan dinilai?", lihat `practice`.

## Result
- `ARCH-01` dianggap selesai dengan daftar bounded context dan boundary rule di dokumen ini.
- `ARCH-02` mengacu pada struktur folder final, frontend store, dan DI di [ARCHITECTURE.md](../ARCHITECTURE.md).
- `ARCH-03` dianggap selesai dengan definisi source of truth syllabus dan alur data utama antar module, terutama relasi `syllabus -> progress -> personalization -> practice`.
- Task implementasi berikutnya bisa memakai dokumen ini sebagai baseline untuk bootstrap project di `IMP-01`.
