# API Contract Syllabus

## Scope
- Dokumen ini menyelesaikan bagian `syllabus` dari task `ARCH-14`.
- Fokusnya adalah kontrak API read-only untuk course map, onboarding reference data, dan unit detail.
- Dokumen ini diturunkan dari ERD `tracks`, `units`, `lessons`, `skills`, `unit_skill_mappings` serta route-level requirement yang sudah dikunci di sequence diagram onboarding.

## Source References
- Sequence onboarding: [onboarding-personalization.md](../sequence-diagram/onboarding-personalization.md)
- ERD syllabus: [syllabus-domain.md](../erd/syllabus-domain.md)
- MVP plan public contract: [mvp-plan.md](../mvp-plan.md)

## Domain ID
- `04` untuk `syllabus`

## Design Goals
- Menyediakan read model yang cukup untuk dua kebutuhan utama MVP: onboarding reference data dan syllabus exploration.
- Menjaga `GET /api/v1/syllabus` tetap ringan dan mudah dipaginasi.
- Menjaga `GET /api/v1/syllabus/units/{unitSlug}` tetap menjadi detail tree utama untuk unit, lesson, dan skill.

## Endpoint Summary

| Method | Path | Purpose | Access Requirement |
| --- | --- | --- | --- |
| `GET` | `/api/v1/syllabus` | Mengambil daftar track syllabus yang dipublikasikan | Authenticated session |
| `GET` | `/api/v1/syllabus/units/{unitSlug}` | Mengambil detail satu unit lengkap dengan lesson dan skill | Authenticated + onboarding completed |

## Authorization Rules
- `GET /api/v1/syllabus` boleh diakses oleh user dengan state `ONBOARDING_REQUIRED` maupun `APP_READY`, karena onboarding wizard perlu membaca target level dan reference catalog awal.
- `GET /api/v1/syllabus/units/{unitSlug}` mewajibkan `APP_READY`, karena endpoint ini dipakai untuk area belajar inti setelah onboarding selesai.
- Bila session tidak valid, kembalikan `401`.
- Bila session valid tetapi onboarding belum selesai untuk endpoint unit detail, kembalikan `403`.

## Endpoint Details

### `GET /api/v1/syllabus`
Mengambil daftar track syllabus yang dipublikasikan.

Query params:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `offset` | `integer` | no | Zero-based record offset. Default `0`. |
| `limit` | `integer` | no | Max records per page. Default `10`. |
| `curriculumLevels` | `string` | no | Filter multi-value dengan separated commas, mis. `N5,N4`. |

Behavior:
- Hanya mengembalikan track yang `is_published = true`.
- Tiap track membawa summary yang cukup untuk course map dan onboarding.
- Endpoint ini tidak mengembalikan tree lesson/skill penuh agar response tetap ringan.

Success response:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120004000,
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
    "tracks": [
      {
        "id": "uuid",
        "slug": "jlpt-n5-foundation",
        "curriculumLevel": "N5",
        "title": "JLPT N5 Foundation",
        "description": "Core beginner syllabus.",
        "sortOrder": 1,
        "unitCount": 12,
        "foundationUnitSlug": "n5-kana-basics"
      }
    ]
  }
}
```

### `GET /api/v1/syllabus/units/{unitSlug}`
Mengambil detail satu unit, lengkap dengan lesson dan skill yang menjadi scope unit tersebut.

Path params:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `unitSlug` | `string` | yes | Slug unit yang stabil dan unik. |

Query params:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `includeLessons` | `boolean` | no | Default `true`. |
| `includeSkills` | `boolean` | no | Default `true`. Jika `false`, skill list tidak dirender detail. |

Behavior:
- Mengembalikan unit published yang valid.
- Menyertakan ringkasan parent track.
- Jika `includeLessons=true`, lesson diurutkan berdasarkan `sort_order`.
- Jika `includeSkills=true`, setiap lesson memuat daftar skill yang relevan dan unit juga memuat `unitSkills` untuk query cepat di client.

Success response:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120004000,
    "message": "Success!",
    "errorDetails": []
  },
  "data": {
    "id": "uuid",
    "slug": "n5-kana-basics",
    "title": "Kana Basics",
    "description": "Learn hiragana and katakana fundamentals.",
    "sortOrder": 1,
    "isFoundationUnit": true,
    "track": {
      "id": "uuid",
      "slug": "jlpt-n5-foundation",
      "curriculumLevel": "N5",
      "title": "JLPT N5 Foundation"
    },
    "lessons": [
      {
        "id": "uuid",
        "slug": "hiragana-row-a",
        "title": "Hiragana Row A",
        "learningObjective": "Recognize and read the first hiragana row.",
        "sortOrder": 1,
        "estimatedMinutes": 10,
        "skills": [
          {
            "id": "uuid",
            "code": "hiragana_basic",
            "slug": "hiragana-basic",
            "curriculumLevel": "N5",
            "title": "Hiragana Basics",
            "description": "Recognize and read basic hiragana.",
            "skillType": "kana",
            "supportsFlashcards": true,
            "supportsPracticeObjective": true,
            "supportsPracticeFreeResponse": false,
            "prerequisiteSkillCodes": []
          }
        ]
      }
    ],
    "unitSkills": [
      {
        "skillCode": "hiragana_basic",
        "lessonSlug": "hiragana-row-a",
        "isPrimary": true,
        "sortOrder": 1
      }
    ]
  }
}
```

## Suggested Error Code Seeds

| HTTP Status | Application Code | Meaning |
| --- | --- | --- |
| `200` | `120004000` | Syllabus success |
| `401` | `140104001` | Session tidak ada atau tidak valid untuk syllabus API |
| `403` | `140304001` | Onboarding belum selesai untuk endpoint syllabus detail yang memerlukan app access penuh |
| `404` | `140404001` | Unit slug tidak ditemukan |
| `422` | `142204001` | Query filter tidak valid |
| `500` | `150004999` | Unhandled syllabus exception |

## OpenAPI Artifact
- Swagger/OpenAPI contract untuk area ini disimpan di `docs/api-contract/openapi.syllabus.yaml`.

## Notes For Follow-up Tasks
- Contract progress/flashcard/practice nanti harus memakai `skill.code` dan mapping `skill -> lesson -> unit -> track` yang konsisten dengan payload syllabus ini.
- Jika nanti onboarding membutuhkan reference data yang lebih sempit, sebaiknya cukup ditambah query/filter pada endpoint ini, bukan membuat katalog duplikat di domain lain.
