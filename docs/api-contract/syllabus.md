# API Contract Syllabus

## Scope
- Dokumen ini menyelesaikan bagian `syllabus` dari task `ARCH-14`.
- Fokusnya adalah kontrak API read-only untuk course map, onboarding reference data, unit detail, dan lesson detail.
- Dokumen ini diturunkan dari ERD `tracks`, `units`, `lessons`, `lesson_content_blocks`, `skills`, `unit_skill_mappings` serta route-level requirement yang sudah dikunci di sequence diagram onboarding.

## Source References
- Sequence onboarding: [onboarding-personalization.md](../sequence-diagram/onboarding-personalization.md)
- ERD syllabus: [syllabus-domain.md](../erd/syllabus-domain.md)
- MVP plan public contract: [mvp-plan.md](../mvp-plan.md)

## Domain ID
- `04` untuk `syllabus`

## Design Goals
- Menyediakan read model yang cukup untuk dua kebutuhan utama MVP: onboarding reference data dan syllabus exploration.
- Menjaga `GET /api/v1/syllabus` tetap ringan dan mudah dipaginasi.
- Menjaga `GET /api/v1/syllabus/units/{unitSlug}` tetap menjadi detail tree utama untuk unit, lesson summary, dan skill mapping.
- Menyediakan endpoint lesson detail yang khusus memuat blok materi lesson tanpa membebani response unit detail.
- Menyediakan metadata lesson yang cukup untuk memulai `post-study quiz` sesudah learner selesai membaca materi, sambil tetap menempatkan bank soal canonical di source-of-truth `syllabus`.

## Endpoint Summary

| Method | Path | Purpose | Access Requirement |
| --- | --- | --- | --- |
| `GET` | `/api/v1/syllabus` | Mengambil daftar track syllabus yang dipublikasikan | Authenticated session |
| `GET` | `/api/v1/syllabus/units/{unitSlug}` | Mengambil detail satu unit lengkap dengan lesson summary dan skill | Authenticated + onboarding completed |
| `GET` | `/api/v1/syllabus/lessons/{lessonSlug}` | Mengambil detail satu lesson lengkap dengan blok materi lesson | Authenticated + onboarding completed |

## Authorization Rules
- `GET /api/v1/syllabus` boleh diakses oleh user dengan state `ONBOARDING_REQUIRED` maupun `APP_READY`, karena onboarding wizard perlu membaca target level dan reference catalog awal.
- `GET /api/v1/syllabus/units/{unitSlug}` mewajibkan `APP_READY`, karena endpoint ini dipakai untuk area belajar inti setelah onboarding selesai.
- `GET /api/v1/syllabus/lessons/{lessonSlug}` juga mewajibkan `APP_READY`, karena endpoint ini menjadi source utama untuk membaca materi lesson.
- Bila session tidak valid, kembalikan `401`.
- Bila session valid tetapi onboarding belum selesai untuk endpoint unit detail atau lesson detail, kembalikan `403`.

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
        "unitCount": 10,
        "foundationUnitSlug": "n5-kana-basics"
      }
    ]
  }
}
```

### `GET /api/v1/syllabus/units/{unitSlug}`
Mengambil detail satu unit, lengkap dengan lesson summary dan skill yang menjadi scope unit tersebut.

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
- Endpoint ini sengaja hanya memuat lesson summary dan tidak membawa `contentBlocks`; materi baca lengkap diambil lewat endpoint lesson detail.

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
            "code": "hiragana_a_row",
            "slug": "hiragana-a-row",
            "curriculumLevel": "N5",
            "title": "Hiragana A Row",
            "description": "Recognize and read the hiragana A-row characters.",
            "skillType": "KANA",
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
        "skillCode": "hiragana_a_row",
        "lessonSlug": "hiragana-row-a",
        "isPrimary": true,
        "sortOrder": 1
      }
    ]
  }
}
```

### `GET /api/v1/syllabus/lessons/{lessonSlug}`
Mengambil detail satu lesson, lengkap dengan parent unit, parent track, blok materi lesson, dan skill yang diperkenalkan lesson tersebut.

Path params:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `lessonSlug` | `string` | yes | Slug lesson yang stabil dan unik. |

Query params:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `includeContentBlocks` | `boolean` | no | Default `true`. Jika `false`, blok materi tidak dirender. |
| `includeSkills` | `boolean` | no | Default `true`. Jika `false`, skill list tidak dirender detail. |

