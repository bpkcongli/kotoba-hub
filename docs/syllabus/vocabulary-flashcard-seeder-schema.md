# Vocabulary Flashcard Seeder Schema

## Scope
- Dokumen ini mendefinisikan kontrak planning untuk seeder system flashcard deck `VOCABULARY`.
- Fokusnya adalah menutup gap antara syllabus seed final yang sudah canonical dan artifact flashcard seed yang nanti dipakai implementasi `IMP-07`.
- Dokumen ini sekarang juga mengunci bagaimana candidate vocabulary `N5` dari `JMdict + yomitan-jlpt-vocab` yang belum punya mapping lesson resmi tetap bisa di-seed tanpa mengubah seed syllabus published terlebih dulu.

## Positioning Decision
- `VOCABULARY` tetap menjadi `skill` canonical di syllabus dan tetap membawa ownership `track -> unit -> lesson -> skill`.
- `VOCABULARY` tidak wajib muncul sebagai materi bacaan utama di `lesson.contentBlocks`.
- `VOCABULARY` juga tidak wajib menjadi bagian canonical `lesson.postStudyQuestions`, kecuali ada alasan pedagogis khusus di masa depan.
- Learning surface utama untuk vocabulary pada baseline ini adalah system flashcard deck bawaan yang mereferensikan `skill` vocabulary tersebut.
- Candidate vocabulary `N5` yang belum punya owner lesson resmi tidak langsung ditulis ke `content/syllabus/tracks/*.json`; item itu masuk dulu ke registry pending dan backlog deck track-scoped.

## Source Dependencies

### Canonical Curriculum Input
- `content/syllabus/manifest.json`
- `content/syllabus/tracks/jlpt-n5-foundation.json`
- `content/syllabus/tracks/jlpt-n4-expansion.json`

Aturan input mapped:
- Hanya track published yang diproses.
- Hanya `skillType = VOCABULARY` yang diproses.
- Hanya skill dengan `supportsFlashcards = true` dan `isPublished = true` yang boleh masuk output mapped.
- Script membaca final track seed yang sudah atomik, bukan dokumen authoring `SYL-05` mentah.

### Raw Candidate Input For Pending `N5`
- `content/syllabus/sources/jmdict/raw/2026-05-16/JMdict_e.gz`
- `content/syllabus/sources/yomitan-jlpt-vocab/raw/2026-05-16/source-main.zip`

Aturan input pending:
- Candidate `N5` diambil dari `original_data/n5.csv` milik snapshot `yomitan-jlpt-vocab`.
- Dedup dilakukan per `JMdict ent_seq`, bukan per spelling surface.
- Jika satu `ent_seq` muncul lebih dari sekali pada CSV overlay, generator memilih satu representasi surface yang paling dekat dengan canonical spelling/reading `JMdict`.
- Candidate yang sudah punya owner resmi di published `jlpt-n5-foundation` tidak digandakan lagi ke registry pending.

### Lexical And JLPT Provenance
- Lexical/base layer: `JMdict`
- JLPT signal overlay: `yomitan-jlpt-vocab`
- Placement `track/unit/lesson` final untuk item mapped tetap mengikuti syllabus KotobaHub, bukan diambil ulang dari provider eksternal.

Konsekuensi:
- Seeder tidak boleh memperlakukan `yomitan-jlpt-vocab` sebagai lexical truth baru.
- Untuk item mapped, source of truth owner tetap skill syllabus canonical.
- Untuk candidate pending `N5`, generator boleh membuat `skillCode` baru yang stabil tanpa `skillId`, selama item itu ditandai `PENDING_LESSON_MAPPING` dan tidak berpura-pura punya `unitSlug` atau `lessonSlug`.

