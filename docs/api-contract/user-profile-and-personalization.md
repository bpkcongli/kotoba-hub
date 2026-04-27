# API Contract User Profile And Personalization

## Scope
- Dokumen ini menyelesaikan bagian `user profile` dan `personalization` dari task `ARCH-14`.
- Fokusnya adalah API yang dipakai oleh protected route guard, onboarding wizard, assessment draft, dan final learner profile persistence.
- Dokumen ini melengkapi base contract di `docs/api-contract/README.md` dan auth/authz contract di `docs/api-contract/auth-and-authorization.md`.

## Source References
- Sequence route guard onboarding: [onboarding-personalization.md](../sequence-diagram/onboarding-personalization.md)
- Sequence assessment draft dan confirmation: [onboarding-personalization-with-ai-normalization.md](../sequence-diagram/onboarding-personalization-with-ai-normalization.md)
- ERD auth dan learner profile: [auth-and-user-profile.md](../erd/auth-and-user-profile.md)

## Domain IDs
- `02` untuk `users / user profile`
- `03` untuk `personalization`

## Design Goals
- Menjaga `users` tetap menjadi owner untuk `learner_profiles` dan status `onboarding_completed`.
- Menjaga `personalization` hanya menghasilkan draft dan recommendation sampai user mengonfirmasi hasil final.
- Menyediakan kontrak yang cukup untuk flow onboarding dua tahap: draft dulu, konfirmasi kemudian.

## Endpoint Summary

| Method | Path | Purpose | Access Requirement |
| --- | --- | --- | --- |
| `GET` | `/api/v1/user-profile/me` | Mengambil ringkasan user dan learner profile untuk current user | Authenticated session |
| `POST` | `/api/v1/personalization/assessment` | Membuat draft personalization dari structured input + optional note | Authenticated session |
| `POST` | `/api/v1/personalization/assessment/confirm` | Menyimpan learner profile final yang sudah dikonfirmasi user | Authenticated session |

## Endpoint Details

### `GET /api/v1/user-profile/me`
Mengambil profile summary yang dipakai app shell atau route guard setelah session valid.

Behavior:
- Membaca `users` dan `learner_profiles` untuk current user.
- Jika learner profile belum ada, endpoint tetap sukses dan mengembalikan `learnerProfile = null`.
- Endpoint ini tidak membuat recommendation baru; fungsinya hanya membaca current state.

Success response:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120002000,
    "message": "Success!",
    "errorDetails": []
  },
  "data": {
    "userId": "uuid",
    "email": "example@gmail.com",
    "displayName": "John Doe",
    "avatarUrl": "https://example.com/avatar.png",
    "onboardingCompleted": false,
    "accessState": "ONBOARDING_REQUIRED",
    "learnerProfile": null
  }
}
```

Response notes:
- `accessState` mengikuti rule auth/authz: `ONBOARDING_REQUIRED` atau `APP_READY`.
- `learnerProfile` bernilai `null` bila onboarding belum pernah dikonfirmasi.

### `POST /api/v1/personalization/assessment`
Membuat draft assessment onboarding dari structured form dan optional free-text note.

Behavior:
- Memvalidasi input structured form.
- Memanggil `progress` untuk baseline mastery bila tersedia.
- Memakai `syllabus` untuk validasi target level dan skill references.
- Jika `note` diberikan, `personalization` boleh meminta AI normalization dan mengembalikan suggested known skills.
- Endpoint ini belum menulis `learner_profiles`.

Request body:

```json
{
  "currentLevel": "jlpt_n5",
  "targetLevel": "jlpt_n4",
  "dailyGoalMinutes": 20,
  "preferredScript": "mixed",
  "weakSkillFocuses": ["particles", "listening"],
  "note": "I already know most hiragana and some basic grammar."
}
```

Success response:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120003000,
    "message": "Success!",
    "errorDetails": []
  },
  "data": {
    "draftProfile": {
      "currentLevel": "jlpt_n5",
      "targetLevel": "jlpt_n4",
      "dailyGoalMinutes": 20,
      "preferredScript": "mixed",
      "weakSkillFocuses": ["particles", "listening"]
    },
    "suggestedKnownSkillClaims": [
      {
        "skillCode": "hiragana_basic",
        "title": "Hiragana Basics",
        "source": "ai_note",
        "confidence": 0.91
      }
    ],
    "recommendation": {
      "recommendedTrackSlug": "jlpt-n5-foundation",
      "recommendedUnitSlug": "n5-kana-basics",
      "nextLessonSlug": "hiragana-row-a"
    },
    "aiNormalizationUsed": true
  }
}
```

