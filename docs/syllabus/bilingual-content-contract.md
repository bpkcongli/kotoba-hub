# Kontrak Konten Bilingual — BIL-01

Status: **final untuk implementasi BIL-02/BIL-03**, 4 November 2026. Runtime, seed aktif, dan migration saat ini masih v1; dokumen ini menetapkan target. [Rencana tahap](./bilingual-support-plan.md) tetap menjadi acuan scope.

## 1. Artefak dan batch awal

| Artefak                                                                                                               | Kontrak                                                                                                             |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [Manifest v2](./schema/seed-manifest.v2.schema.json)                                                                  | `schemaVersion=2.0.0`, `defaultLocale=en`, `supportedLocales=[en,id]`, `importMode=MERGE_LESSONS`                   |
| [Track v2](./schema/track-seed.v2.schema.json)                                                                        | Struktur canonical + `localizations.en` / `.id`; schema v1 tetap terpisah                                           |
| [Contoh manifest](./examples/bilingual-manifest.v2.example.json), [track](./examples/bilingual-track.v2.example.json) | Fixture dokumentasi dengan ID contoh, seluruh owner unpublished dan satu soal draft; bukan input seed production    |
| [Allowlist batch 01](./bilingual-batch-01.json)                                                                       | **16 lesson N5**, ID/slug lesson dan parent, ID skill/block/soal, checksum file sumber, serta masalah atribusi awal |

- `BIL-02` menulis `content/syllabus/v2/manifest.json` dan `content/syllabus/v2/tracks/*.json` berdasarkan allowlist. Folder itu belum dibaca runtime secara otomatis. File v1 pada `content/syllabus/manifest.json` dan `tracks/` tetap menjadi input aktif hingga `BIL-03`.
- Allowlist mengunci identitas 16 lesson yang memiliki materi dan sepuluh soal pada snapshot v1: **9 importable, 7 membutuhkan perbaikan atribusi skill**. Paragraf pengantar lesson lain tidak termasuk batch. Perubahan checksum sumber wajib menghasilkan laporan diff sebelum konversi; jangan memperluas allowlist otomatis.
- UUID, slug, kode skill, urutan, prerequisite, dan ID soal dipertahankan. Jangan menambah kode bundle palsu untuk mengatasi atribusi; petakan setiap soal ke skill atomik yang benar dalam lesson pada `BIL-02`. Jika tidak ada skill yang sesuai, tahan publikasi dan laporkan.
- Versi schema hanya menunjukkan bentuk data. `contentRevision` menunjukkan revisi materi owner; keduanya terpisah dari API `/api/v1`, `promptPayload.schemaVersion=1`, dan urutan migration DB.

## 2. Pemisahan canonical dan terjemahan

Setiap track, unit, lesson, skill, block, dan soal memiliki `contentRevision` integer positif. Teks lokal berada di `localizations`; `en` wajib, `id` opsional pada tahap authoring. Setiap localization wajib memiliki `sourceRevision`, `translationRevision` positif, `isPublished`, dan `sourceRefs` nonkosong. Provenance konten asli dan provenance penulisan/terjemahan disimpan terpisah; terjemahan internal memakai `KOTOBAHUB_INTERNAL`.

| Owner               | Canonical                                                         | Isi localization per bahasa                                                      |
| ------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Track/unit          | ID, parent, level, urutan, publication                            | `title`, `description` nullable                                                  |
| Lesson              | Identitas, durasi, publication, subtree                           | `title`, `learningObjective`                                                     |
| Skill               | Jenis/support flags, prerequisite, `content` Jepang/lexical       | `title`, `description` nullable, `content` localized                             |
| `PARAGRAPH`         | `content: {}`                                                     | `title` nullable, `body` HTML                                                    |
| `EXAMPLE_SENTENCE`  | `content.japaneseSentence` HTML                                   | `translation` HTML                                                               |
| `GRAMMAR_STRUCTURE` | `content.skillCode`                                               | `ALL`, `STANDARD`, `POLITE`, masing-masing HTML atau null; minimal satu nonblank |
| Quiz                | Skill, difficulty, prompt Jepang, input method, kunci, provenance | `placeholder` nullable, `hintTexts` array HTML, `explanation` HTML nullable      |

Nama lama dipetakan sebagai berikut; field v1 tersebut tidak diterima dalam payload v2:

