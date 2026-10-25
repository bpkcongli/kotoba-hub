# API Contract Flashcards

## Scope
- Dokumen ini menyelesaikan bagian `flashcards` dari task `ARCH-15`.
- Fokusnya adalah katalog deck, pembuatan custom deck, pembuatan session, dan submit answer flashcard sampai hasil progress terbaru siap dipakai UI.
- Scope flashcard MVP dikunci untuk latihan karakter `KANJI`, `HIRAGANA`, `KATAKANA`, dan kosakata `VOCABULARY` yang masih cocok dievaluasi secara deterministic multiple-choice.
- Input jawaban tidak lagi berupa free-text. Semua session flashcard memakai multiple-choice dengan opsi jawaban yang dibentuk backend saat session dibuat.

## Source References
- Sequence flashcard evaluation: [flashcard-and-answer-evaluation.md](../sequence-diagram/flashcard-and-answer-evaluation.md)
- Sequence progress handoff: [update-progress-snapshot.md](../sequence-diagram/update-progress-snapshot.md)
- ERD learning activity: [learning-activity.md](../erd/learning-activity.md)

## Domain ID
- `05` untuk `flashcards`

## Design Goals
- Menjaga `flashcards` tetap menjadi owner untuk deck catalog, session flow, deterministic answer evaluation, dan bucket update.
- Menyediakan kontrak minimum agar user bisa membuat custom deck miliknya sendiri dengan mereferensikan `flashcard_item` yang sudah ada, tanpa menduplikasi konten item.
- Menyediakan kontrak yang cukup untuk UI deck list, start-session configuration, rendering current card, dan feedback hasil jawaban.
- Menyertakan `progressImpact` ringkas pada response answer agar UI bisa langsung menampilkan efek write-through tanpa memanggil endpoint progress terpisah.
- Mengunci keputusan UX bahwa `questionScriptMode` dan `answerScriptMode` dipilih sebelum session dimulai lalu tidak diubah saat session masih aktif. Jika user ingin pasangan mode lain, UI memulai session baru.
- Menjaga variasi difficulty multiple-choice dengan membentuk opsi final dari canonical answer dan distractor pool saat session dibuat, bukan mengirim empat opsi tetap yang sama untuk setiap item.

## Distractor Pool Mechanism
- Setiap `flashcard_item` menyimpan canonical answer data dan distractor pool per `answerScriptMode`, bukan daftar empat opsi final yang selalu tetap.
- Saat `POST /api/v1/flashcards/sessions` dipanggil, backend memilih jawaban benar dan sejumlah distractor yang masih plausibel untuk item-item di session tersebut.
- Distractor dipilih dari pool yang relevan dengan item dan script mode aktif, lalu disusun menjadi `answerOptions` final untuk turn yang akan ditampilkan.
- Snapshot opsi final itulah yang menjadi sumber grading deterministic ketika `POST /api/v1/flashcards/sessions/{sessionId}/answer` dipanggil.
- Dengan model ini, variasi pilihan jawaban tetap hidup antar session, tetapi hasil grading tetap stabil karena backend tidak membentuk ulang opsi saat submit answer.

## Script Mode Rules

Aturan di section ini bersifat deterministik berdasarkan `contentType` deck dan tidak perlu dikirim ulang di payload deck. UI boleh menurunkan opsi pre-session mode picker dari `contentType`, sedangkan backend tetap menjadi validator final saat `POST /api/v1/flashcards/sessions`.

### Deck `KANJI`
- `questionScriptMode` yang valid: `KANJI`, `KANA`, `ENGLISH`
- `answerScriptMode` yang valid:
  - bila pertanyaan `KANJI`, jawaban boleh `KANA` atau `ENGLISH`
  - bila pertanyaan `KANA`, jawaban boleh `KANJI` atau `ENGLISH`
  - bila pertanyaan `ENGLISH`, jawaban boleh `KANJI` atau `KANA`

### Deck `KANA`
- `questionScriptMode` yang valid: `KANA`, `ROMAJI`
- `answerScriptMode` yang valid:
  - bila pertanyaan `KANA`, jawaban `ROMAJI`
  - bila pertanyaan `ROMAJI`, jawaban `KANA`

