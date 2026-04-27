# API Contract Progress

## Scope
- Dokumen ini menyelesaikan bagian `progress` dari task `ARCH-15`.
- Fokusnya adalah API read model untuk dashboard overview, feed aktivitas belajar per session, dan timeline aktivitas belajar.
- Dokumen ini diturunkan dari sequence diagram progress handoff dan ERD `progress_events`, `skill_mastery_snapshots`.

## Source References
- Sequence progress handoff: [update-progress-snapshot.md](../sequence-diagram/update-progress-snapshot.md)
- ERD learning activity: [learning-activity.md](../erd/learning-activity.md)
- MVP plan public contract: [mvp-plan.md](../mvp-plan.md)

## Domain ID
- `07` untuk `progress`

## Design Goals
- Menjaga `progress` tetap menjadi source of truth untuk learning event dan mastery snapshot.
- Menyediakan read model yang cukup untuk dashboard ringkas tanpa membuka detail internal producer.
- Menyediakan feed per session untuk kebutuhan dashboard recents tanpa membanjiri UI dengan satu item per jawaban.
- Menyediakan timeline yang bisa dipaginasi dan difilter ringan untuk audit activity user.

## Endpoint Summary

| Method | Path | Purpose | Access Requirement |
| --- | --- | --- | --- |
| `GET` | `/api/v1/progress/overview` | Mengambil ringkasan dashboard progress current user | Authenticated + onboarding completed |
| `GET` | `/api/v1/progress/sessions` | Mengambil feed aktivitas belajar yang diringkas per session | Authenticated + onboarding completed |
| `GET` | `/api/v1/progress/timeline` | Mengambil timeline activity belajar current user | Authenticated + onboarding completed |

## Authorization Rules
- Semua endpoint di dokumen ini membutuhkan session valid dan `APP_READY`.
- Bila session tidak valid, kembalikan `401`.
- Bila session valid tetapi onboarding belum selesai, kembalikan `403`.

## Endpoint Details

### `GET /api/v1/progress/overview`
Mengambil ringkasan progress utama untuk dashboard.

Query params:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `trackSlug` | `string` | no | Jika diisi, overview difilter ke satu track tertentu. |

Behavior:
- Membaca `skill_mastery_snapshots` sebagai basis utama agregasi.
- Boleh menyertakan ringkasan track agar dashboard tidak perlu banyak request tambahan.
- Tidak mengembalikan seluruh timeline event.

Success response:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120007000,
    "message": "Success!",
    "errorDetails": []
  },
  "data": {
    "trackedSkillsCount": 18,
    "masteredSkillsCount": 4,
    "developingSkillsCount": 9,
    "weakSkillsCount": 5,
    "averageMasteryScore": 56.8,
    "recommendedDifficultyBand": "standard",
    "lastActivityAt": "2026-04-04T10:20:00Z",
    "trackSummaries": [
      {
        "trackSlug": "jlpt-n5-foundation",
        "trackTitle": "JLPT N5 Foundation",
        "trackedSkillsCount": 18,
        "masteredSkillsCount": 4,
        "averageMasteryScore": 56.8,
        "lastActivityAt": "2026-04-04T10:20:00Z"
      }
    ]
  }
}
```

### `GET /api/v1/progress/timeline`
Mengambil timeline activity belajar current user dari `progress_events`.

Query params:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `offset` | `integer` | no | Zero-based record offset. Default `0`. |
| `limit` | `integer` | no | Max records per page. Default `10`. |
| `sourceTypes` | `string` | no | Filter multi-value dengan separated commas, mis. `flashcard,practice`. |
| `skillCodes` | `string` | no | Filter multi-value dengan separated commas. |
| `trackSlug` | `string` | no | Filter ke satu track tertentu. |

Behavior:
- Timeline diurutkan descending berdasarkan `answered_at`.
- Satu item timeline merepresentasikan satu `progress_event`.
- Endpoint ini cocok untuk activity feed, audit ringan, dan debugging user-facing.

Success response:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120007000,
    "message": "Success!",
    "errorDetails": []
  },
  "metadata": {
    "pagination": {
      "pageNumber": 1,
      "pageSize": 10,
      "totalRecords": 2
    }
  },
  "data": {
    "progressEvents": [
      {
        "id": "uuid",
        "sourceType": "flashcard",
        "sourceSessionId": "uuid",
        "sourceEntityId": "uuid",
        "questionType": "hiragana_character",
        "skillCode": "hiragana_basic",
        "skillTitle": "Hiragana Basics",
        "trackSlug": "jlpt-n5-foundation",
        "unitSlug": "n5-kana-basics",
        "lessonSlug": "hiragana-row-a",
        "isCorrect": true,
        "numericScore": 100,
        "confidenceWeight": 0.8,
        "responseTimeMs": 1800,
        "answeredAt": "2026-04-04T10:20:00Z"
      }
    ]
  }
}
```

### `GET /api/v1/progress/sessions`
Mengambil feed aktivitas belajar current user yang diringkas per session.

Query params:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `offset` | `integer` | no | Zero-based record offset. Default `0`. |
| `limit` | `integer` | no | Max records per page. Default `10`. |
| `sourceTypes` | `string` | no | Filter multi-value dengan separated commas, mis. `flashcard,practice`. |
| `trackSlug` | `string` | no | Filter ke satu track tertentu. |

Behavior:
- Feed diurutkan descending berdasarkan `lastActivityAt`.
- Satu item feed merepresentasikan ringkasan satu `flashcard_session` atau `practice_session`.
- Summary dibentuk dari agregasi `progress_events` per `source_type + source_session_id`, ditambah metadata session ringan yang relevan untuk dashboard.
- Endpoint ini cocok untuk recent activity dashboard, sedangkan `GET /progress/timeline` tetap dipakai bila UI atau tooling membutuhkan jejak per jawaban.

Success response:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120007000,
    "message": "Success!",
    "errorDetails": []
  },
  "metadata": {
    "pagination": {
      "pageNumber": 1,
      "pageSize": 10,
      "totalRecords": 2
    }
  },
  "data": {
    "progressSessions": [
      {
        "sourceType": "flashcard",
        "sourceSessionId": "uuid",
        "sessionStatus": "completed",
        "sessionTitle": "N5 Kana Foundation",
        "trackSlug": "jlpt-n5-foundation",
        "unitSlug": "n5-kana-basics",
        "startedAt": "2026-04-04T10:00:00Z",
        "completedAt": "2026-04-04T10:12:00Z",
        "lastActivityAt": "2026-04-04T10:12:00Z",
        "totalInteractions": 10,
        "correctCount": 8,
        "incorrectCount": 2,
        "averageScore": 80
      }
    ]
  }
}
```

## Suggested Error Code Seeds

| HTTP Status | Application Code | Meaning |
| --- | --- | --- |
| `200` | `120007000` | Progress success |
| `401` | `140107001` | Session tidak ada atau tidak valid untuk progress API |
| `403` | `140307001` | Onboarding belum selesai untuk progress API |
| `422` | `142207001` | Validation error generic |
| `500` | `150007999` | Unhandled progress exception |

## OpenAPI Artifact
- Swagger/OpenAPI contract untuk area ini disimpan di `docs/api-contract/openapi.progress.yaml`.

## Notes For Follow-up Tasks
- Jika nanti dashboard membutuhkan breakdown lebih kaya, endpoint baru sebaiknya tetap berbasis read model `progress`, bukan langsung membaca domain producer.
- Timeline tetap berbicara dalam bahasa `progress_event`, bukan detail internal `practice_answer` atau `flashcard_item_state`.
