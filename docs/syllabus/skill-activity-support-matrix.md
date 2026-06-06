# Skill Activity Support Matrix

## Scope
- Dokumen ini menyelesaikan task `SYL-06`.
- Fokusnya adalah mengunci support flags final untuk seluruh skill published `N5` dan `N4`, dengan menerjemahkan istilah produk "random questions" ke field seed `supportsPracticeObjective` dan `supportsPracticeFreeResponse`.
- Dokumen ini belum menentukan membership `flashcard item` maupun grouping `flashcard deck`; area tersebut tetap menjadi scope `SYL-06A`.

## Working Interpretation
- Di task breakdown, istilah "dipakai oleh random questions" dibaca sebagai skill yang masuk salah satu atau kedua jalur practice berikut:
  - `supportsPracticeObjective`
  - `supportsPracticeFreeResponse`
- Pada fase ini, tidak ada skill `flashcards only`. Setiap skill yang layak masuk flashcard juga dianggap layak masuk practice objective yang deterministik.
- Skill yang berupa inventaris leksikal tetap boleh memakai flashcard walau bentuk katanya berupa deictic word, interrogative, discourse marker, atau bundle frasa pendek, selama objective utamanya masih recognition/recall.
- Skill yang berupa pola struktur, konjugasi, hubungan antarklausa, atau nuansa register diprioritaskan ke random questions, bukan ke flashcard.

## Flag Profiles

| Profile | `supportsFlashcards` | `supportsPracticeObjective` | `supportsPracticeFreeResponse` | Intended use |
| --- | --- | --- | --- | --- |
| `BOTH` | `true` | `true` | `false` | Flashcards + random questions deterministik |
| `RQ-OBJ` | `false` | `true` | `false` | Random questions objektif saja |
| `RQ-OBJ+FR` | `false` | `true` | `true` | Random questions objektif + short free-response |
| `RQ-FR` | `false` | `false` | `true` | Random questions free-response saja |

## Ownership Normalization From `SYL-05`
- Untuk menjaga konsistensi dengan ERD `skills.lesson_id` dan keunikan `skill.code`, dokumen `SYL-05` dinormalisasi agar satu skill hanya punya satu owner lesson utama.
- Owner canonical yang dipakai untuk `SYL-06` adalah:
  - `n4_tsudzukeru` dimiliki `experience-habit-and-growing-ability`
  - `n4_gozaimasu` dan `n4_de_gozaimasu` dimiliki `formal-presence-and-institutional-tone`
  - `n4_kana` dan `n4_kashira` dimiliki `softening-questions-and-interpersonal-tone`

## Final Mapping

### `jlpt-n5-foundation`

#### `n5-kana-basics`
- `hiragana-vowels-and-k-row`: `BOTH` -> `hiragana_a_row`, `hiragana_ka_row`
- `hiragana-s-t-n-row`: `BOTH` -> `hiragana_sa_row`, `hiragana_ta_row`, `hiragana_na_row`
- `hiragana-h-m-y-r-w-row`: `BOTH` -> `hiragana_ha_row`, `hiragana_ma_row`, `hiragana_ya_row`, `hiragana_ra_row`, `hiragana_wa_n_row`
- `hiragana-dakuten-handakuten-and-small-tsu`: `BOTH` -> `hiragana_dakuten_rows`, `hiragana_handakuten_row`, `small_tsu_gemination`
- `katakana-core-rows`: `BOTH` -> `katakana_a_row`, `katakana_ka_row`, `katakana_sa_ta_na_rows`, `katakana_ha_ma_ya_ra_wa_rows`
- `katakana-voiced-combos-and-script-switch`: `BOTH` -> `katakana_dakuten_rows`, `katakana_handakuten_row`, `katakana_combo_sounds`, `kana_script_switch_basics`

#### `n5-self-introduction-and-copula`
- `greetings-and-polite-openers`: `BOTH` -> `n5_vocab_greetings_and_polite_openers`, `n5_vocab_basic_self_intro_phrases`
- `copula-affirmative-and-questions`: `RQ-OBJ+FR` -> `n5_copula_affirmative`, `n5_copula_question_ka`, `n5_copula_plain_da`
- `copula-negative-and-past-reference`: `RQ-OBJ+FR` -> `n5_copula_negative`, `n5_copula_negative_past`, `n5_copula_past_polite`
- `belonging-role-and-basic-preference`: `RQ-OBJ` -> `n5_particle_mo`; `BOTH` -> `n5_vocab_identity_and_roles`; `RQ-OBJ+FR` -> `n5_like_dislike_nominal_statements`

