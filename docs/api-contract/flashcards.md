# API Contract Flashcards

## Scope
- Dokumen ini menyelesaikan bagian `flashcards` dari task `ARCH-15`.
- Fokusnya adalah katalog deck, pembuatan custom deck, pembuatan session, dan submit answer flashcard sampai hasil progress terbaru siap dipakai UI.
- Dokumen ini diturunkan dari sequence diagram flashcard evaluation, progress handoff, dan ERD `flashcard_decks`, `flashcard_items`, `flashcard_sessions`, `flashcard_item_states`.

## Source References
- Sequence flashcard evaluation: [flashcard-and-answer-evaluation.md](../sequence-diagram/flashcard-and-answer-evaluation.md)
- Sequence progress handoff: [update-progress-snapshot.md](../sequence-diagram/update-progress-snapshot.md)
- ERD learning activity: [learning-activity.md](../erd/learning-activity.md)

## Domain ID
- `05` untuk `flashcards`

## Design Goals
- Menjaga `flashcards` tetap menjadi owner untuk deck catalog, session flow, deterministic answer evaluation, dan bucket update.
- Menyediakan kontrak minimum agar user bisa membuat custom deck miliknya sendiri tanpa mencampur ownership deck bawaan sistem.
- Menyediakan kontrak yang cukup untuk UI deck list, memulai session, dan merender feedback hasil jawaban.
- Menyertakan `progressImpact` ringkas pada response answer agar UI bisa langsung menampilkan efek write-through tanpa memanggil endpoint progress terpisah.

## Endpoint Summary

| Method | Path | Purpose | Access Requirement |
| --- | --- | --- | --- |
| `GET` | `/api/v1/flashcards/decks` | Mengambil daftar deck flashcard yang dapat diakses user | Authenticated + onboarding completed |
| `POST` | `/api/v1/flashcards/decks` | Membuat custom flashcard deck milik current user | Authenticated + onboarding completed |
| `POST` | `/api/v1/flashcards/sessions` | Membuat flashcard session baru untuk deck tertentu | Authenticated + onboarding completed |
| `POST` | `/api/v1/flashcards/sessions/{sessionId}/answer` | Menilai jawaban flashcard, mengubah bucket, dan menjalankan progress handoff | Authenticated + onboarding completed |

## Authorization Rules
- Semua endpoint di dokumen ini membutuhkan session valid dan `APP_READY`.
- Bila session tidak valid, kembalikan `401`.
- Bila session valid tetapi onboarding belum selesai, kembalikan `403`.

## Endpoint Details

### `GET /api/v1/flashcards/decks`
Mengambil daftar deck flashcard yang bisa dikerjakan user.

Query params:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `offset` | `integer` | no | Zero-based record offset. Default `0`. |
| `limit` | `integer` | no | Max records per page. Default `10`. |
| `deckSource` | `string` | no | Filter source deck. Nilai yang didukung: `system`, `custom`, `all`. Default `all`. |
| `deckTypes` | `string` | no | Filter multi-value dengan separated commas, mis. `foundation,review`. |
| `unitSlug` | `string` | no | Filter deck berdasarkan scope unit syllabus. |

Behavior:
- Jika `deckSource = system`, endpoint hanya mengembalikan deck system yang `is_published = true`.
- Jika `deckSource = custom`, endpoint hanya mengembalikan custom deck milik current user.
- Jika `deckSource = all` atau parameter tidak dikirim, endpoint mengembalikan keduanya.
- List response hanya membawa ringkasan deck, bukan seluruh item.

Success response:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120005000,
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
    "flashcardDecks": [
      {
        "id": "uuid",
        "slug": "n5-kana-foundation",
        "title": "N5 Kana Foundation",
        "description": "Review core hiragana and katakana.",
        "deckSource": "system",
        "deckType": "foundation",
        "unitSlug": "n5-kana-basics",
        "sortOrder": 1,
        "itemCount": 30,
        "isPublished": true
      }
    ]
  }
}
```

### `POST /api/v1/flashcards/decks`
Membuat custom flashcard deck milik current user beserta item awalnya.

Request body:

```json
{
  "title": "My Basic Kanji Deck",
  "description": "Deck pribadi untuk review kanji dasar N5.",
  "deckType": "foundation",
  "unitSlug": "n5-kanji-basics",
  "items": [
    {
      "itemType": "kanji_character",
      "skillCode": "kanji_n5_day",
      "promptText": "日",
      "promptPayload": {},
      "answerText": "nichi",
      "acceptedAnswers": ["nichi", "hi"],
      "hintText": "Basic N5 kanji for day or sun.",
      "explanationText": "Kanji 日 umum dipakai dengan bacaan にち atau ひ tergantung konteks."
    }
  ]
}
```

Behavior:
- Membuat deck baru dengan `deck_source = custom`, `owner_user_id = current user`, dan `is_published = false`.
- Bila `unitSlug` dikirim, sistem memvalidasi referensinya terhadap katalog syllabus.
- Bila `skillCode` dikirim pada item, sistem memvalidasi bahwa skill tersebut ada di katalog resmi.
- Semua item awal dibuat secara atomik bersama deck agar deck tidak tersimpan dalam keadaan kosong parsial.
- Urutan item mengikuti urutan array `items` bila client tidak mengirim metadata urutan lain.

Success response:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120005000,
    "message": "Success!",
    "errorDetails": []
  },
  "data": {
    "id": "uuid",
    "slug": null,
    "title": "My Basic Kanji Deck",
    "description": "Deck pribadi untuk review kanji dasar N5.",
    "deckSource": "custom",
    "deckType": "foundation",
    "unitSlug": "n5-kanji-basics",
    "sortOrder": 0,
    "itemCount": 1,
    "isPublished": false
  }
}
```

