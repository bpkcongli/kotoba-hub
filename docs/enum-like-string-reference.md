# Enum-Like String Reference

## Purpose
- Dokumen ini menjadi referensi untuk field string enum-like yang muncul di ERD dan kontrak domain KotobaHub.
- Konvensi penulisannya adalah `UPPER_CASE` dengan separator underscore `_` bila nilai terdiri dari lebih dari satu kata.
- Nilai yang berasal dari provider eksternal atau identifier bebas seperti `model`, `operation_name`, `scope`, dan `token_type` tidak dipaksa mengikuti konvensi ini karena bukan enum internal aplikasi.

## Auth And User Profile

### `accounts.provider`
- `GOOGLE`: akun autentikasi berasal dari Google OAuth. Ini adalah satu-satunya provider MVP saat ini.

### `learner_profiles.current_level`
- `BEGINNER`: user merasa masih di tahap awal dan belum nyaman dipetakan langsung ke level JLPT tertentu.
- `JLPT_N5`: user merasa berada di level dasar JLPT N5.
- `JLPT_N4`: user merasa sudah mulai berada di atas dasar awal dan mendekati atau berada di level JLPT N4.

### `learner_profiles.target_level`
- `JLPT_N5`: target belajar utama user adalah mencapai atau menuntaskan materi setara JLPT N5.
- `JLPT_N4`: target belajar utama user adalah mencapai atau menuntaskan materi setara JLPT N4.

### `learner_profiles.preferred_script`
- `ROMAJI`: UI dan materi sebisa mungkin memprioritaskan transliterasi romaji.
- `KANA`: UI dan materi memprioritaskan kana tanpa bergantung pada romaji.
- `MIXED`: UI dan materi boleh menampilkan kombinasi kana dan romaji sesuai konteks belajar.

## Syllabus Domain

### `tracks.curriculum_level` dan `skills.curriculum_level`
- `N5`: materi berada di scope kurikulum JLPT N5.
- `N4`: materi berada di scope kurikulum JLPT N4.

### `skills.skill_type`
- `KANA`: skill terkait penguasaan hiragana, katakana, atau sistem bunyi dasar.
- `VOCABULARY`: skill terkait kosakata.
- `GRAMMAR`: skill terkait pola tata bahasa.
- `READING`: skill terkait pemahaman bacaan.

## Flashcard Domain

### `flashcard_decks.deck_source`
- `SYSTEM`: deck bawaan aplikasi yang dikelola sistem dan bisa dipublikasikan ke semua user.
- `CUSTOM`: deck buatan user yang dimiliki user tertentu.

Catatan API:
- `ALL`: nilai filter API untuk meminta gabungan deck `SYSTEM` dan `CUSTOM`. Nilai ini tidak disimpan ke kolom `flashcard_decks.deck_source`.

### `flashcard_decks.deck_type`
- `FOUNDATION`: deck untuk fondasi materi inti.
- `REVIEW`: deck untuk pengulangan atau review materi yang sudah pernah dipelajari.
- `WEAK_SKILL`: deck yang difokuskan ke skill yang masih lemah.

### `flashcard_items.item_type`
- `HIRAGANA_CHARACTER`: item satu karakter hiragana.
- `KATAKANA_CHARACTER`: item satu karakter katakana.
- `KANJI_CHARACTER`: item satu karakter kanji.
- `VOCABULARY`: item kosakata tunggal atau pasangan istilah pendek.
- `PHRASE`: item frasa pendek.
- `SHORT_SENTENCE`: item kalimat pendek yang masih cocok untuk evaluasi deterministik.

### `flashcard_sessions.status`
- `ACTIVE`: session sedang berjalan.
- `COMPLETED`: session selesai normal.
- `ABANDONED`: session dihentikan atau ditinggalkan sebelum selesai.

### `flashcard_item_states.current_bucket`
- `NEW`: item baru atau belum punya histori belajar yang cukup.
- `LEARNING`: item sedang berada di fase penguatan dan masih perlu sering diulang.
- `MASTERED`: item sudah relatif stabil dan bisa diberi interval review lebih longgar.

## Practice Domain

