# Seed Content Schema

## Scope
- Dokumen ini menyelesaikan task `SYL-03` dengan mendefinisikan bentuk seed content yang direkomendasikan untuk syllabus KotobaHub.
- Tujuannya adalah menyediakan format yang:
  - mudah dibaca di repo
  - mudah diubah menjadi insert database
  - masih cukup kaya untuk menyimpan referensi source, example sentence, dan metadata frequency meski ERD inti belum punya tabel dedicated

## Canonical Artifacts
- Dokumen ini adalah penjelasan human-readable untuk schema seed.
- Schema machine-readable disimpan di:
  - [schema/seed-manifest.schema.json](./schema/seed-manifest.schema.json)
  - [schema/track-seed.schema.json](./schema/track-seed.schema.json)
- Example payload disimpan di:
  - [examples/seed-manifest.example.json](./examples/seed-manifest.example.json)
  - [examples/jlpt-n5-foundation.example.json](./examples/jlpt-n5-foundation.example.json)
- JSON Schema dipakai untuk validasi bentuk file, sedangkan aturan semantik lintas parent-child tetap divalidasi di importer atau CI check.

## File Layout Recommendation

```text
content/
  syllabus/
    manifest.json
    tracks/
      jlpt-n5-foundation.json
      jlpt-n4-expansion.json
      jlpt-n3-bridge.json
      jlpt-n2-advanced.json
    sources/
      kanjidic2/
        README.md
      jmdict/
        README.md
      bunpro/
        README.md
      tatoeba/
        README.md
      core-frequency/
        README.md
```

Notes:
- `content/syllabus/` sengaja ditempatkan di root repo agar seed bisa dibaca langsung oleh script import, test fixture, atau build step tanpa mengikat lebih dulu ke struktur `src/` yang baru akan ditetapkan saat bootstrap implementasi.
- Folder `sources/` dipakai untuk provenance snapshot dan attribution notes pada task `SYL-03A`, bukan untuk payload seed final yang langsung dibaca product.

## Seed Design Rules
- Satu file manifest menjadi entrypoint discovery untuk seluruh track seed.
- Satu file track berisi tree `track -> units -> lessons -> skills`.
- Setiap `skill` boleh membawa metadata support di luar ERD inti selama masih relevan untuk import stage.
- Semua reference ke source eksternal harus berada di bawah field eksplisit agar attribution dan auditing mudah.
- Example sentences dan frequency metadata ditempatkan di `skill.content`, bukan dipaksa menjadi kolom tabel inti saat ini.
- JLPT dari source tambahan harus masuk sebagai `curriculumSignals`, bukan langsung overwrite `curriculumLevel`.

## ID Strategy
- Semua field `id` pada `track`, `unit`, `lesson`, `skill`, dan row turunan `unitSkillMappings` harus berupa UUID string agar bisa diimport langsung ke kolom `char(36)` pada ERD saat ini.
- UUID tersebut harus bersifat deterministic per entity path, misalnya memakai UUIDv5 berbasis namespace internal KotobaHub dan canonical path entity.
- Identifier human-readable yang stabil tetap berada pada:
  - `track.slug`
  - `unit.slug`
  - `lesson.slug`
  - `skill.code`
  - `skill.slug`
- `sourceRefs.externalId` dipakai untuk menyimpan identifier provider eksternal dan tidak boleh dijadikan pengganti `skill.code` atau `skill.id`.

## Top-Level Shape

```json
{
  "schemaVersion": "1.0.0",
  "generatedAt": "2026-05-11",
  "track": {}
}
```

## Manifest Schema

```json
{
  "schemaVersion": "1.0.0",
  "generatedAt": "2026-05-15",
  "tracks": [
    {
      "slug": "jlpt-n5-foundation",
      "curriculumLevel": "N5",
      "file": "tracks/jlpt-n5-foundation.json",
      "sortOrder": 1,
      "isPublished": true
    }
  ]
}
```

Rules:
- Manifest harus menjadi daftar canonical untuk file track yang dianggap aktif di repo.
- `tracks[].file` harus relatif terhadap folder `content/syllabus/`.
- Manifest wajib memuat keempat track canonical hasil `SYL-01` dan `SYL-02`, termasuk `N3` dan `N2` yang masih skeleton.
- `tracks[].isPublished` harus konsisten dengan `track.isPublished` di file track terkait.

## Track Schema

```json
{
  "id": "uuid",
  "slug": "jlpt-n5-foundation",
  "curriculumLevel": "N5",
  "title": "JLPT N5 Foundation",
  "description": "Core beginner syllabus for first-contact learners.",
  "sortOrder": 1,
  "isPublished": true,
  "units": []
}
```

### Maps To ERD

| Seed field | ERD target |
| --- | --- |
| `id` | `tracks.id` |
| `slug` | `tracks.slug` |
| `curriculumLevel` | `tracks.curriculum_level` |
| `title` | `tracks.title` |
| `description` | `tracks.description` |
| `sortOrder` | `tracks.sort_order` |
| `isPublished` | `tracks.is_published` |