| Field v1                                                  | Target v2                                                                                  |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Judul/deskripsi/objective                                 | Field setara pada `localizations[locale]`                                                  |
| `englishTranslation`                                      | Block `localizations.en.translation`                                                       |
| `content.kanji.meaningsEn`                                | Skill `localizations.en.content.kanji.meanings`                                            |
| `content.vocabulary.glossesEn`                            | Skill `localizations.en.content.vocabulary.glosses`                                        |
| `content.grammar.meaning`                                 | Skill `localizations[locale].content.grammar.meaning` sesuai audit bahasa                  |
| Reading `title`, `translationEn`                          | Skill `localizations[locale].content.reading.title` / `.translation`                       |
| Reading `comprehensionChecks[].prompt/expectedAnswerEn`   | Check lokal `{id,prompt,expectedAnswer}`; canonical menyimpan `{id,sortOrder}`             |
| `exampleSentences[].englishText`                          | Skill localization `content.exampleSentences[]` berisi `{provider,sentenceId,translation}` |
| Quiz `promptPayload.placeholder/hintTexts`, `explanation` | Field setara pada localization soal                                                        |

- `skill.content` canonical mempertahankan kana, kanji literal/readings, vocabulary spelling/readings/POS/tags/frequency, grammar pattern/register/structure/source refs, reading passage/focus/target codes, serta kalimat Jepang/provenance contoh. Label source seperti POS/register bukan teks bantuan; terjemahan label aplikasi masuk kamus i18n.
- ID check reading ditetapkan deterministik sekali pada konversi dan dipertahankan saat reorder; key pasangan contoh adalah `(provider,sentenceId)`. Localization wajib mencakup tepat set check/contoh canonical yang ada. Bagian `content` lokal harus sesuai family skill; KANA boleh `{}`. Schema memvalidasi shape, importer memvalidasi kesesuaian dan referensi.
- Audit bahasa per field v1, termasuk objective yang sudah Indonesia. Jangan memindahkan seluruh v1 ke `en` tanpa pemeriksaan. Lengkapi Inggris lalu Indonesia dengan makna setara; kalimat Jepang, blank, rumus, dan jawaban tidak diterjemahkan.

## 3. Revisi, publication, dan fallback

- Owner canonical memiliki `isPublished`; setiap localization memiliki flag tersendiri. Localization layak dibaca bila **owner/ancestor published, localization published, dan `sourceRevision == owner.contentRevision`**. Stale adalah kondisi turunan, bukan locale atau status publikasi baru.
- Perubahan Jepang/kunci/atribusi atau isi Inggris yang memengaruhi pemahaman menaikkan `contentRevision` owner. Perubahan bahasa Indonesia saja menaikkan `translationRevision` Indonesia; `sourceRevision` baru boleh disamakan setelah review kesetaraan. Penyuntingan HTML presentasional tetap menaikkan `translationRevision`. Revisi tidak boleh mundur; payload berbeda dengan revision sama ditolak saat import.
- Saat Inggris direvisi, localization Inggris harus direview untuk revisi baru dan Indonesia lama menjadi stale. Tidak menandai ulang Indonesia published otomatis. `sourceRevision` yang melampaui revisi owner ditolak. Fingerprint revisi mencakup isi canonical/teks/provenance, tidak mencakup audit timestamp, flag publikasi atau sortOrder. Perubahan owner tidak otomatis menaikkan revisi semua ancestor; importer tetap memeriksa seluruh dependensi subtree dan bank soal.
- Resolver konten: parameter `contentLocale` valid → preferensi `contentLocale` tersimpan → `en`. Nilai kosong, berulang, `in`, `id-ID`, `ja`, atau unsupported ditolak `422`; HTTP `Accept-Language` tidak menimpa pilihan ini.
- Fallback per paket: localization requested yang layak → Inggris yang layak. Paket adalah seluruh metadata satu owner, seluruh block, atau seluruh placeholder/hint/explanation soal. Tidak melakukan deep merge antarbahasa; `null`/array kosong yang memang valid tidak memicu fallback per field.
- `localization` pada setiap object terlokalisasi berisi `{requestedLocale,resolvedLocale,isFallback,contentRevision,translationRevision}`. Parent dan block boleh resolve berbeda, dan response menandainya per object. Kalimat Jepang diberi `lang=ja`; bahasa bantuan memakai resolved locale.
- Publikasi lesson v2 mensyaratkan Inggris yang layak untuk metadata lesson, parent, skill published, block published, dan seluruh sepuluh soal. Draft/stale Inggris pada konten wajib menahan batch import secara atomik. Indonesia draft/stale boleh disimpan dan fallback ke Inggris, tetapi acceptance batch `BIL-02` mensyaratkan kedua bahasa lengkap/current.
- Publication tetap memerlukan bank tepat 10 soal `SHORT_FREE_RESPONSE` dengan ladder unik `1..10`, attribution skill published dalam lesson, satu blank plain/HTML yang setara, jawaban kana dan normalisasi `kana-strict-v1`. Terjemahan tidak menambah bank kedua atau mengubah target understanding `min(current+1,10)`.

