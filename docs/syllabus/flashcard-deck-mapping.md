# Flashcard Deck Mapping

## Scope
- Dokumen ini menyelesaikan task `SYL-06A`.
- Fokusnya adalah mengunci bagaimana syllabus KotobaHub menurunkan skill yang mendukung flashcard menjadi `flashcard_item` dan `flashcard_deck` bawaan sistem.
- Prioritas utamanya adalah `KANJI` dan `VOCABULARY`, karena kedua area itu pada `SYL-05` masih ditulis sebagai bundle pedagogis dan belum sepenuhnya atomik untuk seed final.

## Why This Task Exists
- `SYL-05` sengaja menulis banyak skill `KANJI` dan `VOCABULARY` sebagai bundle kurikulum, mis. `n5_vocab_greetings_and_polite_openers` atau `n5_vocab_calendar_kanji_bundle`, agar sequencing lesson stabil lebih dulu.
- Schema seed final di [track-seed.schema.json](./schema/track-seed.schema.json) justru mengasumsikan:
  - `KANA` boleh membawa banyak karakter dalam satu skill.
  - `KANJI` mewakili satu literal kanji per skill.
  - `VOCABULARY` mewakili satu lemma atau fixed expression per skill.
- Karena itu `SYL-06A` mengunci jembatan antara `bundle skill` di dokumen kurikulum dengan `atom skill` yang nanti akan di-generate ke seed final pada `SYL-06B`.

## Final Decisions
- System deck yang disiapkan dari syllabus pada baseline ini hanya `deckSource = SYSTEM` dan `deckType = FOUNDATION`.
- Hanya track published `N5` dan `N4` yang menghasilkan system deck bawaan.
- Deck system tidak dibuat sebagai roll-up seluruh level pada fase ini. Grouping canonical berada di boundary `unit` agar tetap selaras dengan `unitSlug` pada ERD dan API flashcards.
- Satu deck system selalu homogen terhadap `contentType`: `KANA`, `KANJI`, atau `VOCABULARY`.
- Satu `flashcard_item` system pada baseline hanya punya satu deck owner utama. Reuse lintas deck ditunda ke future review deck atau custom deck user.
- Aturan introduction ownership tetap mengikuti lesson/unit asal di syllabus. Jika satu item muncul relevan di lebih dari satu tempat, owner canonical-nya tetap lesson pertama tempat item itu diperkenalkan.

## Canonical Relationship Model

```text
lesson bundle handle
  -> atom skill (seed-final)
  -> flashcard_item
  -> flashcard_deck (unit-scoped, content-type-specific)
```

Interpretasi per family:
- `KANA`
  - Skill di `SYL-05` sudah cukup final sebagai skill seed.
  - Satu skill `KANA` boleh menurunkan banyak `flashcard_item` karakter karena schema memang mendukung array `content.kana.characters`.
- `KANJI`
  - Bundle kurikulum harus dipecah menjadi skill atomik: satu literal kanji = satu skill = satu `flashcard_item`.
- `VOCABULARY`
  - Bundle kurikulum harus dipecah menjadi skill atomik: satu lemma atau fixed expression = satu skill = satu `flashcard_item`.

## Atomization Rules

### `KANA`
- Seed final tetap mempertahankan skill row/family seperti `hiragana_a_row` atau `katakana_combo_sounds`.
- `flashcard_item` diturunkan per karakter atau per combo bunyi yang ditulis di `content.kana.characters`.
- Progress attribution tetap aman karena semua item di bawah skill yang sama masih berada dalam objective script yang sangat sempit.

### `KANJI`
- Setiap member pada bundle `*_kanji_bundle` harus menjadi skill `KANJI` tersendiri di seed final.
- Satu skill `KANJI` wajib memiliki:
  - satu `content.kanji.literal`
  - `meaningsEn`
  - `onyomi`
  - `kunyomi`
  - `strokeCount`
  - `legacyJlptLevel` bila tersedia dari `KANJIDIC2`
  - `jlptSignalCandidates` bila ada overlay tambahan
- Satu skill `KANJI` menghasilkan tepat satu `flashcard_item` dengan `item_type = KANJI_CHARACTER`.

### `VOCABULARY`
- Setiap member pada bundle vocabulary harus menjadi skill `VOCABULARY` tersendiri di seed final.
- Satu skill `VOCABULARY` wajib mewakili:
  - satu lemma utama atau fixed expression pendek
  - satu `primarySpelling`
  - satu atau lebih `readings`
  - satu atau lebih `glossesEn`
  - `partsOfSpeech`
  - `priorityTags`
- Variasi spelling, kana-only form, atau nuance minor tidak dibuat sebagai skill baru bila masih merujuk ke lemma yang sama; simpan di `alternateSpellings` atau `readings`.
- Satu skill `VOCABULARY` menghasilkan tepat satu `flashcard_item` dengan `item_type = VOCABULARY`.

