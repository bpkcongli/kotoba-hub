# API Contract Practice

## Scope
- Dokumen ini menyelesaikan bagian `practice` dari task `ARCH-15`.
- Fokusnya adalah generate random practice session, direct deterministic lesson post-study quiz, dan submit answer sampai hasil grading serta progress impact siap dipakai UI.
- Dokumen ini diturunkan dari sequence diagram practice generation/answer evaluation, progress handoff, ERD `practice_sessions`, `practice_questions`, `practice_answers`, dan state progress `lesson_understanding_snapshots`.

## Source References
- Sequence random question generation dan grading: [random-question-generator-and-answer-evaluation.md](../sequence-diagram/random-question-generator-and-answer-evaluation.md)
- Sequence progress handoff: [update-progress-snapshot.md](../sequence-diagram/update-progress-snapshot.md)
- ERD learning activity: [learning-activity.md](../erd/learning-activity.md)

## Domain ID
- `06` untuk `practice`

## Design Goals
- Menjaga `practice` tetap menjadi owner untuk random session generation, random question storage, answer grading, dan direct post-study quiz selection.
- Membuat request generate tetap ringan, karena recommendation spec utama datang dari `personalization` dan `progress`.
- Mendukung random practice dari hub sebagai session, dan `post-study quiz` deterministik setelah learner selesai membaca lesson sebagai direct one-question quiz.
- Memastikan lesson `post-study quiz` tidak bergantung pada AI generation; mode ini hanya membaca satu soal canonical dari `syllabus` sesuai target difficulty pemahaman user.
- Menyertakan `progressImpact` pada response answer untuk mendukung feedback loop write-through.

## Endpoint Summary

| Method | Path | Purpose | Access Requirement |
| --- | --- | --- | --- |
| `POST` | `/api/v1/practice/sessions/generate` | Menghasilkan random practice session untuk current user | Authenticated + onboarding completed |
| `POST` | `/api/v1/practice/sessions/{sessionId}/answer` | Menilai jawaban practice dan menjalankan progress handoff | Authenticated + onboarding completed |
| `POST` | `/api/v1/practice/lesson-post-study/next` | Mengambil satu pertanyaan post-study quiz/review untuk lesson | Authenticated + onboarding completed |
| `POST` | `/api/v1/practice/lesson-post-study/answer` | Menilai jawaban post-study quiz dan meng-update pemahaman lesson | Authenticated + onboarding completed |

## Authorization Rules
- Semua endpoint di dokumen ini membutuhkan session valid dan `APP_READY`.
- Bila session tidak valid, kembalikan `401`.
- Bila session valid tetapi onboarding belum selesai, kembalikan `403`.

## Endpoint Details

### `POST /api/v1/practice/sessions/generate`
Menghasilkan random practice session berbasis recommendation spec user saat ini.

Request body:

```json
{
  "questionCount": 5
}
```

Behavior:
- `questionCount` opsional dengan default `5`.
- `practice` meminta recommendation spec dari `personalization`.
- `practice` memuat constraint katalog dari `syllabus`.
- Recommendation spec untuk random practice boleh membawa `lesson_understanding_levels` dari `progress` sebagai faktor tambahan selain learner profile, weak skills, flashcard result, dan practice history.
- AI tidak diposisikan sebagai sumber kebenaran untuk semua soal. AI hanya dipakai untuk random practice generation atau grading yang memang memerlukannya.
- Generator question untuk MVP hanya boleh menghasilkan `SLOT_FILL`, `SHORT_FREE_RESPONSE`, atau `ARRANGE_TOKEN`.
- `SLOT_FILL` selalu memiliki tepat empat opsi jawaban.
- Pada `SLOT_FILL`, prompt berupa kalimat bahasa Jepang dengan satu slot kosong, dan seluruh opsi jawaban juga dalam bahasa Jepang.
- `SHORT_FREE_RESPONSE` dikunci ke prompt bahasa Inggris dan jawaban bahasa Jepang.
- `SHORT_FREE_RESPONSE` mengandalkan input method yang menerima romaji lalu mentransform jawaban ke kana atau kanji sebelum submit final.
- `ARRANGE_TOKEN` meminta user menyusun token/kata menjadi jawaban akhir dan boleh dipakai untuk arah `EN_TO_JA` maupun `JA_TO_EN`.
- `practice` tidak lagi menghasilkan `MULTIPLE_CHOICE` karena pattern itu sudah dicakup oleh `flashcards`.
- Response mengembalikan session beserta daftar question yang siap dirender UI.