### `POST /api/v1/flashcards/sessions`
Membuat session baru untuk deck yang dipilih user.

Request body:

```json
{
  "deckId": "uuid"
}
```

Behavior:
- Memvalidasi bahwa deck dapat diakses current user.
- Membuat `flashcard_session` baru.
- Menentukan item awal yang akan dirender berdasarkan urutan deck dan due state user.
- Mengembalikan session snapshot beserta current item pertama.

Success response:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120005000,
    "message": "Success!",
    "errorDetails": []
  },
  "data": {
    "id": "uuid",
    "status": "active",
    "startedAt": "2026-04-04T10:00:00Z",
    "deck": {
      "id": "uuid",
      "slug": "n5-kana-foundation",
      "title": "N5 Kana Foundation",
      "deckSource": "system",
      "deckType": "foundation"
    },
    "sessionProgress": {
      "totalAnswered": 0,
      "correctCount": 0,
      "incorrectCount": 0
    },
    "currentItem": {
      "id": "uuid",
      "itemType": "hiragana_character",
      "promptText": "あ",
      "promptPayload": {},
      "hintText": "First vowel in hiragana."
    }
  }
}
```

### `POST /api/v1/flashcards/sessions/{sessionId}/answer`
Menilai jawaban flashcard, memperbarui bucket user, lalu meneruskan event ke `progress`.

Path params:

| Name | Type | Required | Notes |
| --- | --- | --- | --- |
| `sessionId` | `string` | yes | ID flashcard session milik current user. |

Request body:

```json
{
  "itemId": "uuid",
  "userAnswer": "a",
  "responseTimeMs": 1800
}
```

Behavior:
- Memuat `flashcard_session`, `flashcard_item`, dan `flashcard_item_state`.
- Menilai jawaban secara deterministik terhadap `answer_text` dan `accepted_answers`.
- Mengubah bucket `new -> learning -> mastered` sesuai hasil grading.
- Menyimpan update internal `flashcards` terlebih dahulu.
- Menjalankan handoff ke `progress` dan mengembalikan ringkasan efek snapshot terbaru.

Success response:

```json
{
  "status": {
    "traceId": "uuid",
    "code": 120005000,
    "message": "Success!",
    "errorDetails": []
  },
  "data": {
    "sessionId": "uuid",
    "itemId": "uuid",
    "isCorrect": true,
    "canonicalAnswer": "a",
    "acceptedAnswers": ["a"],
    "feedbackText": "Correct.",
    "explanationText": "This is the hiragana character for 'a'.",
    "bucketUpdate": {
      "previousBucket": "new",
      "currentBucket": "learning",
      "consecutiveCorrectCount": 1,
      "nextDueAt": "2026-04-04T12:00:00Z"
    },
    "sessionProgress": {
      "totalAnswered": 1,
      "correctCount": 1,
      "incorrectCount": 0,
      "isCompleted": false
    },
    "nextItem": {
      "id": "uuid",
      "itemType": "hiragana_character",
      "promptText": "い",
      "promptPayload": {},
      "hintText": "Second vowel in hiragana."
    },
    "progressImpact": {
      "progressEventId": "uuid",
      "skillCode": "hiragana_basic",
      "masteryScore": 42.5,
      "masteryState": "developing",
      "recommendedDifficultyBand": "standard"
    }
  }
}
```

## Suggested Error Code Seeds

| HTTP Status | Application Code | Meaning |
| --- | --- | --- |
| `200` | `120005000` | Flashcards success |
| `401` | `140105001` | Session tidak ada atau tidak valid untuk flashcards API |
| `403` | `140305001` | Onboarding belum selesai untuk flashcards API |
| `404` | `140405001` | Flashcard deck tidak ditemukan atau tidak bisa diakses |
| `404` | `140405002` | Flashcard session tidak ditemukan atau bukan milik user |
| `404` | `140405003` | Flashcard item tidak ditemukan dalam session aktif |
| `422` | `142205001` | Validation error generic |
| `422` | `142205002` | `itemId` tidak cocok dengan current item session |
| `500` | `150005999` | Unhandled flashcards exception |

## OpenAPI Artifact
- Swagger/OpenAPI contract untuk area ini disimpan di `docs/api-contract/openapi.flashcards.yaml`.

## Notes For Follow-up Tasks
- Kontrak ini baru mencakup create custom deck. Update deck, delete deck, dan item-level CRUD bisa ditambahkan terpisah bila kebutuhan edit deck sudah jelas.
- `progressImpact` sengaja dibuat ringkas; detail analytics penuh tetap di domain `progress`.