#### `n5-this-that-and-place-reference`
- `ko-so-a-do-pronouns`: `BOTH` -> `n5_kosoado_pronouns`, `n5_vocab_classroom_objects_basic`
- `ko-so-a-do-modifiers`: `BOTH` -> `n5_kosoado_modifiers`, `n5_vocab_people_places_things_basic`
- `place-reference-and-location-questions`: `BOTH` -> `n5_place_reference_words`, `n5_where_question_doko`, `n5_vocab_campus_and_home_places`
- `choice-and-person-reference`: `BOTH` -> `n5_who_dare`, `n5_which_one_dore`, `n5_which_noun_dono`, `n5_vocab_people_reference_basic`

#### `n5-core-particles-and-sentence-order`
- `topic-subject-and-possession`: `RQ-OBJ` -> `n5_topic_particle_wa`, `n5_subject_particle_ga`, `n5_possessive_particle_no`
- `objects-companions-and-loose-listing`: `RQ-OBJ` -> `n5_object_particle_o`, `n5_and_particle_to`, `n5_with_particle_to`, `n5_listing_particle_ya`
- `place-time-and-means-particles`: `RQ-OBJ` -> `n5_particle_ni`, `n5_particle_de`, `n5_particle_e`, `n5_particle_kara`, `n5_particle_made`
- `sentence-ending-and-basic-quoting`: `RQ-OBJ+FR` -> `n5_sentence_ending_ne`, `n5_sentence_ending_yo`, `n5_basic_quoting_tte`

#### `n5-daily-verbs-and-routines`
- `polite-verb-basics`: `RQ-OBJ+FR` -> `n5_verb_non_past`, `n5_polite_verb_endings`; `BOTH` -> `n5_vocab_daily_routine_verbs`
- `u-verbs-and-ru-verbs-in-time`: `RQ-OBJ+FR` -> `n5_u_verb_basics`, `n5_u_verb_past`, `n5_u_verb_negative_past`, `n5_ru_verb_basics`, `n5_ru_verb_past`, `n5_ru_verb_negative_past`
- `irregular-verbs-and-purpose`: `RQ-OBJ+FR` -> `n5_irregular_suru`, `n5_irregular_kuru`, `n5_verb_purpose_ni_iku`
- `desire-intention-and-invitation`: `RQ-OBJ+FR` -> `n5_desire_tai`, `n5_intention_tsumori`, `n5_suggestion_mashou`, `n5_invitation_masenka`, `n5_experience_ta_koto_ga_aru`

#### `n5-descriptions-and-preferences`
- `i-adjective-core-usage`: `RQ-OBJ+FR` -> `n5_i_adjective_predicate`, `n5_i_adjective_noun_modifier`; `BOTH` -> `n5_i_adjective_inventory_basic`
- `na-adjective-core-usage`: `RQ-OBJ+FR` -> `n5_na_adjective_predicate`, `n5_na_adjective_noun_modifier`; `BOTH` -> `n5_na_adjective_inventory_basic`
- `adjective-past-negative-and-joining`: `RQ-OBJ+FR` -> `n5_i_adjective_negative`, `n5_i_adjective_past`, `n5_i_adjective_negative_past`, `n5_adjective_te_joining`, `n5_adjective_noun_de_joining`
- `likes-dislikes-skill-and-comparison`: `RQ-OBJ+FR` -> `n5_no_ga_suki`, `n5_no_ga_kirai`, `n5_no_ga_jouzu`, `n5_no_ga_heta`, `n5_yori_no_hou_ga`, `n5_naka_de_ichiban`

