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
    "appAccess": "ONBOARDING_REQUIRED",
    "learnerProfile": null
  }
}
```

Response notes:
- `appAccess` mengikuti enum yang sama dengan `authorization.appAccess` di endpoint auth session: `ONBOARDING_REQUIRED` atau `APP_READY`.
- `learnerProfile` bernilai `null` bila onboarding belum pernah dikonfirmasi.

### `POST /api/v1/personalization/assessment`
Membuat draft assessment onboarding dari structured form dan optional free-text note.

Behavior:
- Memvalidasi input structured form.
- Memanggil `progress` untuk baseline mastery bila tersedia.
- Memakai `syllabus` untuk validasi target level dan skill references.
- Jika `note` diberikan, `personalization` boleh meminta AI normalization dan mengembalikan suggested known skills.
- Endpoint ini belum menulis `learner_profiles`.
- Request POST wajib membawa `Origin` yang sama dengan origin aplikasi; jika tidak, respons `403` dikirim sebelum pemeriksaan session, pembacaan progress, atau panggilan AI.
- `note` yang tidak dikirim, `null`, kosong, atau hanya whitespace memakai structured form saja: `suggestedKnownSkillClaims = []` dan `aiNormalizationUsed = false`, tanpa membaca konfigurasi atau memanggil provider AI.
- Catatan nonblank dinormalisasi melalui operasi `summarizePlacement` pada fondasi AI `IMP-08`. Hasil tetap berupa suggestion dengan judul canonical syllabus, `source = ai_note`, dan confidence `0..1`; tidak mengubah field structured form atau state profile/progress.
- Jika normalisasi AI gagal, endpoint mengembalikan `500 / 150003999` dengan pesan aman. Tidak ada fallback diam-diam yang mengklaim catatan berhasil diproses; learner dapat mengirim assessment kembali tanpa catatan.
- Recommendation draft mengikuti urutan `sortOrder` track/unit/lesson published, mulai dari current track hingga target; `BEGINNER` atau current level `null` mulai dari track pertama. Jika current lebih tinggi dari target, mulai dari target. Lesson berikutnya adalah kandidat pertama yang belum tercakup progress terukur: understanding lesson `>= 1` atau seluruh skill lesson mempunyai snapshot `MASTERED` dianggap cukup untuk melewati kandidat tersebut. Jika semua kandidat tercakup, lesson pertama menjadi hint review. Policy ini hanya memilih hint, tidak menulis completion atau mastery. Suggestion AI yang belum dikonfirmasi tidak dipakai untuk melewati lesson.
- Context normalisasi hanya memuat skill published sampai target, baseline progress milik current user, dan note yang dikirim. Referensi progress yang sudah tidak berada di katalog diabaikan. Tidak ada repository context lain yang diakses langsung.
- `status.traceId` pada respons assessment juga menjadi `request_key` log normalisasi AI, termasuk ketika normalisasi gagal. Note mentah tidak disimpan pada log default. Assessment tanpa note tidak membuat log AI.

Request body:

```json
{
  "currentLevel": "JLPT_N5",
  "targetLevel": "JLPT_N4",
  "dailyGoalMinutes": 20,
  "preferredScript": "MIXED",
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
      "currentLevel": "JLPT_N5",
      "targetLevel": "JLPT_N4",
      "dailyGoalMinutes": 20,
      "preferredScript": "MIXED",
      "weakSkillFocuses": ["particles", "listening"]
    },
    "suggestedKnownSkillClaims": [
      {
        "skillCode": "hiragana_a_row",
        "title": "Hiragana A Row",
        "source": "ai_note",
        "confidence": 0.91
      }
    ],
    "recommendation": {
      "recommendedTrackSlug": "jlpt-n5-foundation",
      "recommendedUnitSlug": "n5-kana-basics",
      "nextLessonSlug": "hiragana-vowels-and-k-row"
    },
    "aiNormalizationUsed": true
  }
}
```

Validation notes:
- `targetLevel`, `dailyGoalMinutes`, dan `preferredScript` wajib diisi.
- Payload assessment memakai object strict tanpa field tambahan. `currentLevel`/`targetLevel` berupa string `1..50` karakter (current boleh absent atau `null`); daily goal integer `1..2147483647`; label weak focus `1..100` karakter; note maksimum `2000` karakter.
- `weakSkillFocuses` wajib dikirim sebagai array dan boleh kosong. Item dapat berupa label area belajar yang dipilih user, seperti `particles` atau `listening`; nilainya tidak diperlakukan sebagai `skill.code` syllabus.
- `knownSkillClaims` pada konfirmasi juga harus berisi `skill.code` dari syllabus yang dipublikasikan; jangan menyimpan label bebas atau suggestion AI yang belum dikonfirmasi.
- `targetLevel` harus memiliki track syllabus yang dipublikasikan sehingga recommendation menunjuk ke lesson yang nyata. N5/N4 merupakan kandidat publish, tetapi gate bank quiz `IMP-05` hanya mengimpor subtree lesson yang valid. Snapshot seed yang dicatat di [PRD](../../PRD.md#7-urutan-implementasi-dan-prasyarat-yang-masih-perlu-diselaraskan) menyediakan sebagian N5; N4 baru tersedia setelah kurasi dan seed ulang. Track `N3` dan `N2` masih skeleton belum dipublikasikan. Contoh N4 di kontrak mengasumsikan track tersebut sudah tersedia di database tujuan.
- `note` opsional dan tidak boleh langsung menjadi source of truth tanpa confirmation user.
- Gunakan `142203001` untuk payload validation generic, mis. field wajib hilang atau tipe data tidak sesuai.
- Gunakan `142203002` bila payload secara bentuk valid tetapi referensi personalization tidak cocok dengan katalog syllabus, mis. `targetLevel` belum dipublikasikan atau `knownSkillClaims` berisi `skill.code` yang tidak ditemukan.

### `POST /api/v1/personalization/assessment/confirm`
Menyimpan learner profile final setelah user mereview hasil draft.

Behavior:
- Menerima payload final yang sudah diedit/dikonfirmasi user.
- `personalization` boleh menghitung ulang recommendation final.
- Write final tetap masuk ke `users` untuk upsert `learner_profiles` dan `onboarding_completed = true`.
- Request POST wajib membawa `Origin` yang sama dengan origin aplikasi; jika tidak, respons `403` dikirim sebelum pemeriksaan session.

Request body:

```json
{
  "currentLevel": "JLPT_N5",
  "targetLevel": "JLPT_N4",
  "dailyGoalMinutes": 20,
  "preferredScript": "MIXED",
  "weakSkillFocuses": ["particles", "listening"],
  "knownSkillClaims": ["hiragana_a_row"]
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
      "appAccess": "APP_READY",
      "learnerProfile": {
        "currentLevel": "JLPT_N5",
        "targetLevel": "JLPT_N4",
        "dailyGoalMinutes": 20,
        "preferredScript": "MIXED",
        "weakSkillFocuses": ["particles", "listening"],
        "knownSkillClaims": ["hiragana_a_row"],
        "onboardingCompletedAt": "2026-04-04T10:00:00Z"
      }
    },
    "recommendation": {
      "recommendedTrackSlug": "jlpt-n5-foundation",
      "recommendedUnitSlug": "n5-kana-basics",
      "nextLessonSlug": "hiragana-vowels-and-k-row"
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
| `403` | `140301001` | Origin request assessment atau konfirmasi tidak sama dengan origin aplikasi |
| `422` | `142203001` | Validation error generic untuk payload/schema |
| `422` | `142203002` | Referensi personalization tidak valid terhadap katalog syllabus |
| `500` | `150003999` | Unhandled personalization exception |

## OpenAPI Artifact
- Swagger/OpenAPI contract untuk area ini disimpan di `docs/api-contract/openapi.user-profile-and-personalization.yaml`.

## Notes For Follow-up Tasks
- Endpoint progress, flashcards, dan practice nanti boleh mengandalkan `learner_profiles.onboarding_completed = true` sebagai access gate level aplikasi.
- Jika nanti settings profile non-onboarding ditambahkan, endpoint baru sebaiknya dipisah dari kontrak onboarding ini agar boundary `users` tetap jelas.