### `practice_sessions.status`
- `GENERATED`: session sudah dibuat tetapi belum benar-benar berjalan jauh.
- `IN_PROGRESS`: session sedang dikerjakan user.
- `COMPLETED`: session selesai.
- `EXPIRED`: session dianggap kedaluwarsa dan tidak lagi aktif dipakai.

### `practice_sessions.difficulty_band`, `practice_questions.difficulty_band`, `skill_mastery_snapshots.recommended_difficulty_band`
- `REMEDIAL`: band yang lebih ringan dan fokus pada penguatan dasar atau pemulihan area lemah.
- `STANDARD`: band default dengan tingkat tantangan normal.
- `STRETCH`: band yang lebih menantang untuk mendorong kenaikan level penguasaan.

### `practice_sessions.question_mix`
- `WEAK`: porsi soal yang sengaja diarahkan ke area skill lemah user.
- `REINFORCEMENT`: porsi soal untuk memperkuat materi yang sedang dibangun stabilitasnya.
- `STRETCH`: porsi soal yang sedikit lebih menantang dari baseline session.

### `practice_questions.question_type`
- `MULTIPLE_CHOICE`: soal pilihan ganda.
- `SLOT_FILL`: soal isi bagian kosong atau slot tertentu.
- `SHORT_FREE_RESPONSE`: soal jawaban bebas singkat yang biasanya perlu grading AI pada MVP.

### `practice_questions.grading_strategy`
- `DETERMINISTIC`: penilaian dilakukan dengan rules engine atau matching terstruktur tanpa AI.
- `AI`: penilaian dilakukan dengan bantuan AI.

### `practice_answers.grading_source`
- `RULE_ENGINE`: hasil grading berasal dari mesin rule internal.
- `AI_PROVIDER`: hasil grading berasal dari provider AI.

## Progress Domain

### `progress_events.source_type`
- `FLASHCARD`: event progress berasal dari aktivitas flashcard.
- `PRACTICE`: event progress berasal dari aktivitas practice.

### `skill_mastery_snapshots.mastery_state`
- `WEAK`: penguasaan skill masih lemah dan butuh perhatian khusus.
- `DEVELOPING`: penguasaan skill sedang berkembang tetapi belum stabil.
- `STABLE`: penguasaan skill sudah cukup konsisten.
- `MASTERED`: penguasaan skill dianggap kuat pada baseline model saat ini.

### `progress_events.question_type`
- Untuk event dari `PRACTICE`, nilainya mengikuti enum `practice_questions.question_type`.
- Untuk event dari `FLASHCARD`, nilainya biasanya membawa label tipe item seperti `HIRAGANA_CHARACTER`, `VOCABULARY`, atau label aktivitas sejenis yang relevan.

## AI Support And Observability

### `ai_request_logs.source_module`
- `PRACTICE`: request dipicu oleh domain practice.
- `PERSONALIZATION`: request dipicu oleh domain personalization.
- `SHARED_AI`: request dipicu oleh lapisan AI abstraction/shared tanpa terikat satu flow produk spesifik.

### `ai_request_logs.source_entity_type`
- `PRACTICE_SESSION`: request berasosiasi dengan satu practice session.
- `PRACTICE_ANSWER`: request berasosiasi dengan satu jawaban practice.
- `PERSONALIZATION_ASSESSMENT`: request berasosiasi dengan flow assessment personalization.

### `ai_request_logs.provider`
- `OPENAI`: provider AI yang dipakai pada MVP saat ini.

### `ai_request_logs.request_status`
- `SUCCEEDED`: request selesai sukses.
- `FAILED`: request gagal total.
- `PARTIAL`: request selesai sebagian, misalnya output utama tersedia tetapi ada bagian yang tidak lengkap atau fallback.
- `CANCELLED`: request dibatalkan sebelum selesai.

### `ai_request_attempts.attempt_status`
- `SUCCEEDED`: attempt sukses.
- `FAILED`: attempt gagal.
- `TIMEOUT`: attempt berhenti karena batas waktu.
- `PARSE_FAILED`: provider merespons, tetapi hasil tidak lolos parse/schema validation yang dibutuhkan.
