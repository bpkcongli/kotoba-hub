# API Contract Practice

## Scope
- Dokumen ini menyelesaikan bagian `practice` dari task `ARCH-15`.
- Fokusnya adalah generate random practice session dan submit answer sampai hasil grading serta progress impact siap dipakai UI.
- Dokumen ini diturunkan dari sequence diagram practice generation/answer evaluation, progress handoff, dan ERD `practice_sessions`, `practice_questions`, `practice_answers`.

## Source References
- Sequence random question generation dan grading: [random-question-generator-and-answer-evaluation.md](../sequence-diagram/random-question-generator-and-answer-evaluation.md)
- Sequence progress handoff: [update-progress-snapshot.md](../sequence-diagram/update-progress-snapshot.md)
- ERD learning activity: [learning-activity.md](../erd/learning-activity.md)

## Domain ID
- `06` untuk `practice`

## Design Goals
- Menjaga `practice` tetap menjadi owner untuk session generation, question storage, answer grading, dan session progress update.
- Membuat request generate tetap ringan, karena recommendation spec utama datang dari `personalization` dan `progress`.
- Menyertakan `progressImpact` pada response answer untuk mendukung feedback loop write-through.

## Endpoint Summary

| Method | Path | Purpose | Access Requirement |
| --- | --- | --- | --- |
| `POST` | `/api/v1/practice/sessions/generate` | Menghasilkan practice session acak untuk current user | Authenticated + onboarding completed |
| `POST` | `/api/v1/practice/sessions/{sessionId}/answer` | Menilai jawaban practice dan menjalankan progress handoff | Authenticated + onboarding completed |

## Authorization Rules
- Semua endpoint di dokumen ini membutuhkan session valid dan `APP_READY`.
- Bila session tidak valid, kembalikan `401`.
- Bila session valid tetapi onboarding belum selesai, kembalikan `403`.

## Endpoint Details

### `POST /api/v1/practice/sessions/generate`
Menghasilkan practice session acak berbasis recommendation spec user saat ini.

Request body:

```json
{
  "questionCount": 5
}
```

Behavior:
- `questionCount` opsional, default `5`.
- `practice` meminta recommendation spec dari `personalization`.
- `practice` memuat constraint katalog dari `syllabus`.
- AI dipakai untuk generate session payload terstruktur.
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
    "status": "generated",
    "difficultyBand": "standard",
    "questionMix": {
      "weak": 0.6,
      "reinforcement": 0.3,
      "stretch": 0.1
    },
    "totalQuestions": 5,
    "answeredQuestionsCount": 0,
    "startedAt": "2026-04-04T10:00:00Z",
    "questions": [
      {
        "id": "uuid",
        "skillCode": "n5_particles_wa_ga_o",
        "questionType": "multiple_choice",
        "gradingStrategy": "deterministic",
        "difficultyBand": "standard",
        "promptText": "Choose the correct particle.",
        "promptPayload": {
          "options": ["wa", "ga", "o", "ni"]
        },
        "sortOrder": 1
      }
    ]
  }
}
```

### `POST /api/v1/practice/sessions/{sessionId}/answer`
Menilai jawaban practice, menyimpan `practice_answer`, lalu mengirim structured learning event ke `progress`.

Path params:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `sessionId` | `string` | yes | ID practice session milik current user. |

Request body:

```json
{
  "questionId": "uuid",
  "userAnswer": {
    "selectedOption": "wa"
  },
  "responseTimeMs": 4200
}
```

Behavior:
- Memuat question dan session context.
- Jika `gradingStrategy = deterministic`, grading dilakukan di module `practice`.
- Jika `gradingStrategy = ai`, `practice` memanggil AI provider untuk grading dan short feedback.
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
    "gradingSource": "rule_engine",
    "gradingMetadata": {
      "gradingStrategy": "deterministic",
      "matchedAnswerKeys": ["selectedOption"],
      "accepted": true
    },
    "sessionProgress": {
      "answeredQuestionsCount": 1,
      "totalQuestions": 5,
      "isCompleted": false
    },
    "nextQuestionId": "uuid",
    "progressImpact": {
      "progressEventId": "uuid",
      "skillCode": "n5_particles_wa_ga_o",
      "masteryScore": 58.4,
      "masteryState": "developing",
      "recommendedDifficultyBand": "standard"
    }
  }
}
```

## Suggested Error Code Seeds

| HTTP Status | Application Code | Meaning |
| --- | --- | --- |
| `200` | `120006000` | Practice success |
| `401` | `140106001` | Session tidak ada atau tidak valid untuk practice API |
| `403` | `140306001` | Onboarding belum selesai untuk practice API |
| `404` | `140406001` | Practice session tidak ditemukan atau bukan milik user |
| `422` | `142206001` | Validation error generic |
| `422` | `142206002` | `questionId` tidak cocok dengan session aktif |
| `500` | `150006999` | Unhandled practice exception |

## OpenAPI Artifact
- Swagger/OpenAPI contract untuk area ini disimpan di `docs/api-contract/openapi.practice.yaml`.

## Notes For Follow-up Tasks
- Jika nanti session review atau retry mode ditambahkan, lebih aman memperluas request generate daripada mengubah shape response answer yang sudah dipakai UI.
- `gradingMetadata` yang dikembalikan API sebaiknya tetap ringkas; observability detail AI tetap berada di log internal.