## Classification Rules For Flashcard-Capable Bundles
- Semua handle `*_kanji_bundle` diperlakukan sebagai sumber `KANJI`.
- Semua handle `n*_vocab_*` diperlakukan sebagai sumber `VOCABULARY`.
- Handle lexical non-`vocab_` yang tetap berprofil `BOTH` juga diperlakukan sebagai `VOCABULARY`, bukan `GRAMMAR`, bila target recall-nya adalah bentuk leksikal:
  - `n5_kosoado_pronouns`
  - `n5_kosoado_modifiers`
  - `n5_place_reference_words`
  - `n5_where_question_doko`
  - `n5_who_dare`
  - `n5_which_one_dore`
  - `n5_which_noun_dono`
  - `n4_sorede`
  - `n4_soreni`
  - `n4_soredemo`
  - `n4_demo`
  - `n4_demo_demo`
- Skill grammar yang profile-nya bukan `BOTH` tidak masuk deck system bawaan, walau tetap bisa dipakai oleh random questions.

## Source And Provenance Rules

### `KANJI`
- Source lexical primer: `KANJIDIC2`.
- Source sinyal JLPT tambahan: overlay internal/community bila memang dipakai pada transform.
- Seed final harus tetap membawa `sourceRefs` yang menunjuk ke provenance `KANJIDIC2`.
- Penempatan unit/lesson mengikuti kurasi internal KotobaHub, bukan field `jlpt` legacy source.

### `VOCABULARY`
- Source lexical primer: `JMdict`.
- Source sinyal JLPT tambahan: `yomitan-jlpt-vocab`.
- Bila satu entry punya beberapa spelling, pilih `primarySpelling` berdasar bentuk yang paling umum dan paling cocok dengan objective lesson; simpan bentuk lain di `alternateSpellings`.
- Satu item vocabulary tidak boleh digandakan hanya karena source overlay memberi beberapa kandidat level. Konflik level diselesaikan di `curriculumSignals`.

## Deck Grouping Rules

### General Rule
- Deck system dibentuk dari boundary `unit + contentType`.
- Pola slug:
  - `KANA`: `{lessonSlug}-kana-foundation`
  - `KANJI`: `{unitSlug}-kanji-foundation`
  - `VOCABULARY`: `{unitSlug}-vocabulary-foundation`
- `KANA` memakai lesson-scope karena unit `n5-kana-basics` terlalu besar bila digabung menjadi satu deck campuran hiragana-katakana.
- `KANJI` dan `VOCABULARY` memakai unit-scope karena objective recall-nya mengikuti tema unit, bukan satu lesson tunggal saja.

### Membership Ordering
- Urutan item di deck mengikuti:
  1. `lesson.sortOrder`
  2. urutan handle skill di lesson
  3. urutan item atomik di dalam handle tersebut
- `KANJI` dan `VOCABULARY` yang dipecah dari bundle harus mewarisi `lesson_id`, `unit_id`, dan `track_id` dari bundle asal.
- Baseline ini tidak membuat deck campuran lintas unit atau lintas content type.

## Deck Catalog Plan

### `jlpt-n5-foundation`

| Deck slug | Unit scope | Content type | Source bundle handles |
| --- | --- | --- | --- |
| `hiragana-vowels-and-k-row-kana-foundation` | `n5-kana-basics` lesson 1 | `KANA` | `hiragana_a_row`, `hiragana_ka_row` |
| `hiragana-s-t-n-row-kana-foundation` | `n5-kana-basics` lesson 2 | `KANA` | `hiragana_sa_row`, `hiragana_ta_row`, `hiragana_na_row` |
| `hiragana-h-m-y-r-w-row-kana-foundation` | `n5-kana-basics` lesson 3 | `KANA` | `hiragana_ha_row`, `hiragana_ma_row`, `hiragana_ya_row`, `hiragana_ra_row`, `hiragana_wa_n_row` |
| `hiragana-dakuten-handakuten-and-small-tsu-kana-foundation` | `n5-kana-basics` lesson 4 | `KANA` | `hiragana_dakuten_rows`, `hiragana_handakuten_row`, `small_tsu_gemination` |
| `katakana-core-rows-kana-foundation` | `n5-kana-basics` lesson 5 | `KANA` | `katakana_a_row`, `katakana_ka_row`, `katakana_sa_ta_na_rows`, `katakana_ha_ma_ya_ra_wa_rows` |
| `katakana-voiced-combos-and-script-switch-kana-foundation` | `n5-kana-basics` lesson 6 | `KANA` | `katakana_dakuten_rows`, `katakana_handakuten_row`, `katakana_combo_sounds`, `kana_script_switch_basics` |
| `n5-self-introduction-and-copula-vocabulary-foundation` | `n5-self-introduction-and-copula` | `VOCABULARY` | `n5_vocab_greetings_and_polite_openers`, `n5_vocab_basic_self_intro_phrases`, `n5_vocab_identity_and_roles` |
| `n5-this-that-and-place-reference-vocabulary-foundation` | `n5-this-that-and-place-reference` | `VOCABULARY` | `n5_kosoado_pronouns`, `n5_vocab_classroom_objects_basic`, `n5_kosoado_modifiers`, `n5_vocab_people_places_things_basic`, `n5_place_reference_words`, `n5_where_question_doko`, `n5_vocab_campus_and_home_places`, `n5_who_dare`, `n5_which_one_dore`, `n5_which_noun_dono`, `n5_vocab_people_reference_basic` |
| `n5-daily-verbs-and-routines-vocabulary-foundation` | `n5-daily-verbs-and-routines` | `VOCABULARY` | `n5_vocab_daily_routine_verbs` |
| `n5-descriptions-and-preferences-vocabulary-foundation` | `n5-descriptions-and-preferences` | `VOCABULARY` | `n5_i_adjective_inventory_basic`, `n5_na_adjective_inventory_basic` |
| `n5-time-counting-and-schedules-vocabulary-foundation` | `n5-time-counting-and-schedules` | `VOCABULARY` | `n5_vocab_numbers_basic`, `n5_vocab_people_objects_counters`, `n5_vocab_days_and_clock_time`, `n5_vocab_frequency_and_schedule` |
| `n5-time-counting-and-schedules-kanji-foundation` | `n5-time-counting-and-schedules` | `KANJI` | `n5_vocab_calendar_kanji_bundle` |
| `n5-movement-existence-and-location-vocabulary-foundation` | `n5-movement-existence-and-location` | `VOCABULARY` | `n5_vocab_home_school_locations`, `n5_vocab_motion_verbs`, `n5_transport_and_method_bundle`, `n5_vocab_social_exchange_basic` |
| `n5-movement-existence-and-location-kanji-foundation` | `n5-movement-existence-and-location` | `KANJI` | `n5_location_kanji_bundle` |
| `n5-te-form-and-everyday-functions-vocabulary-foundation` | `n5-te-form-and-everyday-functions` | `VOCABULARY` | `n5_vocab_instruction_verbs` |