## 4. Schema database target

Tambahan persistence ini dikerjakan pada `BIL-03`, melalui Drizzle/migration baru setelah ERD diselaraskan. Tidak menjalankan migration pada `BIL-01`.

| Tabel owner                                                                                    | Tambahan canonical                                                                                    |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `tracks`, `units`, `lessons`, `skills`, `lesson_content_blocks`, `lesson_post_study_questions` | `content_revision int not null default 1`, `seed_schema_version varchar(10) not null default '1.0.0'` |
| `skills`                                                                                       | `content json null` selama backfill; wajib valid untuk row v2, berisi payload canonical skill         |

Setiap tabel terjemahan di bawah memiliki PK composite `(owner FK, locale)`, `locale varchar(2)` CHECK `en/id`, `source_revision int`, `translation_revision int`, `is_published boolean default false`, `source_ref_payload json`, `created_at`/`updated_at`. Revisi positif; source refs wajib nonkosong di validator. Foreign key memakai RESTRICT; tidak menghapus histori belajar.

| Tabel                                     | FK owner                                       | Payload terjemahan                                                           |
| ----------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `track_translations`                      | `track_id → tracks.id`                         | `title varchar(255)`, `description text null`                                |
| `unit_translations`                       | `unit_id → units.id`                           | `title`, `description`                                                       |
| `lesson_translations`                     | `lesson_id → lessons.id`                       | `title`, `learning_objective text`                                           |
| `skill_translations`                      | `skill_id → skills.id`                         | `title`, `description`, `content json` localized, termasuk arti/check/contoh |
| `lesson_content_block_translations`       | `content_block_id → lesson_content_blocks.id`  | `content json` sesuai jenis block                                            |
| `lesson_post_study_question_translations` | `question_id → lesson_post_study_questions.id` | `content json` berupa paket placeholder/hint/explanation                     |

Semua tabel ini dimiliki `syllabus`. JSON tervalidasi pada importer/aplikasi; FK dan PK composite ditegakkan DB. Tambahkan index `(locale,is_published)` per tabel; resolusi current memeriksa revisi owner, bukan flag saja. [ERD syllabus](../erd/syllabus-domain.md) mencatat perluasan ini.

Untuk row v2, translation table adalah sumber teks utama. Kolom lama title/description/objective/explanation serta JSON block/prompt lama menjadi **proyeksi Inggris untuk kompatibilitas**, diperbarui oleh importer yang sama, bukan jalur editing kedua. `lesson_content_blocks.content` dan `lesson_post_study_questions.prompt_payload` mempertahankan shape v1 selama transisi (termasuk teks Inggris) agar app lama dapat rollback; pembaca bilingual mengambil hanya bagian canonical yang diizinkan dan menggabungkannya dengan satu localization.

Backfill row v1 harus mengaudit bahasa sebelum membuat localization. Payload yang belum diaudit tidak boleh diiklankan sebagai Inggris current. Row v1 di luar batch tetap tersedia pada representasi legacy; representasi localized baru mengekspos subtree v2 yang valid. Hitungan/pagination/onboarding localized menggunakan katalog yang sama tersebut. Katalog tidak dipersempit hanya karena locale `id` belum tersedia.

## 5. Preferensi user dan i18n

