# Kana Flashcard Seeder Schema

## Scope
- Dokumen ini mendefinisikan kontrak planning untuk seeder system flashcard deck `KANA`.
- Fokusnya adalah menurunkan skill `KANA` published dari syllabus final menjadi artifact deck system hiragana dan katakana yang siap diimport ke domain `flashcards`.
- Dokumen ini melengkapi `SYL-06A` untuk area `KANA`, karena rule mapping deck sudah dikunci tetapi artifact repo-native dan validator machine-readable belum ada.

## Positioning Decision
- `KANA` tetap menjadi `skill` canonical di syllabus dan tetap membawa ownership `track -> unit -> lesson -> skill`.
- Learning surface utama untuk `KANA` pada baseline ini adalah system flashcard deck lesson-scoped, bukan deck lintas unit.
- Berbeda dari vocabulary pending, seluruh item `KANA` yang di-seed di artifact ini harus sudah `SYLLABUS_MAPPED`.
- Deck `KANA` tetap mempertahankan grouping lesson resmi di `n5-kana-basics`, sehingga hiragana dan katakana tidak dicampur ke satu deck unit besar.

## Source Dependencies

### Canonical Curriculum Input
- `content/syllabus/manifest.json`
- `content/syllabus/tracks/jlpt-n5-foundation.json`

Aturan input:
- Hanya track published `jlpt-n5-foundation` yang diproses.
- Hanya `skillType = KANA` yang diproses.
- Hanya skill dengan `supportsFlashcards = true` dan `isPublished = true` yang boleh masuk output.
- Script membaca final track seed yang sudah canonical, bukan dokumen authoring `SYL-05` mentah.

### Kana Content Rules
- `content.kana.scriptFamily` wajib `HIRAGANA` atau `KATAKANA`.
- `content.kana.characters` wajib berupa array objek berisi `char` dan `romanization`.
- Satu skill `KANA` tetap menjadi owner resmi beberapa item flashcard bila skill itu memang membawa beberapa karakter atau combo bunyi.
- `kana_script_switch_basics` tetap diperlakukan sebagai `KATAKANA`, karena script family canonical-nya memang `KATAKANA`.

## Planned Script Contract
- Target script path: `scripts/generate_kana_flashcard_seed.py`
- Tujuan script:
  - membaca syllabus seed published `N5`
  - memilih skill `KANA` yang eligible untuk flashcards
  - menurunkan setiap entri `content.kana.characters` menjadi `flashcard_item`
  - menghasilkan artifact seed deck hiragana/katakana yang repo-native dan bisa diaudit

### Suggested CLI

```bash
python3 scripts/generate_kana_flashcard_seed.py
```

## Planned Output Layout

```text
content/
  flashcards/
    system-decks/
      kana-foundation.json
```

Catatan:
- Artifact dipisahkan dari `content/syllabus/` agar boundary seed syllabus dan seed flashcards tetap jelas.
- Artifact ini tidak membutuhkan registry pending terpisah, karena seluruh item `KANA` harus sudah punya `skillId` canonical.

## Output A: Main Deck Seed

### Top-Level Payload Shape

```json
{
  "schemaVersion": "1.0.0",
  "generatedAt": "2026-06-20",
  "deckSource": "SYSTEM",
  "deckType": "FOUNDATION",
  "contentType": "KANA",
  "decks": [],
  "items": [],
  "deckItems": []
}
```

Rules:
- `deckSource` saat ini harus `SYSTEM`.
- `deckType` saat ini harus `FOUNDATION`.
- `contentType` saat ini harus `KANA`.
- Semua `decks`, `items`, dan `deckItems` harus bisa diturunkan deterministik dari syllabus seed yang sama.

### Deck Schema

```json
{
  "id": "uuid",
  "slug": "hiragana-vowels-and-k-row-kana-foundation",
  "trackSlug": "jlpt-n5-foundation",
  "unitSlug": "n5-kana-basics",
  "lessonSlug": "hiragana-vowels-and-k-row",
  "title": "Hiragana Vowels And K Row Kana Foundation",
  "description": "System kana deck for the Hiragana Vowels And K Row lesson. Contains 10 items.",
  "sortOrder": 1,
  "isPublished": true,
  "sourceSkillCodes": [
    "hiragana_a_row",
    "hiragana_ka_row"
  ],
  "mappingStatus": "SYLLABUS_MAPPED",
  "segmentIndex": 1,
  "segmentCount": 1,
  "itemCount": 10
}
```

Rules:
- Deck `KANA` selalu lesson-scoped mengikuti slug `{lessonSlug}-kana-foundation`.
- Baseline ini mempertahankan tepat satu deck per lesson `KANA`; deck tidak dipecah menjadi segment `part-{nn}` walau item count lebih dari `10`.
- `sourceSkillCodes` mengikuti urutan skill di lesson published.
- `segmentIndex` dan `segmentCount` tetap dibawa untuk menjaga shape artifact konsisten, tetapi keduanya harus `1` untuk `KANA` baseline ini.

### Item Schema