### Deck `VOCABULARY`
- `questionScriptMode` yang valid: `JAPANESE`, `ENGLISH`
- `answerScriptMode` yang valid:
  - bila pertanyaan `JAPANESE`, jawaban `ENGLISH`
  - bila pertanyaan `ENGLISH`, jawaban `JAPANESE` atau `KANA`
- `KANA` pada vocabulary diperlakukan sebagai reading support atau opsi jawaban saat recall dari English, bukan sebagai `questionScriptMode` utama.
- `ROMAJI` tidak dipakai sebagai `questionScriptMode` vocabulary pada baseline kontrak ini.

### Why Session Locking Is Preferred
- Mengubah mode di tengah session berisiko mengubah tingkat kesulitan dan konteks recall pada item yang sama.
- Locking per session membuat progress, streak, dan Leitner bucket lebih adil untuk diinterpretasikan.
- UI jadi lebih sederhana: learner mengatur mode sekali di start sheet, lalu fokus menjawab.
- Jika learner ingin eksplorasi mode lain, pola UX yang lebih aman adalah `end/restart session with a different script pair`.

## Endpoint Summary

| Method | Path | Purpose | Access Requirement |
| --- | --- | --- | --- |
| `GET` | `/api/v1/flashcards/decks` | Mengambil daftar deck flashcard yang dapat diakses user | Authenticated + onboarding completed |
| `POST` | `/api/v1/flashcards/decks` | Membuat custom flashcard deck milik current user | Authenticated + onboarding completed |
| `POST` | `/api/v1/flashcards/sessions` | Membuat flashcard session baru untuk deck tertentu dengan script pair terpilih | Authenticated + onboarding completed |
| `POST` | `/api/v1/flashcards/sessions/{sessionId}/answer` | Menilai jawaban pilihan ganda, mengubah bucket, dan menjalankan progress handoff | Authenticated + onboarding completed |

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
| `contentType` | `string` | no | Filter keluarga deck: `KANJI`, `KANA`, `VOCABULARY`, atau `ALL`. Default `ALL`. |

Behavior:
- Jika `deckSource = SYSTEM`, endpoint hanya mengembalikan deck system yang `is_published = true`.
- Jika `deckSource = CUSTOM`, endpoint hanya mengembalikan custom deck milik current user.
- Jika `deckSource = ALL` atau parameter tidak dikirim, endpoint mengembalikan keduanya.
- List response hanya membawa ringkasan deck, bukan seluruh item.
- Setiap deck membawa `contentType`; pasangan `questionScriptMode` dan `answerScriptMode` diturunkan dari aturan pada section `Script Mode Rules`.

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
        "slug": "n5-kanji-group-1",
        "title": "JLPT N5 Kanji Group 1",
        "description": "Kanji dasar N5 dengan mode kanji, kana, dan English.",
        "deckSource": "SYSTEM",
        "deckType": "FOUNDATION",
        "contentType": "KANJI",
        "unitSlug": "n5-kanji-basics",
        "sortOrder": 1,
        "itemCount": 10,
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
  "title": "My N5 Vocabulary Deck",
  "description": "Deck pribadi untuk review kosakata dasar N5.",
  "deckType": "FOUNDATION",
  "contentType": "VOCABULARY",
  "unitSlug": "n5-greetings-and-basics",
  "items": [
    "uuid",
    "uuid"
  ]
}
```

Behavior:
- Membuat deck baru dengan `deck_source = CUSTOM`, `owner_user_id = current user`, dan `is_published = false`.
- `contentType` wajib dikirim agar custom deck tetap homogen sejak awal.
- Bila `unitSlug` dikirim, sistem memvalidasi referensinya terhadap katalog syllabus.
- Field `items` berisi array `itemId` yang mereferensikan `flashcard_item` existing, bukan definisi konten item baru.
- Jika `items` tidak dikirim atau array kosong, deck tetap boleh dibuat selama `contentType` valid.
- Jika `items` dikirim, semua item harus memiliki keluarga konten yang cocok dengan `contentType` deck.
- Jika `items` dikirim, sistem membuat membership di `flashcard_deck_items` secara atomik bersama deck.
- Urutan item mengikuti urutan array `items`.
- Gunakan `142205001` untuk payload validation generic.
- Gunakan `142205002` bila payload secara bentuk valid tetapi satu atau lebih `itemId` tidak sah untuk dipakai sebagai member custom deck.
- Gunakan `142205003` bila item valid tetapi mencampur keluarga konten yang berbeda, atau tidak cocok dengan `contentType` deck.

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
    "title": "My N5 Vocabulary Deck",
    "description": "Deck pribadi untuk review kosakata dasar N5.",
    "deckSource": "CUSTOM",
    "deckType": "FOUNDATION",
    "contentType": "VOCABULARY",
    "unitSlug": "n5-greetings-and-basics",
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
  "deckId": "uuid",
  "questionScriptMode": "KANJI",
  "answerScriptMode": "ENGLISH"
}
```