Success response:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120006000,
    "message": "Success!",
    "errorDetails": []
  },
  "data": {
    "id": "uuid",
    "status": "GENERATED",
    "difficultyBand": "STANDARD",
    "questionMix": {
      "WEAK": 0.6,
      "REINFORCEMENT": 0.3,
      "STRETCH": 0.1
    },
    "totalQuestions": 5,
    "answeredQuestionsCount": 0,
    "startedAt": "2026-04-04T10:00:00Z",
    "questions": [
      {
        "id": "uuid",
        "skillCode": "n5_particles_wa_ga_o",
        "questionType": "SLOT_FILL",
        "gradingStrategy": "DETERMINISTIC",
        "difficultyBand": "STANDARD",
        "promptText": "わたし___がくせいです。",
        "promptPayload": {
          "schemaVersion": 1,
          "promptLanguage": "JA",
          "optionLanguage": "JA",
          "slotCount": 1,
          "sentenceTemplate": "わたし___がくせいです。",
          "options": [
            { "id": "a", "label": "は" },
            { "id": "b", "label": "が" },
            { "id": "c", "label": "を" },
            { "id": "d", "label": "に" }
          ]
        },
        "sortOrder": 1
      }
    ]
  }
}
```

### `POST /api/v1/practice/lesson-post-study/next`
Mengambil satu pertanyaan post-study quiz/review untuk lesson berdasarkan level pemahaman user saat ini.

```json
{
  "lessonSlug": "hiragana-row-a"
}
```

Behavior:
- `lessonSlug` wajib mengarah ke lesson published.
- `practice` membaca `lesson_understanding_snapshots` dari `progress`.
- Jika snapshot belum ada, level pemahaman dianggap `0`.
- Target difficulty adalah `min(currentUnderstandingLevel + 1, 10)`.
- `practice` membaca tepat satu question dari `syllabus.lesson_post_study_questions` untuk lesson dan difficulty tersebut.
- Response hanya membawa satu pertanyaan `SLOT_FILL` dengan `gradingStrategy = DETERMINISTIC`; object ini berasal dari `lesson_post_study_questions`, bukan row `practice_questions`.
- Endpoint ini tidak membuat row `practice_sessions` atau `practice_questions`.

Success response:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120006000,
    "message": "Success!",
    "errorDetails": []
  },
  "data": {
    "lessonSlug": "hiragana-row-a",
    "currentUnderstandingLevel": 0,
    "targetUnderstandingLevel": 1,
    "targetDifficultyLevel": 1,
    "isReview": false,
    "question": {
      "id": "uuid",
      "skillCode": "hiragana_a_row",
      "questionType": "SLOT_FILL",
      "gradingStrategy": "DETERMINISTIC",
      "difficultyLevel": 1,
      "promptText": "___いうえお",
      "promptPayload": {
        "schemaVersion": 1,
        "promptLanguage": "JA",
        "optionLanguage": "JA",
        "slotCount": 1,
        "sentenceTemplate": "___いうえお",
        "options": [
          { "id": "a", "label": "あ" },
          { "id": "b", "label": "か" },
          { "id": "c", "label": "さ" },
          { "id": "d", "label": "た" }
        ]
      }
    }
  }
}
```

### `POST /api/v1/practice/sessions/{sessionId}/answer`
Menilai jawaban random practice, menyimpan `practice_answer`, lalu mengirim structured learning event ke `progress`.

Path params:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `sessionId` | `string` | yes | ID practice session milik current user. |

Request body:

```json
{
  "questionId": "uuid",
  "userAnswer": {
    "selectedOptionId": "a"
  },
  "responseTimeMs": 4200
}
```

Behavior:
- Memuat question dan session context.
- Bentuk `userAnswer` mengikuti `questionType`:
  - `SLOT_FILL`: kirim `selectedOptionId`.
  - `ARRANGE_TOKEN`: kirim `arrangedTokenIds` sesuai urutan final.
  - `SHORT_FREE_RESPONSE`: kirim `rawInputRomaji`, `normalizedKana`, dan opsional `normalizedKanji` bila IME di client berhasil menghasilkan kandidat final.
- Jika `gradingStrategy = DETERMINISTIC`, grading dilakukan di module `practice`.
- Jika `gradingStrategy = AI`, `practice` memanggil AI provider untuk grading dan short feedback.
- Setelah answer tersimpan, `practice` menjalankan handoff ke `progress`.

