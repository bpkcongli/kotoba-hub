# API Contract Flashcards

## Scope
- Dokumen ini menyelesaikan bagian `flashcards` dari task `ARCH-15`.
- Fokusnya adalah katalog deck, pembuatan custom deck, pembuatan session, dan submit answer flashcard sampai hasil progress terbaru siap dipakai UI.
- Dokumen ini diturunkan dari sequence diagram flashcard evaluation, progress handoff, dan ERD `flashcard_decks`, `flashcard_deck_items`, `flashcard_items`, `flashcard_sessions`, `flashcard_item_states`.

## Source References
- Sequence flashcard evaluation: [flashcard-and-answer-evaluation.md](../sequence-diagram/flashcard-and-answer-evaluation.md)
- Sequence progress handoff: [update-progress-snapshot.md](../sequence-diagram/update-progress-snapshot.md)
- ERD learning activity: [learning-activity.md](../erd/learning-activity.md)

## Domain ID
- `05` untuk `flashcards`

## Design Goals
- Menjaga `flashcards` tetap menjadi owner untuk deck catalog, session flow, deterministic answer evaluation, dan bucket update.
- Menyediakan kontrak minimum agar user bisa membuat custom deck miliknya sendiri dengan mereferensikan `flashcard_item` yang sudah ada, tanpa menduplikasi konten item.
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
| `deckSource` | `string` | no | Filter source deck. Nilai yang didukung: `SYSTEM`, `CUSTOM`, `ALL`. Default `ALL`. |
| `deckTypes` | `string` | no | Filter multi-value dengan separated commas, mis. `FOUNDATION,REVIEW`. |
| `unitSlug` | `string` | no | Filter deck berdasarkan scope unit syllabus. |

Behavior:
- Jika `deckSource = SYSTEM`, endpoint hanya mengembalikan deck system yang `is_published = true`.
- Jika `deckSource = CUSTOM`, endpoint hanya mengembalikan custom deck milik current user.
- Jika `deckSource = ALL` atau parameter tidak dikirim, endpoint mengembalikan keduanya.
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
        "deckSource": "SYSTEM",
        "deckType": "FOUNDATION",
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
Membuat custom flashcard deck milik current user dengan mereferensikan item flashcard yang sudah ada.

Request body:

```json
{
  "title": "My Basic Kanji Deck",
  "description": "Deck pribadi untuk review kanji dasar N5.",
  "deckType": "FOUNDATION",
  "unitSlug": "n5-kanji-basics",
  "items": [
    "uuid",
    "uuid"
  ]
}
```

Behavior:
- Membuat deck baru dengan `deck_source = CUSTOM`, `owner_user_id = current user`, dan `is_published = false`.
- Bila `unitSlug` dikirim, sistem memvalidasi referensinya terhadap katalog syllabus.
- Field `items` berisi array `itemId` yang mereferensikan `flashcard_item` existing, bukan definisi konten item baru.
- Jika `items` tidak dikirim atau array kosong, deck tetap boleh dibuat dalam keadaan tanpa item.
- Jika `items` dikirim, sistem membuat membership di `flashcard_deck_items` secara atomik bersama deck.
- Urutan item mengikuti urutan array `items`.
- Setiap `itemId` harus valid dan dapat diakses untuk dipakai di custom deck.
- Gunakan `142205001` untuk payload validation generic, mis. `items` bukan array string UUID.
- Gunakan `142205003` bila payload secara bentuk valid tetapi satu atau lebih `itemId` tidak sah untuk dipakai sebagai member custom deck.

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
    "deckSource": "CUSTOM",
    "deckType": "FOUNDATION",
    "unitSlug": "n5-kanji-basics",
    "sortOrder": 0,
    "itemCount": 2,
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
    "status": "ACTIVE",
    "startedAt": "2026-04-04T10:00:00Z",
    "deck": {
      "id": "uuid",
      "slug": "n5-kana-foundation",
      "title": "N5 Kana Foundation",
      "deckSource": "SYSTEM",
      "deckType": "FOUNDATION"
    },
    "sessionProgress": {
      "totalAnswered": 0,
      "correctCount": 0,
      "incorrectCount": 0
    },
    "currentItem": {
      "id": "uuid",
      "itemType": "HIRAGANA_CHARACTER",
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
- Mengubah bucket `NEW -> LEARNING -> MASTERED` sesuai hasil grading.
- Menyimpan update internal `flashcards` terlebih dahulu.
- Jika item punya mapping `skill_id` resmi, endpoint menjalankan handoff ke `progress` dan mengembalikan ringkasan efek snapshot terbaru.
- Jika item belum punya mapping `skill_id` resmi, endpoint tetap sukses untuk update internal `flashcards`, tetapi `progressImpact` bernilai `null`.

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
      "previousBucket": "NEW",
      "currentBucket": "LEARNING",
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
      "itemType": "HIRAGANA_CHARACTER",
      "promptText": "い",
      "promptPayload": {},
      "hintText": "Second vowel in hiragana."
    },
    "progressImpact": {
      "progressEventId": "uuid",
      "skillCode": "hiragana_basic",
      "masteryScore": 42.5,
      "masteryState": "DEVELOPING",
      "recommendedDifficultyBand": "STANDARD"
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
| `422` | `142205001` | Validation error generic untuk payload/schema |
| `422` | `142205002` | `itemId` tidak cocok dengan current item session |
| `422` | `142205003` | Satu atau lebih `itemId` tidak valid untuk custom deck |
| `500` | `150005999` | Unhandled flashcards exception |

## OpenAPI Artifact
- Swagger/OpenAPI contract untuk area ini disimpan di `docs/api-contract/openapi.flashcards.yaml`.

## Notes For Follow-up Tasks
- Kontrak ini baru mencakup create custom deck. Update deck, delete deck, dan item-level CRUD bisa ditambahkan terpisah bila kebutuhan edit deck sudah jelas.
- `progressImpact` sengaja dibuat ringkas; detail analytics penuh tetap di domain `progress`.