- Tambahkan `user_preferences` milik `users`: `user_id char(36)` PK/FK users, `content_locale varchar(2) not null default 'en'`, `ui_locale varchar(2) not null default 'en'`, audit timestamps; CHECK kedua locale `en/id`. Row opsional, GET mengembalikan default jika belum ada. Tabel terpisah memungkinkan penyimpanan sebelum `learner_profiles` dibuat.
- Endpoint baru GET/PATCH `/api/v1/user-profile/preferences`: session valid cukup, tanpa syarat onboarding. PATCH partial nonkosong, hanya `contentLocale`/`uiLocale`, menolak null/unknown/invalid; same-origin diperiksa sebelum session. Mengubah locale tidak mengubah onboarding, placement, mastery, atau timezone.
- UI sebelum login memakai cookie `kotobahub-ui-locale` (`en/id` saja; Secure pada HTTPS, SameSite=Lax, Path=/). Setelah login, preferensi tersimpan menang atas cookie; tanpa row preference, default tetap Inggris. Pemilih bahasa menyimpan preferensi secara eksplisit. SSR dan client bootstrap memakai hasil resolusi yang sama; request locale lama dibatalkan/diabaikan dan cache/key mencakup user, format, locale.
- `uiLocale` mengatur pesan UI/API; `contentLocale` mengatur materi/bantuan; `promptLanguage`/`answerLanguage` tetap kode domain `JA/EN` pada kontrak lama. Dukungan pasangan Indonesia pada random practice difinalkan `BIL-06`, tidak ditambahkan ke quiz canonical Jepang. `preferredScript` dan timezone tetap independen.
- Katalog pesan i18n UI/API dan pemilihan library ditangani `BIL-07`; key/code domain, field error, status HTTP, trace ID dan log operasional tetap stabil. [ERD users](../erd/auth-and-user-profile.md) dan [kontrak API bilingual](../api-contract/bilingual.md) menjadi acuan preferensi.

## 6. Transisi importer dan API

- Importer v2 menerima manifest eksplisit `content/syllabus/v2/manifest.json`; semua file pada manifest itu wajib `2.0.0`. Versi lain ditolak; tidak menebak versi dari shape, tidak mencampur payload v1/v2 dalam satu manifest. JSON Schema v1 lama tetap digunakan pada jalur v1.
- `MERGE_LESSONS` meng-upsert tepat lesson pada `tracks[].lessonIds`, parent metadata/localization, dan subtree lengkap lesson tersebut. Set ID lesson pada payload harus sama persis dengan manifest; duplikasi/path traversal/identity conflict/revision mundur ditolak. Urutan dalam batch memakai nomor asli, bukan dinomori ulang.
- Seluruh batch divalidasi sebelum transaksi. Invalid candidate membatalkan batch; jangan diam-diam skip kandidat sehingga operasi sukses semu. Tidak menonaktifkan track/unit/lesson/skill/block/mapping di luar scope. Di dalam lesson, row yang dihapus dari payload ditandai unpublished sesuai rekonsiliasi, tidak dihapus fisik; bank canonical wajib lengkap.
- Setelah row memiliki `seed_schema_version=2.0.0`, importer v1 menolak operasi yang akan menimpa/menonaktifkannya. `BIL-03` harus memasang guard ini sebelum v2 diaktifkan; importer v1 saat ini belum memilikinya. Reseed v2 identik adalah no-op secara isi/revisi.
- API `/api/v1` memakai **`contentFormat=localized`** sebagai opt-in di query syllabus dan body direct quiz. Tanpa `contentFormat`, response mempertahankan shape v1 dan proyeksi Inggris, tanpa mengikuti preferensi. Nilai format selain `localized` ditolak; `contentLocale` hanya diterima bersama `localized`, kombinasi lain `422`. Field example pada localized bernama `translation`; legacy tetap `englishTranslation`.
- Response localized tidak pernah mengirim localization draft, seluruh map bahasa, atau kunci quiz. Kontrak future-ready beserta guard, code, dan DTO ada di [OpenAPI bilingual](../api-contract/openapi.bilingual.yaml). File OpenAPI lama mendeskripsikan representasi legacy sampai consumer dipindahkan bersama `BIL-03`.
- Rollout: migration additive + backfill terverifikasi → importer/reader kompatibel → dry-run dan merge batch → FE opt-in → evaluasi. App dan ops memakai release yang sama. Rollback app memakai proyeksi Inggris dan data/snapshot tersimpan; **jangan menjalankan reseed v1 atau down migration** sebagai rollback. Penghapusan legacy menunggu `BIL-08`.
- Sebelum FE beralih ke localized, seluruh lesson yang sudah published pada DB harus tersedia sebagai subtree v2 yang valid, termasuk tujuan rekomendasi dan referensi progress. Jika ada di luar batch, tampilkan daftar blocker dan pertahankan UI legacy; jangan menghilangkannya diam-diam. Snapshot baseline memiliki 9 lesson published-eligible yang seluruhnya termasuk allowlist 16, tetapi gate ini wajib diperiksa terhadap DB tujuan.