#### `n5-time-counting-and-schedules`
- `numbers-counters-and-approximation`: `BOTH` -> `n5_vocab_numbers_basic`, `n5_vocab_people_objects_counters`; `RQ-OBJ` -> `n5_amount_kurai`
- `days-time-and-deadlines`: `BOTH` -> `n5_vocab_days_and_clock_time`; `RQ-OBJ` -> `n5_time_deadline_made`, `n5_time_origin_kara`
- `before-after-and-status-checks`: `RQ-OBJ` -> `n5_before_mae_ni`, `n5_still_yet_mada`, `n5_already_mou`, `n5_not_yet_mada_te_imasen`
- `schedule-and-frequency-phrases`: `BOTH` -> `n5_vocab_frequency_and_schedule`, `n5_vocab_calendar_kanji_bundle`; `RQ-OBJ` -> `n5_reading_micro_schedule`

#### `n5-movement-existence-and-location`
- `existence-of-things-and-people`: `RQ-OBJ+FR` -> `n5_existence_aru`, `n5_existence_iru`, `n5_noun_ga_aru`; `BOTH` -> `n5_vocab_home_school_locations`
- `going-coming-and-returning`: `BOTH` -> `n5_vocab_motion_verbs`; `RQ-OBJ` -> `n5_destination_particle_e`, `n5_destination_particle_ni`
- `location-actions-and-transport`: `RQ-OBJ` -> `n5_location_particle_de`; `BOTH` -> `n5_transport_and_method_bundle`, `n5_location_kanji_bundle`
- `giving-and-receiving-basics`: `RQ-OBJ+FR` -> `n5_giving_ageru`, `n5_receiving_kureru`, `n5_receiving_morau`; `BOTH` -> `n5_vocab_social_exchange_basic`

#### `n5-te-form-and-everyday-functions`
- `te-form-construction`: `RQ-OBJ+FR` -> `n5_verb_te_form`, `n5_verb_te_linking`; `BOTH` -> `n5_vocab_instruction_verbs`
- `requests-permission-and-prohibition`: `RQ-OBJ+FR` -> `n5_request_te_kudasai`, `n5_permission_te_mo_ii`, `n5_prohibition_te_wa_ikenai`, `n5_request_negative_naide_kudasai`
- `obligation-and-better-not`: `RQ-OBJ+FR` -> `n5_obligation_nakucha`, `n5_obligation_nakute_wa_ikenai`, `n5_obligation_nakute_wa_naranai`, `n5_advice_nai_hou_ga_ii`
- `ongoing-state-and-sequencing`: `RQ-OBJ+FR` -> `n5_te_iru_progressive`, `n5_te_iru_habitual`, `n5_te_iru_result_state`, `n5_te_kara_sequence`

#### `n5-reasons-comparisons-and-short-reading`
- `reasons-and-soft-explanations`: `RQ-OBJ+FR` -> `n5_reason_kara`, `n5_reason_node`, `n5_explanatory_n_desu`
- `contrast-choice-and-alternative`: `RQ-OBJ+FR` -> `n5_contrast_ga`, `n5_contrast_kedo`, `n5_contrast_keredomo`, `n5_choice_ka_or`
- `becoming-and-evaluating`: `RQ-OBJ+FR` -> `n5_becoming_ni_naru_ku_naru`, `n5_choice_ni_suru`, `n5_excess_sugiru`
- `short-reading-integration`: `RQ-OBJ+FR` -> `n5_relative_clause_verb_ta_noun`, `n5_nominalizer_no_wa`, `n5_short_reading_reason_and_comparison`

### `jlpt-n4-expansion`

#### `n4-plain-form-bridge`
- `plain-present-and-past`: `RQ-OBJ+FR` -> `n4_plain_present_verbs`, `n4_plain_past_verbs`, `n4_plain_copula_past`
- `plain-negative-and-casual-copula`: `RQ-OBJ+FR` -> `n4_plain_negative_verbs`, `n4_plain_negative_copula`, `n4_plain_negative_adjectives`
- `quotation-thought-and-speech`: `RQ-OBJ+FR` -> `n4_to_omou`, `n4_to_iu`, `n4_to_kiita`, `n4_plain_form_for_embedded_clauses`
- `embedded-questions-and-nominalization`: `RQ-OBJ+FR` -> `n4_kadouka`, `n4_koto_nominalization`, `n4_no_nominalization`, `n4_plain_form_reading_bridge`