Behavior:
- Memvalidasi bahwa deck dapat diakses current user.
- Memvalidasi bahwa kombinasi `questionScriptMode` dan `answerScriptMode` valid untuk `contentType` deck.
- Membuat `flashcard_session` baru dan menyimpan script pair tersebut di session.
- Menentukan item awal yang akan dirender berdasarkan urutan deck dan due state user.
- Membentuk opsi jawaban final untuk item-item session dari canonical answer dan distractor pool yang relevan dengan script pair terpilih.
- Mengembalikan session snapshot beserta current item pertama dan opsi jawaban multiple-choice yang sudah dibentuk backend.
- Semua membership aktif dan eligible dibawa sekali; item baru/sudah due didahulukan sebelum item belum due, lalu urutan deck. Deck kosong atau item tanpa distractor unik ditolak dengan `142205001`.
- Script mode pada session dianggap locked. Perubahan mode dilakukan dengan membuat session baru.
- Untuk deck `VOCABULARY`, `prompt.value` biasanya berisi surface form Jepang atau arti bahasa Inggris sesuai `questionScriptMode`, sementara opsi jawaban mengikuti bentuk pasangan canonical yang sudah disiapkan item.

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
      "slug": "n5-kanji-group-1",
      "title": "JLPT N5 Kanji Group 1",
      "deckSource": "SYSTEM",
      "deckType": "FOUNDATION",
      "contentType": "KANJI"
    },
    "sessionConfig": {
      "questionScriptMode": "KANJI",
      "answerScriptMode": "ENGLISH",
      "isLocked": true
    },
    "sessionProgress": {
      "totalItems": 10,
      "totalAnswered": 0,
      "correctCount": 0,
      "incorrectCount": 0
    },
    "currentItem": {
      "id": "uuid",
      "itemType": "KANJI_CHARACTER",
      "prompt": {
        "scriptMode": "KANJI",
        "value": "日"
      },
      "answerOptions": [
        {
          "id": "opt_1",
          "scriptMode": "ENGLISH",
          "value": "day / sun"
        },
        {
          "id": "opt_2",
          "scriptMode": "ENGLISH",
          "value": "month / moon"
        },
        {
          "id": "opt_3",
          "scriptMode": "ENGLISH",
          "value": "fire"
        },
        {
          "id": "opt_4",
          "scriptMode": "ENGLISH",
          "value": "tree"
        }
      ]
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
  "selectedOptionId": "opt_1",
  "responseTimeMs": 1800
}
```

Behavior:
- Memuat `flashcard_session`, `flashcard_item`, `flashcard_item_state`, dan script pair session.
- Memastikan `itemId` cocok dengan current item session aktif.
- Memastikan `selectedOptionId` ada di opsi jawaban current item.
- Menilai jawaban secara deterministik terhadap snapshot opsi jawaban yang sudah dibentuk saat session dibuat.
- Mengubah bucket `NEW -> LEARNING -> MASTERED` sesuai hasil grading.
- Menyimpan update internal `flashcards` terlebih dahulu, termasuk log di `flashcard_session_answers`.
- Jika item punya mapping `skill_id` resmi, endpoint menjalankan handoff ke `progress` dan mengembalikan ringkasan efek snapshot terbaru.
- Jika item belum punya mapping `skill_id` resmi, endpoint tetap sukses untuk update internal `flashcards`, tetapi `progressImpact` bernilai `null`.
- Replay payload jawaban identik (`itemId`, `selectedOptionId`, `responseTimeMs`, termasuk nilai `null`/tidak dikirim yang dinormalisasi ke `null`) memakai hasil tersimpan; tidak menambah turn, bucket, atau event. Jika progress handoff sebelumnya gagal setelah jawaban tersimpan, replay melanjutkan handoff dengan UUID event yang sama. Replay berbeda untuk item yang sudah dijawab ditolak `142205005`.
- Jadwal bucket: benar pertama `LEARNING` +2 jam; benar kedua/berikutnya `MASTERED` +24 jam; salah `LEARNING`, streak nol, +10 menit. Detail persistence mengikuti [Flashcard Engine v1](../erd/learning-activity.md#flashcard-engine-v1-imp-07).
- Feedback response dibedakan menurut tipe item:
  - untuk `KANJI_CHARACTER`, kirim penjelasan lengkap: kanji, English meaning, kunyomi, onyomi, dan contoh kata
  - untuk `VOCABULARY`, kirim penjelasan ringkas: term Jepang, reading kana bila ada, dan English meaning utama
  - untuk `HIRAGANA_CHARACTER` atau `KATAKANA_CHARACTER`, kirim feedback default: correct answer, bucket update, dan progress update tanpa panel penjelasan panjang

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
    "selectedOptionId": "opt_1",
    "correctOptionId": "opt_1",
    "isCorrect": true,
    "correctAnswer": {
      "scriptMode": "ENGLISH",
      "value": "day / sun"
    },
    "feedback": {
      "variant": "KANJI_EXPLANATION",
      "headline": "Correct answer: day / sun",
      "bucketMessage": "Bucket promoted to LEARNING.",
      "progressMessage": "Progress updated.",
      "kanjiDetails": {
        "character": "日",
        "englishMeaning": "day / sun",
        "onyomi": ["ニチ", "ジツ"],
        "kunyomi": ["ひ", "び", "か"],
        "exampleWords": [
          {
            "word": "日本",
            "kana": "にほん",
            "meaning": "Japan"
          },
          {
            "word": "休日",
            "kana": "きゅうじつ",
            "meaning": "holiday"
          }
        ]
      }
    },
    "bucketUpdate": {
      "previousBucket": "NEW",
      "currentBucket": "LEARNING",
      "consecutiveCorrectCount": 1,
      "nextDueAt": "2026-04-04T12:00:00Z"
    },
    "sessionProgress": {
      "totalItems": 10,
      "totalAnswered": 1,
      "correctCount": 1,
      "incorrectCount": 0,
      "isCompleted": false
    },
    "nextItem": {
      "id": "uuid",
      "itemType": "KANJI_CHARACTER",
      "prompt": {
        "scriptMode": "KANJI",
        "value": "月"
      },
      "answerOptions": [
        {
          "id": "opt_1",
          "scriptMode": "ENGLISH",
          "value": "month / moon"
        },
        {
          "id": "opt_2",
          "scriptMode": "ENGLISH",
          "value": "day / sun"
        },
        {
          "id": "opt_3",
          "scriptMode": "ENGLISH",
          "value": "water"
        },
        {
          "id": "opt_4",
          "scriptMode": "ENGLISH",
          "value": "gold"
        }
      ]
    },
    "progressImpact": {
      "progressEventId": "uuid",
      "skillCode": "n5_kanji_day",
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
| `422` | `142205002` | Satu atau lebih `itemId` tidak valid untuk custom deck |
| `422` | `142205003` | Custom deck mencampur keluarga item berbeda atau tidak cocok dengan `contentType` |
| `422` | `142205004` | Kombinasi `questionScriptMode` dan `answerScriptMode` tidak valid untuk deck |
| `422` | `142205005` | `itemId` tidak cocok dengan current item session |
| `422` | `142205006` | `selectedOptionId` tidak termasuk opsi pada current item |
| `500` | `150005999` | Unhandled flashcards exception |

## OpenAPI Artifact
- Swagger/OpenAPI contract untuk area ini disimpan di `docs/api-contract/openapi.flashcards.yaml`.

## Notes For Follow-up Tasks
- Kontrak ini baru mencakup create custom deck. Update deck, delete deck, dan item-level CRUD bisa ditambahkan terpisah bila kebutuhan edit deck sudah jelas.
- `progressImpact` sengaja dibuat ringkas; detail analytics penuh tetap di domain `progress`.
- Jika nanti dibutuhkan accessibility override untuk ganti script mode di tengah jalan, sebaiknya diperlakukan sebagai `restart session` agar fairness dan jejak progress tetap stabil.