### `jlpt-n4-expansion`

| Deck slug | Unit scope | Content type | Source bundle handles |
| --- | --- | --- | --- |
| `n4-intention-ability-and-experience-vocabulary-foundation` | `n4-intention-ability-and-experience` | `VOCABULARY` | `n4_capability_context_vocab`, `n4_goal_setting_vocab` |
| `n4-giving-receiving-and-favors-vocabulary-foundation` | `n4-giving-receiving-and-favors` | `VOCABULARY` | `n4_social_viewpoint_vocab`, `n4_request_softening_vocab`, `n4_service_and_apology_bundle` |
| `n4-sequencing-and-ongoing-actions-vocabulary-foundation` | `n4-sequencing-and-ongoing-actions` | `VOCABULARY` | `n4_ordering_vocab` |
| `n4-comparison-quantity-and-limits-vocabulary-foundation` | `n4-comparison-quantity-and-limits` | `VOCABULARY` | `n4_quantity_vocab_bundle` |
| `n4-explanations-hearsay-and-uncertainty-vocabulary-foundation` | `n4-explanations-hearsay-and-uncertainty` | `VOCABULARY` | `n4_backgrounding_vocab`, `n4_maybe_context_vocab`, `n4_sorede`, `n4_soreni`, `n4_soredemo`, `n4_demo_demo`, `n4_demo` |
| `n4-respectful-language-and-social-context-vocabulary-foundation` | `n4-respectful-language-and-social-context` | `VOCABULARY` | `n4_respectful_service_vocab`, `n4_formal_service_bundle` |
| `n4-respectful-language-and-social-context-kanji-foundation` | `n4-respectful-language-and-social-context` | `KANJI` | `n4_honorific_kanji_bundle` |

## Seed Generation Implication For `SYL-06B`
- `SYL-06B` harus memperlakukan handle bundle di atas sebagai input authoring, bukan sebagai row skill final untuk `KANJI` dan `VOCABULARY`.
- Output seed final yang diharapkan:
  - `KANA`: skill tetap row/family-level, item diturunkan dari `content.kana.characters`
  - `KANJI`: skill final dipecah per literal dari bundle `*_kanji_bundle`
  - `VOCABULARY`: skill final dipecah per lemma/fixed expression dari bundle vocabulary
- Tiap atom skill final harus tetap membawa provenance source dan mewarisi owner lesson/unit dari handle bundle asalnya.
- `flashcard_deck` dan `flashcard_deck_items` tidak disimpan langsung di schema track seed saat ini; mapping di dokumen ini menjadi aturan turunan yang dipakai generator seed atau importer flashcards.

## Alignment Notes
- Dokumen ini sengaja tidak membuat system deck untuk `GRAMMAR` atau `READING`, karena keputusan `SYL-06` sudah mengunci bahwa area tersebut diprioritaskan ke random questions.
- Ada perubahan makna praktis dari kata "skill" antara dokumen authoring `SYL-05` dan seed final:
  - di `SYL-05`, beberapa code masih berupa bundle pedagogis
  - di seed final `SYL-06B`, `KANJI` dan `VOCABULARY` harus sudah atomik
- Perbedaan ini disengaja dan kini dianggap resolved, bukan mismatch, selama transform `SYL-06B` mengikuti aturan atomization di atas.