## Planned Script Contract
- Target script path: `scripts/generate_vocabulary_flashcard_seed.py`
- Tujuan script:
  - membaca syllabus seed published `N5` dan `N4`
  - memilih skill vocabulary yang eligible untuk flashcards
  - menggabungkan semua candidate `N5` dari `JMdict + yomitan-jlpt-vocab` yang belum termapping lesson
  - menghasilkan artifact seed flashcard vocabulary dan registry pending skill code yang repo-native dan bisa diaudit

### Suggested CLI

```bash
python3 scripts/generate_vocabulary_flashcard_seed.py
```

CLI baseline tidak perlu banyak argumen lebih dulu selama:
- input default sudah jelas
- output default stabil
- script gagal dengan error yang eksplisit bila input syllabus atau raw source tidak valid

## Planned Output Layout

```text
content/
  flashcards/
    system-decks/
      vocabulary-foundation.json
      vocabulary-foundation-pending-n5-skill-codes.json
```

Catatan:
- Artifact utama tetap dipisahkan dari `content/syllabus/` agar boundary seed syllabus dan seed flashcards tetap jelas.
- Registry pending dipisah dari artifact utama agar mapping lesson bisa dikerjakan belakangan tanpa kehilangan daftar skill code baru yang stabil.

## Output A: Main Deck Seed

### Top-Level Payload Shape

```json
{
  "schemaVersion": "1.0.0",
  "generatedAt": "2026-06-17",
  "deckSource": "SYSTEM",
  "deckType": "FOUNDATION",
  "contentType": "VOCABULARY",
  "decks": [],
  "items": [],
  "deckItems": []
}
```

Rules:
- `deckSource` saat ini harus `SYSTEM`.
- `deckType` saat ini harus `FOUNDATION`.
- `contentType` saat ini harus `VOCABULARY`.
- Semua `decks`, `items`, dan `deckItems` harus bisa diturunkan deterministik dari syllabus seed dan raw source yang sama.

### Deck Schema

```json
{
  "id": "uuid",
  "slug": "n5-self-introduction-and-copula-vocabulary-foundation-part-01",
  "trackSlug": "jlpt-n5-foundation",
  "unitSlug": "n5-self-introduction-and-copula",
  "title": "N5 Self Introduction And Copula Vocabulary Part 1",
  "description": "System vocabulary deck for the N5 self-introduction unit. Part 1 of 2. Contains 10 items.",
  "sortOrder": 1,
  "isPublished": true,
  "sourceSkillCodes": [
    "n5_vocab_greetings_and_polite_openers",
    "n5_vocab_basic_self_intro_phrases",
    "n5_vocab_identity_and_roles"
  ],
  "mappingStatus": "SYLLABUS_MAPPED",
  "segmentIndex": 1,
  "segmentCount": 2,
  "itemCount": 10
}
```

Rules:
- Satu deck selalu homogen: `VOCABULARY`.
- Untuk family deck mapped, boundary canonical tetap `unit + contentType`.
- Untuk family deck pending `N5`, boundary canonical adalah `track + contentType` karena lesson mapping belum final.
- Setiap deck system harus membawa `1..10` item.
- Jika family deck punya lebih dari `10` item, generator harus membuat segment baru.
- Semua segment selain segment terakhir harus berisi tepat `10` item.
- Segment terakhir boleh menjadi remainder `1..9` item.
- `slug` family mapped mengikuti pola `{unitSlug}-vocabulary-foundation` lalu ditambah suffix `-part-{nn}` bila segment lebih dari satu.
- `slug` family pending mengikuti pola `jlpt-n5-foundation-vocabulary-foundation-unmapped` lalu ditambah suffix `-part-{nn}` bila segment lebih dari satu.
- `unitSlug` boleh `null` hanya untuk deck `PENDING_LESSON_MAPPING`.

### Item Schema