Behavior:
- Mengembalikan lesson published yang valid.
- Menyertakan ringkasan parent unit dan parent track.
- Jika `includeContentBlocks=true`, `contentBlocks` diurutkan berdasarkan `sort_order`.
- Setiap item `contentBlocks` membawa satu field `content` bertipe JSON; shape payload di dalamnya bergantung pada `blockType`.
- Jika `includeSkills=true`, response tetap menyertakan skill introduksi utama lesson.
- Response juga menyertakan metadata `postStudyQuiz` agar UI tahu bahwa lesson wajib dilanjutkan ke quiz lesson deterministik berisi tepat `1` soal `SHORT_FREE_RESPONSE` dari bank `10` tingkat kesulitan. Pengambilan soal dan submit jawaban dilakukan melalui endpoint direct `practice/lesson-post-study/*`, bukan melalui practice session.

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
    "slug": "hiragana-row-a",
    "title": "Hiragana Row A",
    "learningObjective": "Recognize and read the first hiragana row.",
    "sortOrder": 1,
    "estimatedMinutes": 10,
    "track": {
      "id": "uuid",
      "slug": "jlpt-n5-foundation",
      "curriculumLevel": "N5",
      "title": "JLPT N5 Foundation"
    },
    "unit": {
      "id": "uuid",
      "slug": "n5-kana-basics",
      "title": "Kana Basics",
      "sortOrder": 1
    },
    "contentBlocks": [
      {
        "id": "uuid",
        "blockType": "PARAGRAPH",
        "content": {
          "title": "Core Sound Pattern",
          "body": "<p>The A-row introduces the five core vowel sounds used throughout later lessons.</p>"
        },
        "sortOrder": 1
      },
      {
        "id": "uuid",
        "blockType": "EXAMPLE_SENTENCE",
        "content": {
          "japaneseSentence": "<p>あさです。</p>",
          "englishTranslation": "<p>It is morning.</p>"
        },
        "sortOrder": 2
      }
    ],
    "postStudyQuiz": {
      "isRequired": true,
      "practiceMode": "DIRECT_LESSON_POST_STUDY",
      "deliveryMode": "DETERMINISTIC_CURATED",
      "questionType": "SHORT_FREE_RESPONSE",
      "questionCountPerAttempt": 1,
      "bankQuestionCount": 10,
      "difficultyLevelStart": 1,
      "difficultyLevelEnd": 10,
      "initialUnderstandingLevel": 0,
      "maxUnderstandingLevel": 10
    },
    "skills": [
      {
        "id": "uuid",
        "code": "hiragana_a_row",
        "slug": "hiragana-a-row",
        "curriculumLevel": "N5",
        "title": "Hiragana A Row",
        "description": "Recognize and read the hiragana A-row characters.",
        "skillType": "KANA",
        "supportsFlashcards": true,
        "supportsPracticeObjective": true,
        "supportsPracticeFreeResponse": false,
        "prerequisiteSkillCodes": []
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
| `404` | `140404002` | Lesson slug tidak ditemukan |
| `422` | `142204001` | Query filter tidak valid |
| `500` | `150004999` | Unhandled syllabus exception |

## OpenAPI Artifact
- Swagger/OpenAPI contract untuk area ini disimpan di `docs/api-contract/openapi.syllabus.yaml`.

## Notes For Follow-up Tasks
- Contract progress/flashcard/practice nanti harus memakai `skill.code` dan mapping `skill -> lesson -> unit -> track` yang konsisten dengan payload syllabus ini.
- Jika nanti onboarding membutuhkan reference data yang lebih sempit, sebaiknya cukup ditambah query/filter pada endpoint ini, bukan membuat katalog duplikat di domain lain.
- Surface belajar yang benar-benar menampilkan paragraf materi sebaiknya membaca `GET /api/v1/syllabus/lessons/{lessonSlug}`, bukan memaksa `GET /api/v1/syllabus/units/{unitSlug}` membawa seluruh blok konten sekaligus.
- Lesson detail tetap read-only. Status completion lesson dan hasil `post-study quiz` tidak dihasilkan di endpoint ini; keduanya diturunkan dari boundary `practice` dan `progress.lesson_understanding_snapshots`.
- Endpoint ini tidak perlu mengembalikan seluruh bank soal canonical. Client cukup menerima metadata policy, lalu meminta session aktual ke endpoint `practice`.