#### `n4-intention-ability-and-experience`
- `ability-and-potential`: `RQ-OBJ+FR` -> `n4_potential_form`, `n4_koto_ga_dekiru`; `BOTH` -> `n4_capability_context_vocab`
- `wants-needs-and-goals`: `RQ-OBJ+FR` -> `n4_ga_hoshii`, `n4_te_hoshii`, `n4_necessity_ga_hitsuyou`; `BOTH` -> `n4_goal_setting_vocab`
- `plans-intentions-and-trying`: `RQ-OBJ+FR` -> `n4_you_to_omou`, `n4_yotei_da`, `n4_te_miru`, `n4_hajimeru`
- `experience-habit-and-growing-ability`: `RQ-OBJ+FR` -> `n4_tsudzukeru`, `n4_you_ni_naru`, `n4_you_ni_suru`, `n4_experience_growth_reading`

#### `n4-giving-receiving-and-favors`
- `giving-receiving-core`: `RQ-OBJ+FR` -> `n4_te_ageru`, `n4_te_kureru`, `n4_te_morau`; `BOTH` -> `n4_social_viewpoint_vocab`
- `requests-and-help-in-context`: `RQ-OBJ+FR` -> `n4_te_itadakemasenka`, `n4_o_kudasai`, `n4_te_kurenai_te_moraenai`; `BOTH` -> `n4_request_softening_vocab`
- `gratitude-and-unintended-outcome`: `RQ-OBJ+FR` -> `n4_te_kurete_arigatou`, `n4_te_shimau`; `BOTH` -> `n4_service_and_apology_bundle`
- `honorific-and-humble-intro`: `RQ-OBJ+FR` -> `n4_itasu`, `n4_irassharu`

#### `n4-sequencing-and-ongoing-actions`
- `after-before-and-order-of-actions`: `RQ-OBJ+FR` -> `n4_atode`, `n4_ta_tokoro_da`; `BOTH` -> `n4_ordering_vocab`
- `while-during-and-in-the-middle`: `RQ-OBJ+FR` -> `n4_nagara`, `n4_teiru_aida_ni`, `n4_teiru_tokoro_da`
- `preparation-result-state-and-movement`: `RQ-OBJ+FR` -> `n4_teoku`, `n4_tearu`, `n4_teiku`, `n4_tekuru`
- `starting-finishing-restarting`: `RQ-OBJ+FR` -> `n4_owaru`, `n4_dasu`, `n4_naosu`, `n4_teita`

#### `n4-conditions-reasons-and-advice`
- `if-when-and-possible-cases`: `RQ-OBJ+FR` -> `n4_tara_conditional`, `n4_ba_conditional`, `n4_to_conditional`, `n4_baai_wa`
- `necessity-prohibition-and-allowance`: `RQ-OBJ+FR` -> `n4_nai_to`, `n4_nakereba_ikenai`, `n4_nakereba_naranai`, `n4_nakutemo_ii`, `n4_hitsuyou_ga_aru`
- `reasons-contrast-and-emphasis`: `RQ-OBJ+FR` -> `n4_daga_desuga`, `n4_janai_ka`, `n4_noda_rou_ka`, `n4_explanatory_reasoning_bundle`
- `advice-wishes-and-regret`: `RQ-OBJ+FR` -> `n4_tara_dou`, `n4_ba_yokatta`, `n4_te_yokatta`, `n4_narubeku`

#### `n4-comparison-quantity-and-limits`
- `quantity-and-frequency-expressions`: `RQ-OBJ` -> `n4_go_to_ni`, `n4_goro`, `n4_daitai`; `BOTH` -> `n4_quantity_vocab_bundle`
- `only-except-and-not-much`: `RQ-OBJ` -> `n4_shika_nai`, `n4_amari_nai`, `n4_sukoshi_mo_nai`, `n4_zenzen`, `n4_hotondo`
- `comparison-range-and-degree`: `RQ-OBJ` -> `n4_ika`, `n4_igai`, `n4_sonna_ni`; `RQ-OBJ+FR` -> `n4_hikaku_quantity_reading`
- `examples-categories-and-inclusion`: `RQ-OBJ+FR` -> `n4_toka_toka`, `n4_nado`, `n4_dake_de_naku`, `n4_hoka_ni_mo`