```json
{
  "id": "uuid",
  "skillId": null,
  "skillCode": "n5_vocab_jmdict_1198180",
  "trackSlug": "jlpt-n5-foundation",
  "unitSlug": null,
  "lessonSlug": null,
  "itemType": "VOCABULARY",
  "surfaceFormText": "会う",
  "kanaDisplayText": "あう",
  "romajiText": null,
  "englishMeaning": "to meet",
  "alternateSpellings": [],
  "readings": ["あう"],
  "glossesEn": ["to meet"],
  "partsOfSpeech": ["Godan verb with 'u' ending"],
  "priorityTags": ["ichi1"],
  "fields": [],
  "commonnessRankBucket": "VERY_COMMON",
  "curriculumSignals": {
    "jlpt": {
      "resolvedLevel": "N5",
      "candidates": [
        {
          "provider": "YOMITAN_JLPT_VOCAB",
          "level": "N5",
          "mappedBy": "JMdict ent_seq"
        }
      ]
    }
  },
  "sourceRefs": [
    {
      "provider": "JMDICT",
      "category": "LEXICAL_ENTRY",
      "externalId": "1198180",
      "sourceUrl": "https://www.edrdg.org/jmdict/j_jmdict.html"
    }
  ],
  "answerOptionPayload": {
    "schemaVersion": 1,
    "canonicalAnswers": {
      "JAPANESE": ["会う"],
      "KANA": ["あう"],
      "ENGLISH": ["to meet"]
    },
    "distractorPoolItemIds": []
  },
  "mappingStatus": "PENDING_LESSON_MAPPING",
  "explanationText": null,
  "isActive": true
}
```

Rules:
- Satu `skill` vocabulary syllabus final tetap menghasilkan tepat satu `item` mapped.
- Candidate pending `N5` juga menghasilkan satu `item`, tetapi `skillId`, `unitSlug`, dan `lessonSlug` harus `null`.
- `skillCode` pending harus stabil dan lesson-agnostic. Konvensi baseline: `n5_vocab_jmdict_{ent_seq}`.
- `surfaceFormText` memilih representative surface hasil resolve `JMdict + Yomitan N5 CSV`.
- `englishMeaning` memakai gloss `JMdict` utama; `waller_definition` hanya fallback bila gloss utama perlu dilengkapi.
- `mappingStatus` harus:
  - `SYLLABUS_MAPPED` untuk item yang berasal dari published syllabus skill
  - `PENDING_LESSON_MAPPING` untuk candidate `N5` yang belum punya owner lesson resmi

### Deck Membership Schema

```json
{
  "deckId": "uuid",
  "itemId": "uuid",
  "sortOrder": 1,
  "trackSlug": "jlpt-n5-foundation",
  "unitSlug": null,
  "lessonSlug": null,
  "skillCode": "n5_vocab_jmdict_1198180",
  "mappingStatus": "PENDING_LESSON_MAPPING"
}
```

Rules:
- Membership ordering mapped mengikuti aturan `SYL-06A`:
  1. `lesson.sortOrder`
  2. urutan handle skill di lesson
  3. urutan item atomik di dalam handle tersebut
- Setelah urutan family final didapat, generator memecahnya ke segment `10` item dan mengulang `sortOrder` dari `1` per deck.
- Membership pending mewarisi `trackSlug`, `unitSlug`, `lessonSlug`, dan `mappingStatus` dari item-nya.

## Output B: Pending Skill Code Registry

### Registry Payload Shape

```json
{
  "schemaVersion": "1.0.0",
  "generatedAt": "2026-06-17",
  "trackSlug": "jlpt-n5-foundation",
  "curriculumLevel": "N5",
  "sourceProviders": ["JMDICT", "YOMITAN_JLPT_VOCAB"],
  "items": []
}
```

Rules:
- Registry ini hanya memuat candidate `N5` yang belum punya mapping lesson resmi di syllabus published.
- Registry ini menjadi daftar skill code baru yang nanti bisa di-map ke lesson setelah perubahan silabus disetujui.
- Registry tidak mengubah `content/syllabus/tracks/*.json` secara langsung.

## Mapping To Current ERD