Validation notes:
- `targetLevel`, `dailyGoalMinutes`, dan `preferredScript` wajib diisi.
- `weakSkillFocuses` boleh kosong tetapi harus berbentuk array bila dikirim.
- `note` opsional dan tidak boleh langsung menjadi source of truth tanpa confirmation user.

### `POST /api/v1/personalization/assessment/confirm`
Menyimpan learner profile final setelah user mereview hasil draft.

Behavior:
- Menerima payload final yang sudah diedit/dikonfirmasi user.
- `personalization` boleh menghitung ulang recommendation final.
- Write final tetap masuk ke `users` untuk upsert `learner_profiles` dan `onboarding_completed = true`.

Request body:

```json
{
  "currentLevel": "jlpt_n5",
  "targetLevel": "jlpt_n4",
  "dailyGoalMinutes": 20,
  "preferredScript": "mixed",
  "weakSkillFocuses": ["particles", "listening"],
  "knownSkillClaims": ["hiragana_basic"]
}
```

Success response:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120003000,
    "message": "Success!",
    "errorDetails": []
  },
  "data": {
    "userProfile": {
      "userId": "uuid",
      "email": "example@gmail.com",
      "displayName": "John Doe",
      "avatarUrl": "https://example.com/avatar.png",
      "onboardingCompleted": true,
      "accessState": "APP_READY",
      "learnerProfile": {
        "currentLevel": "jlpt_n5",
        "targetLevel": "jlpt_n4",
        "dailyGoalMinutes": 20,
        "preferredScript": "mixed",
        "weakSkillFocuses": ["particles", "listening"],
        "knownSkillClaims": ["hiragana_basic"],
        "onboardingCompletedAt": "2026-04-04T10:00:00Z"
      }
    },
    "recommendation": {
      "recommendedTrackSlug": "jlpt-n5-foundation",
      "recommendedUnitSlug": "n5-kana-basics",
      "nextLessonSlug": "hiragana-row-a"
    }
  }
}
```

## Authorization Rules
- Semua endpoint di dokumen ini membutuhkan session valid.
- `GET /api/v1/user-profile/me` boleh diakses oleh user dengan state `ONBOARDING_REQUIRED` maupun `APP_READY`.
- `POST /api/v1/personalization/assessment` dan `POST /api/v1/personalization/assessment/confirm` juga boleh diakses oleh `ONBOARDING_REQUIRED` maupun `APP_READY`, agar flow ini tetap reusable untuk future profile refresh/settings.
- Bila session tidak valid, kembalikan `401`.

## Suggested Error Code Seeds

### Users / User Profile (`domain_id = 02`)

| HTTP Status | Application Code | Meaning |
| --- | --- | --- |
| `200` | `120002000` | User profile read success |
| `401` | `140102001` | Session tidak ada atau tidak valid untuk user profile API |

### Personalization (`domain_id = 03`)

| HTTP Status | Application Code | Meaning |
| --- | --- | --- |
| `200` | `120003000` | Personalization success |
| `401` | `140103001` | Session tidak ada atau tidak valid untuk personalization API |
| `422` | `142203001` | Validation error generic |
| `500` | `150003999` | Unhandled personalization exception |

## OpenAPI Artifact
- Swagger/OpenAPI contract untuk area ini disimpan di `docs/api-contract/openapi.user-profile-and-personalization.yaml`.

## Notes For Follow-up Tasks
- Endpoint progress, flashcards, dan practice nanti boleh mengandalkan `learner_profiles.onboarding_completed = true` sebagai access gate level aplikasi.
- Jika nanti settings profile non-onboarding ditambahkan, endpoint baru sebaiknya dipisah dari kontrak onboarding ini agar boundary `users` tetap jelas.