#### `n4-state-changes-and-viewpoint-shifts`
- `becoming-seeming-and-looking`: `RQ-OBJ+FR` -> `n4_sou`, `n4_sou_ni_sou_na`, `n4_you_da`, `n4_mitai`, `n4_rashii`
- `transitivity-and-resulting-viewpoint`: `RQ-OBJ+FR` -> `n4_transitive_intransitive_pairs`, `n4_mieru`, `n4_kikoeru`, `n4_ga_mirareru`
- `causative-and-passive`: `RQ-OBJ+FR` -> `n4_passive_form`, `n4_causative_form`, `n4_causative_passive_form`
- `ease-difficulty-and-emotional-signals`: `RQ-OBJ+FR` -> `n4_yasui`, `n4_nikui`, `n4_zurai`, `n4_garu`, `n4_tagaru`

#### `n4-explanations-hearsay-and-uncertainty`
- `background-and-soft-explanation`: `RQ-OBJ+FR` -> `n4_ndakedo_ndesuga`; `BOTH` -> `n4_backgrounding_vocab`
- `hearsay-and-reported-information`: `RQ-OBJ+FR` -> `n4_to_iwareteiru`, `n4_to_sareteiru`, `n4_to_kangaerareteiru`, `n4_to_omowareru_bundle`
- `guessing-probability-and-uncertainty`: `RQ-OBJ+FR` -> `n4_kamoshirenai`, `n4_hazu_da`, `n4_hazu_ga_nai`; `BOTH` -> `n4_maybe_context_vocab`
- `concession-and-contrastive-follow-up`: `BOTH` -> `n4_sorede`, `n4_soreni`, `n4_soredemo`, `n4_demo_demo`, `n4_demo`

#### `n4-respectful-language-and-social-context`
- `service-register-core`: `RQ-OBJ+FR` -> `n4_o_suru`, `n4_o_ni_naru`, `n4_nasaru`; `BOTH` -> `n4_respectful_service_vocab`
- `formal-presence-and-institutional-tone`: `RQ-OBJ+FR` -> `n4_gozaimasu`, `n4_de_gozaimasu`; `BOTH` -> `n4_formal_service_bundle`
- `softening-questions-and-interpersonal-tone`: `RQ-OBJ+FR` -> `n4_kai`, `n4_kana`, `n4_kashira`, `n4_question_phrase_ka`
- `respectful-social-reading`: `RQ-OBJ+FR` -> `n4_social_context_reading`; `BOTH` -> `n4_honorific_kanji_bundle`

#### `n4-multi-clause-reading-and-expression`
- `relative-clauses-and-modifying-information`: `RQ-OBJ+FR` -> `n4_describing_verbs`, `n4_verb_te_noun_de`, `n4_no_you_na_no_you_ni`, `n4_mitai_ni_mitai_na`
- `linking-reasons-and-multiple-points`: `RQ-OBJ+FR` -> `n4_shi_shi`, `n4_nakute_conjunction`, `n4_tatoeba`, `n4_sonna_konna_anna_donna`
- `despite-limits-and-extremes`: `RQ-OBJ+FR` -> `n4_no_ni_despite`, `n4_dake_de`, `n4_sukunaku_nai`, `n4_number_shika_nai`, `n4_number_mo`
- `integrated-multi-clause-reading`: `RQ-FR` -> `n4_multi_clause_reading_inference`, `n4_expression_bridge_to_n3`

## Delivery Notes For Follow-up Tasks
- `SYL-06A` harus memakai matrix ini saat memilih skill mana yang butuh deck bawaan. Pada fase ini, prioritas deck sistem tetap `KANA`, `KANJI`, dan `VOCABULARY`, yaitu skill yang berprofil `BOTH`.
- `SYL-06B` harus membawa nilai profile di atas ke field seed final:
  - `BOTH` -> `true / true / false`
  - `RQ-OBJ` -> `false / true / false`
  - `RQ-OBJ+FR` -> `false / true / true`
  - `RQ-FR` -> `false / false / true`
- Bila nanti ada perubahan format random question di luar `SHORT_FREE_RESPONSE`, `SLOT_FILL`, `ARRANGE_TOKEN`, dan `FREE_RESPONSE`, matrix ini boleh diperluas tanpa mengubah lesson map canonical.