| Seeder field | ERD target |
| --- | --- |
| `decks[].id` | `flashcard_decks.id` |
| `decks[].slug` | `flashcard_decks.slug` |
| `decks[].unitSlug` | resolve ke `flashcard_decks.unit_id` melalui `units.slug`; `null` untuk deck lintas unit |
| `decks[].title` | `flashcard_decks.title` |
| `decks[].description` | `flashcard_decks.description` |
| `schema deckSource` | `flashcard_decks.deck_source` |
| `schema deckType` | `flashcard_decks.deck_type` |
| `schema contentType` | `flashcard_decks.content_type` |
| `decks[].sortOrder` | `flashcard_decks.sort_order` |
| `decks[].isPublished` | `flashcard_decks.is_published` |
| `items[].id` | `flashcard_items.id` |
| `items[].skillId` | `flashcard_items.skill_id`; boleh `null` |
| `items[].itemType` | `flashcard_items.item_type` |
| `items[].surfaceFormText` | `flashcard_items.surface_form_text` |
| `items[].kanaDisplayText` | `flashcard_items.kana_display_text` |
| `items[].romajiText` | `flashcard_items.romaji_text` |
| `items[].englishMeaning` | `flashcard_items.english_meaning` |
| `items[].answerOptionPayload` | `flashcard_items.answer_option_payload` |
| `items[].explanationText` | `flashcard_items.explanation_text` |
| `items[].isActive` | `flashcard_items.is_active` |
| `deckItems[].deckId` | `flashcard_deck_items.deck_id` |
| `deckItems[].itemId` | `flashcard_deck_items.item_id` |
| `deckItems[].sortOrder` | `flashcard_deck_items.sort_order` |

Catatan:
- ERD `flashcard_decks.unit_id` memang nullable untuk deck lintas unit.
- ERD `flashcard_items.skill_id` memang nullable untuk item yang belum punya pemetaan ke katalog syllabus resmi.
- Dengan begitu, backlog candidate `N5` tetap sah sebagai artifact flashcard system walau `progressImpact` nanti harus `null` sampai mapping lesson resmi selesai.

## Validation Rules
- Script harus gagal bila menemukan skill `VOCABULARY` mapped yang `supportsFlashcards = true` tetapi tidak punya `content.vocabulary.primarySpelling` atau reading fallback yang layak.
- Script harus gagal bila ada `skillCode` ganda yang menghasilkan `item` berbeda.
- Script harus gagal bila ada deck slug duplikat.
- Script harus gagal bila membership merujuk ke `itemId` yang tidak ada di payload yang sama.
- Script harus gagal bila deck membawa `itemCount > 10`.
- Script harus gagal bila segment non-terakhir tidak berisi `10` item.
- Script harus gagal bila item `SYLLABUS_MAPPED` tidak bisa dilacak kembali ke track/unit/lesson published.
- Script harus gagal bila item `PENDING_LESSON_MAPPING` masih membawa `skillId`, `unitSlug`, atau `lessonSlug`.
- Script harus gagal bila pending item tidak tercatat di registry pending skill code.

## Deterministic ID Guidance
- `deck.id` dan `item.id` harus diturunkan secara deterministic, mis. UUIDv5 berbasis namespace internal KotobaHub.
- Basis yang disarankan:
  - mapped deck family: `flashcard-deck:{unitSlug}:vocabulary-foundation`
  - pending deck family: `flashcard-deck:jlpt-n5-foundation:vocabulary-foundation-unmapped`
  - mapped item: `flashcard-item:vocabulary:{skillCode}`
  - pending item: `flashcard-item:vocabulary:pending-n5:{ent_seq}`

## Non-Goals For This Change
- Belum melakukan mapping lesson resmi untuk skill code baru candidate `N5`.
- Belum mengubah `content/syllabus/tracks/jlpt-n5-foundation.json` agar skill pending masuk ke lesson tertentu.
- Belum mengunci strategi distractor final paling pintar lintas deck; baseline ini hanya mengunci shape kontraknya.