## 7. Direct quiz: bahasa yang konsisten sampai retry

- Mode localized pada `/practice/lesson-post-study/next` menyimpan delivery milik user berisi snapshot soal Jepang, kunci server-only, paket bantuan/feedback resolved, revisi, dan target understanding. Response menyertakan `deliveryId` UUID, `expiresAt`, dan metadata `localization`; bukan `practice_session`.
- Tambahkan `practice_post_study_deliveries` milik `practice`: `id char(36)` PK, `user_id` FK users, `question_id` FK bank, `snapshot_payload json not null`, `created_at`, `expires_at`, `receipt_id char(36) null` FK receipt/unique. Index `(user_id,expires_at)`; expiry **24 jam**. Snapshot memuat lesson/skill ID dan attribution canonical, payload/kunci, content/translation revision, locale, target difficulty dan level saat delivery.
- Answer localized wajib `deliveryId` dan `Idempotency-Key`; tidak menerima pilihan locale baru. Verifikasi owner, lesson/question, expiry, dan target understanding yang masih sah; grade snapshot server, bukan kunci kiriman client atau bank yang sudah berubah. Auth/target guard tetap berlaku. Satu delivery maksimal satu hasil; konsumsi delivery, receipt, dan handoff progress memakai transaksi/recovery idempotent sesuai engine.
- Replay receipt milik user dengan key/payload sama diperiksa sebelum expiry/current-target, mengembalikan hasil/bahasa lama tanpa event baru. Key/payload berbeda, delivery kedaluwarsa/terpakai, atau stale target: `422 / 142206002`, ambil delivery baru; delivery milik user lain tidak dibocorkan (`404 / 140406002`). Receipt menyimpan `deliveryId` dan result localized. Sesi/delivery lama tidak dialihbahasakan ketika preference berubah.
- Bank terjemahan tetap di `syllabus`, delivery/receipt di `practice`, progress di `progress`; akses lintas context melalui facade/port. Delivery adalah perluasan persistence yang diwujudkan `BIL-03`; flashcard/random practice memakai snapshot sesi masing-masing pada `BIL-05/BIL-06`.

## 8. Acceptance kontrak

`BIL-01` selesai ketika schema v2 dan contoh tervalidasi; allowlist 16 lesson cocok identitasnya dengan v1; ERD dan kontrak API memiliki mapping yang sama; kasus draft/stale/fallback/legacy/unsupported-locale dan merge parsial memiliki hasil yang jelas. Validasi semantik berikut wajib diimplementasikan pada `BIL-03`, di luar kemampuan JSON Schema standar:

- Identitas global, parent/skill attribution, prerequisite, grammar skill owner, urutan unik, mapping canonical, revisi monotonic dan kesetaraan sourceRevision.
- Published ancestor/English, bank 10 soal dan ladder, blank plain/HTML setara, minimal satu karakter kana pada jawaban, konsistensi family/check/contoh, sanitasi HTML, serta manifest/file/allowlist scope.
- Contoh valid/invalid untuk schema bukan bukti terjemahan benar; `BIL-02` tetap memerlukan review Inggris/Indonesia terhadap Jepang. Rilis runtime, migration SQL, dan konversi konten production berada pada task berikutnya.

Verifikasi kontrak read-only: `python3 scripts/validate_bilingual_contracts.py` (Python dengan `jsonschema` dan `PyYAML`). Memeriksa schema/examples, 20 kasus invalid, checksum/identitas allowlist, serta struktur/ref internal OpenAPI; bukan validasi penuh implementasi importer atau evaluator. [Sequence direct quiz localized](../sequence-diagram/random-question-generator-and-answer-evaluation.md#perluasan-direct-quiz-localized--bil-01) melengkapi kontrak delivery.