```json
{
  "id": "uuid",
  "skillId": "163e548b-2f63-52b2-abf2-39105600356c",
  "skillCode": "hiragana_a_row",
  "trackSlug": "jlpt-n5-foundation",
  "unitSlug": "n5-kana-basics",
  "lessonSlug": "hiragana-vowels-and-k-row",
  "itemType": "HIRAGANA_CHARACTER",
  "surfaceFormText": "あ",
  "kanaDisplayText": "あ",
  "romajiText": "a",
  "englishMeaning": null,
  "curriculumSignals": {
    "jlpt": {
      "resolvedLevel": "N5",
      "candidates": [
        {
          "provider": "KOTOBAHUB_INTERNAL",
          "level": "N5",
          "scope": "KANA",
          "confidence": "CURATED"
        }
      ],
      "resolutionNotes": "Kana placement is fully curated internally by KotobaHub."
    }
  },
  "sourceRefs": [
    {
      "provider": "KOTOBAHUB_INTERNAL",
      "category": "KANA_CURATION",
      "externalId": "hiragana_a_row",
      "sourceUrl": "https://kotobahub.local/docs/syllabus/source-of-truth-and-ingestion-plan.md#1-kana"
    }
  ],
  "answerOptionPayload": {
    "schemaVersion": 1,
    "canonicalAnswers": {
      "KANA": ["あ"],
      "ROMAJI": ["a"]
    },
    "distractorPoolItemIds": []
  },
  "mappingStatus": "SYLLABUS_MAPPED",
  "explanationText": null,
  "isActive": true
}
```

Rules:
- Satu entri pada `content.kana.characters` menghasilkan tepat satu `item`.
- `itemType` diturunkan dari `content.kana.scriptFamily`:
  - `HIRAGANA` -> `HIRAGANA_CHARACTER`
  - `KATAKANA` -> `KATAKANA_CHARACTER`
- `surfaceFormText` dan `kanaDisplayText` untuk `KANA` sama-sama memakai nilai `char`.
- `romajiText` wajib memakai `romanization` canonical dari seed syllabus.
- `englishMeaning` tetap `null` untuk item `KANA` baseline ini.
- `mappingStatus` selalu `SYLLABUS_MAPPED`.

### Deck Membership Schema

```json
{
  "deckId": "uuid",
  "itemId": "uuid",
  "sortOrder": 1,
  "trackSlug": "jlpt-n5-foundation",
  "unitSlug": "n5-kana-basics",
  "lessonSlug": "hiragana-vowels-and-k-row",
  "skillCode": "hiragana_a_row",
  "mappingStatus": "SYLLABUS_MAPPED"
}
```

Rules:
- Membership ordering mengikuti:
  1. `lesson.sortOrder`
  2. urutan skill di lesson
  3. urutan karakter di `content.kana.characters`
- Karena deck `KANA` lesson-scoped dan tidak di-segment, `sortOrder` item cukup meningkat terus mulai dari `1` di setiap deck.

## Mapping To Current ERD

| Seeder field | ERD target |
| --- | --- |
| `decks[].id` | `flashcard_decks.id` |
| `decks[].slug` | `flashcard_decks.slug` |
| `decks[].unitSlug` | resolve ke `flashcard_decks.unit_id` melalui `units.slug` |
| `decks[].title` | `flashcard_decks.title` |
| `decks[].description` | `flashcard_decks.description` |
| `schema deckSource` | `flashcard_decks.deck_source` |
| `schema deckType` | `flashcard_decks.deck_type` |
| `schema contentType` | `flashcard_decks.content_type` |
| `decks[].sortOrder` | `flashcard_decks.sort_order` |
| `decks[].isPublished` | `flashcard_decks.is_published` |
| `items[].id` | `flashcard_items.id` |
| `items[].skillId` | `flashcard_items.skill_id` |
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
- Deck `KANA` tetap sah memakai `unit_id` yang sama (`n5-kana-basics`) walau boundary pedagogis utamanya ada di lesson.
- Semua item `KANA` di artifact ini wajib membawa `skill_id`, sehingga item-item itu valid untuk progress attribution resmi.

## Validation Rules
- Script harus gagal bila track `jlpt-n5-foundation` tidak published.
- Script harus gagal bila skill `KANA` eligible tidak punya `content.kana.scriptFamily` yang valid.
- Script harus gagal bila ada entri `characters` tanpa `char` atau tanpa `romanization`.
- Script harus gagal bila deck slug duplikat.
- Script harus gagal bila dua item berbeda menghasilkan `id` yang sama.
- Script harus gagal bila membership merujuk ke `itemId` yang tidak ada di payload yang sama.
- Script harus gagal bila item `KANA` tidak bisa dilacak kembali ke track/unit/lesson published.
- Script harus gagal bila deck `KANA` tidak punya `lessonSlug` atau `unitSlug`.
- Script harus gagal bila deck `KANA` mencoba memakai segment selain `1/1`.

## Deterministic ID Guidance
- `deck.id` dan `item.id` harus diturunkan secara deterministic, mis. UUIDv5 berbasis namespace internal KotobaHub.
- Basis yang disarankan:
  - deck family: `flashcard-deck:{lessonSlug}:kana-foundation`
  - item: `flashcard-item:kana:{skillCode}:{characterIndex}`

## Non-Goals For This Change
- Belum mengenerate deck `KANJI`.
- Belum menentukan strategi distractor final paling pintar lintas lesson `KANA`; baseline ini cukup membawa canonical answers dan boleh menurunkan distractor dari membership deck yang sama.
- Belum mengubah payload `content/syllabus/tracks/*.json`; artifact ini murni turunan dari seed syllabus yang sudah published.