Success response:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120006000,
    "message": "Success!",
    "errorDetails": []
  },
  "data": {
    "sessionId": "uuid",
    "questionId": "uuid",
    "answerId": "uuid",
    "isCorrect": true,
    "numericScore": 100,
    "feedbackText": "Correct particle choice.",
    "gradingSource": "RULE_ENGINE",
    "gradingMetadata": {
      "gradingStrategy": "DETERMINISTIC",
      "matchedAnswerKeys": ["selectedOptionId"],
      "accepted": true
    },
    "sessionProgress": {
      "answeredQuestionsCount": 2,
      "totalQuestions": 2,
      "isCompleted": true
    },
    "nextQuestionId": null,
    "progressImpact": {
      "progressEventId": "uuid",
      "skillCode": "n5_particles_wa_ga_o",
      "masteryScore": 58.4,
      "masteryState": "DEVELOPING",
      "recommendedDifficultyBand": "STANDARD"
    }
  }
}
```

### `POST /api/v1/practice/lesson-post-study/answer`
Menilai jawaban post-study quiz/review lesson secara deterministik, mengirim event ke `progress`, lalu meng-update `lesson_understanding_snapshots`.

Request body:

```json
{
  "lessonSlug": "hiragana-row-a",
  "questionId": "uuid",
  "userAnswer": {
    "selectedOptionId": "a"
  },
  "responseTimeMs": 4200
}
```

Behavior:
- Memuat lesson, question template, dan current `lesson_understanding_snapshots`.
- Memastikan `questionId` belongs to `lessonSlug` dan difficulty-nya sesuai target difficulty aktif, kecuali implementasi sengaja mengizinkan stale question grace window.
- Grading selalu `DETERMINISTIC` dengan rules `SLOT_FILL`.
- `practice` tidak membuat `practice_answer`; hasil attempt dikirim sebagai structured event ke `progress`.
- `progress` membuat `progress_event` dengan `sourceType = LESSON_POST_STUDY`, `sourceSessionId = null`, dan `sourceEntityId = lesson_post_study_questions.id`.
- Jika jawaban benar, `lesson_understanding_snapshots.current_understanding_level` naik satu level sampai maksimum `10`.
- Jika jawaban salah, `current_understanding_level` tidak berubah.
- `postStudyQuizCompleted = true` bila `currentUnderstandingLevelAfter >= 1`.

Success response:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120006000,
    "message": "Success!",
    "errorDetails": []
  },
  "data": {
    "lessonSlug": "hiragana-row-a",
    "questionId": "uuid",
    "isCorrect": true,
    "numericScore": 100,
    "feedbackText": "Correct choice.",
    "gradingSource": "RULE_ENGINE",
    "understandingProgress": {
      "currentUnderstandingLevelBefore": 0,
      "currentUnderstandingLevelAfter": 1,
      "targetDifficultyLevel": 1,
      "maxUnderstandingLevel": 10,
      "postStudyQuizCompleted": true,
      "nextReviewDifficultyLevel": 2
    },
    "progressImpact": {
      "progressEventId": "uuid",
      "skillCode": "hiragana_a_row",
      "masteryScore": 58.4,
      "masteryState": "DEVELOPING",
      "recommendedDifficultyBand": "STANDARD"
    }
  }
}
```

## Question Type Contract

### `SLOT_FILL`
- Prompt menampilkan kalimat dengan satu slot kosong.
- User memilih satu jawaban dari tepat empat opsi.
- Kalimat prompt dan seluruh opsi jawaban sama-sama dalam bahasa Jepang.
- `gradingStrategy` default: `DETERMINISTIC`.
- Untuk lesson `post-study quiz`, direct question dari `lesson_post_study_questions` membawa `difficultyLevel` `1..10` yang merepresentasikan progresi panjang dan kompleksitas kalimat di dalam lesson.
- Bentuk minimum `userAnswer`:

```json
{
  "selectedOptionId": "a"
}
```

### `SHORT_FREE_RESPONSE`
- Prompt selalu berupa kalimat penuh dalam bahasa Inggris.
- User menjawab dalam bahasa Jepang melalui input field.
- Client input method menerima romaji lalu mentransform jawaban ke kana atau kanji sebelum final submit.
- Payload jawaban sebaiknya tetap menyertakan bentuk mentah romaji dan hasil normalisasi agar grading AI bisa diaudit.
- `gradingStrategy` default: `AI`.
- Bentuk minimum `userAnswer`:

```json
{
  "rawInputRomaji": "watashi wa gakusei desu",
  "normalizedKana": "わたしはがくせいです",
  "normalizedKanji": "私は学生です"
}
```

### `ARRANGE_TOKEN`
- Prompt meminta user menyusun token/kata menjadi jawaban akhir.
- Arah soal boleh `EN_TO_JA` atau `JA_TO_EN`.
- `gradingStrategy` default: `DETERMINISTIC`.
- Bentuk minimum `userAnswer`:

```json
{
  "arrangedTokenIds": ["t1", "t2", "t3", "t4"]
}
```

## Suggested Error Code Seeds

| HTTP Status | Application Code | Meaning |
| --- | --- | --- |
| `200` | `120006000` | Practice success |
| `401` | `140106001` | Session tidak ada atau tidak valid untuk practice API |
| `403` | `140306001` | Onboarding belum selesai untuk practice API |
| `404` | `140406001` | Practice session tidak ditemukan atau bukan milik user |
| `404` | `140406002` | `lessonSlug` untuk post-study quiz tidak ditemukan atau tidak published |
| `422` | `142206001` | Validation error generic |
| `422` | `142206002` | `questionId` tidak cocok dengan session aktif atau lesson post-study target aktif |
| `500` | `150006999` | Unhandled practice exception |

## OpenAPI Artifact
- Swagger/OpenAPI contract untuk area ini disimpan di `docs/api-contract/openapi.practice.yaml`.

## Notes For Follow-up Tasks
- Jika nanti histori attempt post-study quiz dibutuhkan selain `progress_events`, tambahkan tabel append-only terpisah; jangan mengubah `lesson_post_study_questions` menjadi histori user.
- `gradingMetadata` yang dikembalikan API sebaiknya tetap ringkas; observability detail AI tetap berada di log internal.
- Public contract ini sengaja membedakan ownership: `syllabus` menyimpan bank soal canonical lesson, `progress` menyimpan level pemahaman terakhir, sedangkan `practice` melakukan selection/grading.