## Unit Schema

```json
{
  "id": "uuid",
  "slug": "n5-kana-basics",
  "title": "Kana Basics",
  "description": "Foundational unit for hiragana and katakana literacy.",
  "sortOrder": 1,
  "isFoundationUnit": true,
  "isPublished": true,
  "lessons": []
}
```

### Maps To ERD

| Seed field | ERD target |
| --- | --- |
| `id` | `units.id` |
| `slug` | `units.slug` |
| `title` | `units.title` |
| `description` | `units.description` |
| `sortOrder` | `units.sort_order` |
| `isFoundationUnit` | `units.is_foundation_unit` |
| `isPublished` | `units.is_published` |

## Lesson Schema

```json
{
  "id": "uuid",
  "slug": "hiragana-row-a",
  "title": "Hiragana Row A",
  "learningObjective": "Recognize, read, and recall the first hiragana row.",
  "sortOrder": 1,
  "estimatedMinutes": 10,
  "isPublished": true,
  "skills": []
}
```

### Maps To ERD

| Seed field | ERD target |
| --- | --- |
| `id` | `lessons.id` |
| `slug` | `lessons.slug` |
| `title` | `lessons.title` |
| `learningObjective` | `lessons.learning_objective` |
| `sortOrder` | `lessons.sort_order` |
| `estimatedMinutes` | `lessons.estimated_minutes` |
| `isPublished` | `lessons.is_published` |

## Skill Schema

```json
{
  "id": "uuid",
  "code": "hiragana_a_row",
  "slug": "hiragana-a-row",
  "curriculumLevel": "N5",
  "title": "Hiragana A Row",
  "description": "Read and identify あ・い・う・え・お.",
  "skillType": "KANA",
  "supportsFlashcards": true,
  "supportsPracticeObjective": true,
  "supportsPracticeFreeResponse": false,
  "prerequisiteSkillCodes": [],
  "sortOrder": 1,
  "isPublished": true,
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
      ]
    }
  },
  "sourceRefs": [],
  "content": {
    "kana": {
      "scriptFamily": "HIRAGANA",
      "characters": [
        { "char": "あ", "romanization": "a" },
        { "char": "い", "romanization": "i" },
        { "char": "う", "romanization": "u" },
        { "char": "え", "romanization": "e" },
        { "char": "お", "romanization": "o" }
      ]
    }
  }
}
```

### Maps To ERD

| Seed field | ERD target |
| --- | --- |
| `id` | `skills.id` |
| `code` | `skills.code` |
| `slug` | `skills.slug` |
| `curriculumLevel` | `skills.curriculum_level` |
| `title` | `skills.title` |
| `description` | `skills.description` |
| `skillType` | `skills.skill_type` |
| `supportsFlashcards` | `skills.supports_flashcards` |
| `supportsPracticeObjective` | `skills.supports_practice_objective` |
| `supportsPracticeFreeResponse` | `skills.supports_practice_free_response` |
| `prerequisiteSkillCodes` | `skills.prerequisite_skill_codes` |
| `sortOrder` | `skills.sort_order` |
| `isPublished` | `skills.is_published` |

## `sourceRefs` Schema

```json
[
  {
    "provider": "KANJIDIC2",
    "category": "KANJI",
    "externalId": "日",
    "sourceUrl": "https://www.edrdg.org/kanjidic/kanjd2index_legacy.html",
    "licenseNote": "EDRDG CC BY-SA 4.0",
    "retrievedFrom": "kanjidic2.xml",
    "notes": "Legacy JLPT field stored separately from curriculum placement."
  }
]
```

## `curriculumSignals` Schema

```json
{
  "jlpt": {
    "resolvedLevel": "N5",
    "candidates": [
      {
        "provider": "KANJIDIC2_LEGACY",
        "level": "JLPT_4",
        "scope": "KANJI",
        "confidence": "LEGACY_SOURCE"
      },
      {
        "provider": "COMMUNITY_JLPT_TAGS",
        "level": "N5",
        "scope": "KANJI",
        "confidence": "COMMUNITY_OVERLAY"
      }
    ],
    "resolutionNotes": "Resolved by KotobaHub curation. Overlay signals do not override lexical source automatically."
  }
}
```

## `content` Schema By Skill Type

### Kana

```json
{
  "kana": {
    "scriptFamily": "HIRAGANA",
    "characters": [
      { "char": "あ", "romanization": "a" },
      { "char": "い", "romanization": "i" },
      { "char": "う", "romanization": "u" },
      { "char": "え", "romanization": "e" },
      { "char": "お", "romanization": "o" }
    ]
  }
}
```

### Kanji

```json
{
  "kanji": {
    "literal": "日",
    "meaningsEn": ["day", "sun"],
    "onyomi": ["ニチ", "ジツ"],
    "kunyomi": ["ひ", "か"],
    "strokeCount": 4,
    "frequencyRank": 5,
    "legacyJlptLevel": 4,
    "jlptSignalCandidates": [
      {
        "provider": "COMMUNITY_JLPT_TAGS",
        "level": "N5"
      }
    ]
  }
}
```

### Grammar

```json
{
  "grammar": {
    "pattern": "Noun + に",
    "meaning": "In, At, To, For, On",
    "register": "Standard",
    "structureLines": ["Noun + に"],
    "bunproLevel": "N5",
    "secondaryRefs": [
      {
        "provider": "TAE_KIM",
        "topic": "Particles used with verbs"
      }
    ]
  }
}
```

### Vocabulary

```json
{
  "vocabulary": {
    "primarySpelling": "学校",
    "alternateSpellings": [],
    "readings": ["がっこう"],
    "glossesEn": ["school"],
    "partsOfSpeech": ["noun"],
    "priorityTags": ["news1", "ichi1"],
    "commonnessRankBucket": "nf01",
    "jlptSignalCandidates": [
      {
        "provider": "YOMITAN_JLPT_VOCAB",
        "level": "N5",
        "mappedBy": "JMdict ent_seq"
      }
    ],
    "frequency": {
      "coreList": "CORE_2K_6K",
      "rank": 120,
      "band": "CORE_2K"
    }
  }
}
```

### Example Sentences

```json
{
  "exampleSentences": [
    {
      "provider": "TATOEBA",
      "sentenceId": 123456,
      "japaneseText": "学校へ行きます。",
      "englishText": "I go to school.",
      "transcription": "がっこう へ いきます。",
      "audioRefs": [],
      "license": "CC BY 2.0 FR"
    }
  ]
}
```

### Reading

```json
{
  "reading": {
    "title": "At The Station",
    "passageText": "えきで ともだちを まっています。",
    "translationEn": "I am waiting for a friend at the station.",
    "focus": "SHORT_PASSAGE",
    "targetSkillCodes": ["n5_station_waiting_context"],
    "comprehensionChecks": [
      {
        "prompt": "Who is the speaker waiting for?",
        "expectedAnswerEn": "A friend"
      }
    ]
  }
}
```

## `unitSkillMappings` Derivation Rule
- `unit_skill_mappings` tidak perlu ditulis sebagai file terpisah bila tree seed sudah jelas.
- Generator import dapat menurunkannya dari:
  - current `unit`
  - current `lesson`
  - each `skill`
  - `sortOrder`
- Bentuk row hasil turunan:

```json
{
  "id": "uuid-or-stable-seed-id",
  "unitId": "unit-id",
  "lessonId": "lesson-id",
  "skillId": "skill-id",
  "isPrimary": true,
  "sortOrder": 1
}
```

## Validation Rules
- `track.curriculumLevel` harus cocok dengan ladder resmi product, mis. `N5`, `N4`, `N3`, `N2`.
- `id` semua entity harus valid UUID string dan stabil antar-regenerasi seed.
- `unit.sortOrder`, `lesson.sortOrder`, dan `skill.sortOrder` harus unik di parent scope masing-masing.
- `skill.code` harus stabil dan tidak boleh bergantung pada ID source eksternal.
- `sourceRefs` wajib ada untuk skill yang berasal dari source eksternal.
- `curriculumSignals.jlpt.candidates` boleh berisi lebih dari satu level bila source overlay konflik.
- `curriculumLevel` adalah level final hasil resolusi internal, bukan copy mentah dari overlay.
- `content.vocabulary.frequency` boleh kosong.
- `exampleSentences` boleh kosong.
- `legacyJlptLevel` dari KANJIDIC2 tidak boleh dipakai langsung sebagai `curriculumLevel`.
- Vocabulary dari JMdict wajib punya minimal satu reading dan satu gloss Inggris untuk MVP.
- Skill `READING` boleh belum exhaustive pada seed awal, tetapi bila dipakai maka `content.reading` wajib hadir dan tidak boleh digantikan hanya oleh `exampleSentences`.
- `N3` dan `N2` boleh punya `units: []`, tetapi tetap wajib valid terhadap schema track yang sama dengan `N5` dan `N4`.

## Why Extra Metadata Lives In Seed
- ERD inti `syllabus` memang hanya memodelkan `tracks`, `units`, `lessons`, `skills`, dan `unit_skill_mappings`.
- Namun seed content perlu tetap menyimpan:
  - attribution source
  - sentence candidates
  - frequency hints
  - parser/debug metadata
- Dengan pendekatan ini, kita bisa:
  - menjaga import ke tabel inti tetap bersih
  - tidak kehilangan provenance data
  - menunda perluasan schema DB sampai memang dibutuhkan oleh runtime query

## Recommended Import Flow
1. Parse `manifest.json`.
2. Resolve daftar file track dari manifest.
3. Parse seed file per track.
4. Upsert `tracks`.
5. Upsert `units`.
6. Upsert `lessons`.
7. Upsert `skills`.
8. Derive dan upsert `unit_skill_mappings`.
9. Simpan metadata non-ERD ke artifact build, JSON cache, atau future table terpisah jika nanti dibutuhkan.
