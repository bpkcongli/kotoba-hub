# JLPT Lesson And Skill Breakdown

## Scope
- Dokumen ini menyelesaikan task `SYL-05`.
- Fokusnya adalah menurunkan unit published `N5` dan `N4` menjadi daftar `lesson` yang stabil secara pedagogis, lalu mendefinisikan bentuk `skill` yang layak di-track oleh sistem pada tiap lesson.
- Support flags aktivitas per skill kini dikunci di [skill-activity-support-matrix.md](./skill-activity-support-matrix.md) sebagai deliverable `SYL-06`.
- Dokumen ini juga belum mengunci membership item flashcard bawaan per skill `KANJI` dan `VOCABULARY`; area itu menjadi scope `SYL-06A`.

## Output Decisions
- `jlpt-n5-foundation` dan `jlpt-n4-expansion` kini dianggap memiliki lesson map canonical yang siap diturunkan ke seed repo.
- `jlpt-n3-bridge` dan `jlpt-n2-advanced` tetap unpublished shell dan tidak diturunkan menjadi lesson detail pada tahap ini.
- Setiap lesson harus tetap cukup fokus untuk satu sesi belajar singkat, tetapi boleh memperkenalkan campuran `GRAMMAR`, `VOCABULARY`, `KANJI`, dan `READING` bila semua skill masih mendukung objective yang sama.
- Lesson breakdown di bawah ini dipakai sebagai baseline kurikulum, bukan sekadar contoh naratif.

## Skill Granularity Baseline

### `KANA`
- Satu skill `KANA` idealnya mewakili satu row, satu family bunyi, atau satu pola baca kecil yang masih bisa diuji deterministik.
- Contoh yang valid: `hiragana_a_row`, `katakana_dakuten_rows`, `small_tsu_gemination`.

### `KANJI`
- Satu skill `KANJI` pada baseline product mewakili satu kanji tunggal atau micro-cluster yang sangat rapat secara fungsi dan pengenalan visual.
- Pada dokumen ini, lesson menuliskan `kanji bundles` agar sequencing kurikulum stabil lebih dulu.
- Literal kanji final dan membership per bundle akan dikunci lanjut pada task `SYL-06A`.

### `VOCABULARY`
- Satu skill `VOCABULARY` idealnya mewakili satu lemma, fixed expression, atau cluster mikro yang memang dipelajari sebagai satu objective bermakna.
- Pada dokumen ini, vocabulary diturunkan sebagai `vocab bundles` per lesson agar learner journey jelas lebih dulu.
- Item lemma final, reading, dan flashcard membership per bundle juga dilanjutkan pada `SYL-06A`.

### `GRAMMAR`
- Satu skill `GRAMMAR` idealnya mewakili satu grammar point canonical atau contrast pair yang benar-benar deterministik.
- Untuk `N5` dan `N4`, grammar lesson di bawah ini sengaja mengikuti inventaris Bunpro sebagai baseline source, tetapi dikelompokkan ulang secara pedagogis ke unit KotobaHub.

### `READING`
- Satu skill `READING` mewakili objective pemahaman yang sempit: misalnya membaca profil singkat, jadwal pendek, petunjuk lokasi, atau paragraf multi-klausa sederhana.
- `READING` tidak harus muncul di semua lesson, tetapi wajib mulai hadir sebagai objective integratif pada unit penutup `N5` dan `N4`.

## N5 Breakdown

### `n5-kana-basics`
- `hiragana-vowels-and-k-row`
  Objective: mengenali lima vokal dasar dan bunyi `k` agar learner punya anchor fonetik pertama.
  Trackable skills: `hiragana_a_row`, `hiragana_ka_row`.
- `hiragana-s-t-n-row`
  Objective: memperluas literasi hiragana ke row frekuensi tinggi untuk kata kerja dan kata benda dasar.
  Trackable skills: `hiragana_sa_row`, `hiragana_ta_row`, `hiragana_na_row`.
- `hiragana-h-m-y-r-w-row`
  Objective: menutup inventory hiragana inti sebelum masuk variasi bunyi tambahan.
  Trackable skills: `hiragana_ha_row`, `hiragana_ma_row`, `hiragana_ya_row`, `hiragana_ra_row`, `hiragana_wa_n_row`.
- `hiragana-dakuten-handakuten-and-small-tsu`
  Objective: mengenali perubahan bunyi voiced dan konsonan ganda sederhana.
  Trackable skills: `hiragana_dakuten_rows`, `hiragana_handakuten_row`, `small_tsu_gemination`.
- `katakana-core-rows`
  Objective: membaca katakana inti untuk kata serapan dasar dan nama benda umum.
  Trackable skills: `katakana_a_row`, `katakana_ka_row`, `katakana_sa_ta_na_rows`, `katakana_ha_ma_ya_ra_wa_rows`.
- `katakana-voiced-combos-and-script-switch`
  Objective: membedakan katakana voiced, combination sounds, dan perpindahan script dasar.
  Trackable skills: `katakana_dakuten_rows`, `katakana_handakuten_row`, `katakana_combo_sounds`, `kana_script_switch_basics`.

### `n5-self-introduction-and-copula`
- `greetings-and-polite-openers`
  Objective: memakai sapaan dasar dan formula pembuka interaksi singkat.
  Trackable skills: `n5_vocab_greetings_and_polite_openers`, `n5_vocab_basic_self_intro_phrases`.
- `copula-affirmative-and-questions`
  Objective: membuat kalimat nominal sangat dasar tentang identitas diri dan orang lain.
  Trackable skills: `n5_copula_affirmative`, `n5_copula_question_ka`, `n5_copula_plain_da`.
- `copula-negative-and-past-reference`
  Objective: menolak atau merujuk identitas/keadaan nominal di waktu lampau.
  Trackable skills: `n5_copula_negative`, `n5_copula_negative_past`, `n5_copula_past_polite`.
- `belonging-role-and-basic-preference`
  Objective: menyebut peran, afiliasi, dan preferensi sederhana dalam konteks perkenalan.
  Trackable skills: `n5_particle_mo`, `n5_vocab_identity_and_roles`, `n5_like_dislike_nominal_statements`.

### `n5-this-that-and-place-reference`
- `ko-so-a-do-pronouns`
  Objective: menunjuk benda dengan referensi dekat-pendengar-jauh.
  Trackable skills: `n5_kosoado_pronouns`, `n5_vocab_classroom_objects_basic`.
- `ko-so-a-do-modifiers`
  Objective: memodifikasi noun dengan referensi `this/that/which`.
  Trackable skills: `n5_kosoado_modifiers`, `n5_vocab_people_places_things_basic`.
- `place-reference-and-location-questions`
  Objective: menanyakan dan menyebut lokasi sangat dasar.
  Trackable skills: `n5_place_reference_words`, `n5_where_question_doko`, `n5_vocab_campus_and_home_places`.
- `choice-and-person-reference`
  Objective: menanyakan orang, pilihan benda, dan kepemilikan sederhana.
  Trackable skills: `n5_who_dare`, `n5_which_one_dore`, `n5_which_noun_dono`, `n5_vocab_people_reference_basic`.

### `n5-core-particles-and-sentence-order`
- `topic-subject-and-possession`
  Objective: membedakan topik, subjek, dan relasi kepemilikan sederhana.
  Trackable skills: `n5_topic_particle_wa`, `n5_subject_particle_ga`, `n5_possessive_particle_no`.
- `objects-companions-and-loose-listing`
  Objective: menyusun kalimat dengan objek, teman, dan daftar sederhana.
  Trackable skills: `n5_object_particle_o`, `n5_and_particle_to`, `n5_with_particle_to`, `n5_listing_particle_ya`.
- `place-time-and-means-particles`
  Objective: menandai lokasi aksi, tujuan, waktu, asal, dan batas sederhana.
  Trackable skills: `n5_particle_ni`, `n5_particle_de`, `n5_particle_e`, `n5_particle_kara`, `n5_particle_made`.
- `sentence-ending-and-basic-quoting`
  Objective: memperhalus kalimat pendek dengan sentence ending dan kutipan ringan.
  Trackable skills: `n5_sentence_ending_ne`, `n5_sentence_ending_yo`, `n5_basic_quoting_tte`.

### `n5-daily-verbs-and-routines`
- `polite-verb-basics`
  Objective: mengenali bentuk non-past sopan untuk rutinitas sehari-hari.
  Trackable skills: `n5_verb_non_past`, `n5_polite_verb_endings`, `n5_vocab_daily_routine_verbs`.
- `u-verbs-and-ru-verbs-in-time`
  Objective: mengonjugasi verba kelompok utama ke negatif dan lampau.
  Trackable skills: `n5_u_verb_basics`, `n5_u_verb_past`, `n5_u_verb_negative_past`, `n5_ru_verb_basics`, `n5_ru_verb_past`, `n5_ru_verb_negative_past`.
- `irregular-verbs-and-purpose`
  Objective: memakai `する`, `くる`, dan purpose phrase untuk aktivitas umum.
  Trackable skills: `n5_irregular_suru`, `n5_irregular_kuru`, `n5_verb_purpose_ni_iku`.
- `desire-intention-and-invitation`
  Objective: mengekspresikan keinginan, niat, ajakan, dan pengalaman dasar.
  Trackable skills: `n5_desire_tai`, `n5_intention_tsumori`, `n5_suggestion_mashou`, `n5_invitation_masenka`, `n5_experience_ta_koto_ga_aru`.

### `n5-descriptions-and-preferences`
- `i-adjective-core-usage`
  Objective: mendeskripsikan benda dan keadaan dengan `i-adjective`.
  Trackable skills: `n5_i_adjective_predicate`, `n5_i_adjective_noun_modifier`, `n5_i_adjective_inventory_basic`.
- `na-adjective-core-usage`
  Objective: memakai `na-adjective` untuk deskripsi orang, tempat, dan situasi.
  Trackable skills: `n5_na_adjective_predicate`, `n5_na_adjective_noun_modifier`, `n5_na_adjective_inventory_basic`.
- `adjective-past-negative-and-joining`
  Objective: mengubah adjective ke bentuk lampau, negatif, dan sambung.
  Trackable skills: `n5_i_adjective_negative`, `n5_i_adjective_past`, `n5_i_adjective_negative_past`, `n5_adjective_te_joining`, `n5_adjective_noun_de_joining`.
- `likes-dislikes-skill-and-comparison`
  Objective: menyatakan suka, tidak suka, mahir, kurang mahir, dan perbandingan sederhana.
  Trackable skills: `n5_no_ga_suki`, `n5_no_ga_kirai`, `n5_no_ga_jouzu`, `n5_no_ga_heta`, `n5_yori_no_hou_ga`, `n5_naka_de_ichiban`.

### `n5-time-counting-and-schedules`
- `numbers-counters-and-approximation`
  Objective: membaca angka, jumlah, dan perkiraan sederhana untuk aktivitas harian.
  Trackable skills: `n5_vocab_numbers_basic`, `n5_vocab_people_objects_counters`, `n5_amount_kurai`.
- `days-time-and-deadlines`
  Objective: memahami hari, jam, dan batas waktu ringan.
  Trackable skills: `n5_vocab_days_and_clock_time`, `n5_time_deadline_made`, `n5_time_origin_kara`.
- `before-after-and-status-checks`
  Objective: menjelaskan urutan waktu serta status belum/sudah pada jadwal sederhana.
  Trackable skills: `n5_before_mae_ni`, `n5_still_yet_mada`, `n5_already_mou`, `n5_not_yet_mada_te_imasen`.
- `schedule-and-frequency-phrases`
  Objective: membaca dan membuat jadwal pendek dengan ekspresi frekuensi dasar.
  Trackable skills: `n5_vocab_frequency_and_schedule`, `n5_vocab_calendar_kanji_bundle`, `n5_reading_micro_schedule`.

### `n5-movement-existence-and-location`
- `existence-of-things-and-people`
  Objective: menyatakan keberadaan benda dan orang di lokasi tertentu.
  Trackable skills: `n5_existence_aru`, `n5_existence_iru`, `n5_noun_ga_aru`, `n5_vocab_home_school_locations`.
- `going-coming-and-returning`
  Objective: memakai verba perpindahan dasar untuk rute harian.
  Trackable skills: `n5_vocab_motion_verbs`, `n5_destination_particle_e`, `n5_destination_particle_ni`.
- `location-actions-and-transport`
  Objective: menyebut aksi yang dilakukan di tempat tertentu dan cara dasar bepergian.
  Trackable skills: `n5_location_particle_de`, `n5_transport_and_method_bundle`, `n5_location_kanji_bundle`.
- `giving-and-receiving-basics`
  Objective: memahami arah manfaat dalam aksi memberi, menerima, dan mendapat bantuan sederhana.
  Trackable skills: `n5_giving_ageru`, `n5_receiving_kureru`, `n5_receiving_morau`, `n5_vocab_social_exchange_basic`.

### `n5-te-form-and-everyday-functions`
- `te-form-construction`
  Objective: membentuk `te-form` dari verba utama dan mengenali fungsi penghubungnya.
  Trackable skills: `n5_verb_te_form`, `n5_verb_te_linking`, `n5_vocab_instruction_verbs`.
- `requests-permission-and-prohibition`
  Objective: membuat permintaan, izin, dan larangan sehari-hari.
  Trackable skills: `n5_request_te_kudasai`, `n5_permission_te_mo_ii`, `n5_prohibition_te_wa_ikenai`, `n5_request_negative_naide_kudasai`.
- `obligation-and-better-not`
  Objective: menyatakan kewajiban ringan dan saran untuk menghindari aksi tertentu.
  Trackable skills: `n5_obligation_nakucha`, `n5_obligation_nakute_wa_ikenai`, `n5_obligation_nakute_wa_naranai`, `n5_advice_nai_hou_ga_ii`.
- `ongoing-state-and-sequencing`
  Objective: menggambarkan aksi yang sedang berlangsung, keadaan hasil, dan urutan aksi sederhana.
  Trackable skills: `n5_te_iru_progressive`, `n5_te_iru_habitual`, `n5_te_iru_result_state`, `n5_te_kara_sequence`.

### `n5-reasons-comparisons-and-short-reading`
- `reasons-and-soft-explanations`
  Objective: memberi alasan dan penjelasan singkat dalam kalimat sehari-hari.
  Trackable skills: `n5_reason_kara`, `n5_reason_node`, `n5_explanatory_n_desu`.
- `contrast-choice-and-alternative`
  Objective: menggabungkan dua ide dengan kontras atau pilihan ringan.
  Trackable skills: `n5_contrast_ga`, `n5_contrast_kedo`, `n5_contrast_keredomo`, `n5_choice_ka_or`.
- `becoming-and-evaluating`
  Objective: menyatakan perubahan keadaan, pilihan, dan tingkat berlebih.
  Trackable skills: `n5_becoming_ni_naru_ku_naru`, `n5_choice_ni_suru`, `n5_excess_sugiru`.
- `short-reading-integration`
  Objective: membaca dialog atau paragraf pendek yang memadukan deskripsi, alasan, dan perbandingan sederhana.
  Trackable skills: `n5_relative_clause_verb_ta_noun`, `n5_nominalizer_no_wa`, `n5_short_reading_reason_and_comparison`.

## N4 Breakdown

### `n4-plain-form-bridge`
- `plain-present-and-past`
  Objective: mengunci bentuk plain present dan plain past sebagai fondasi N4.
  Trackable skills: `n4_plain_present_verbs`, `n4_plain_past_verbs`, `n4_plain_copula_past`.
- `plain-negative-and-casual-copula`
  Objective: memakai negasi plain dan variasi casual noun/adjective sentences.
  Trackable skills: `n4_plain_negative_verbs`, `n4_plain_negative_copula`, `n4_plain_negative_adjectives`.
- `quotation-thought-and-speech`
  Objective: mengutip ucapan atau pikiran dengan plain form sebagai basis.
  Trackable skills: `n4_to_omou`, `n4_to_iu`, `n4_to_kiita`, `n4_plain_form_for_embedded_clauses`.
- `embedded-questions-and-nominalization`
  Objective: memahami kalimat bawahan, nominalisasi, dan pertanyaan tak langsung.
  Trackable skills: `n4_kadouka`, `n4_koto_nominalization`, `n4_no_nominalization`, `n4_plain_form_reading_bridge`.

### `n4-intention-ability-and-experience`
- `ability-and-potential`
  Objective: mengekspresikan kemampuan dengan pola potensial inti.
  Trackable skills: `n4_potential_form`, `n4_koto_ga_dekiru`, `n4_capability_context_vocab`.
- `wants-needs-and-goals`
  Objective: mengekspresikan keinginan, kebutuhan, dan target pribadi.
  Trackable skills: `n4_ga_hoshii`, `n4_te_hoshii`, `n4_necessity_ga_hitsuyou`, `n4_goal_setting_vocab`.
- `plans-intentions-and-trying`
  Objective: menyatakan rencana, niat, dan percobaan aksi.
  Trackable skills: `n4_you_to_omou`, `n4_yotei_da`, `n4_te_miru`, `n4_hajimeru`.
- `experience-habit-and-growing-ability`
  Objective: membicarakan pengalaman, kebiasaan berlanjut, dan perubahan kemampuan.
  Trackable skills: `n4_tsudzukeru`, `n4_you_ni_naru`, `n4_you_ni_suru`, `n4_experience_growth_reading`.

### `n4-giving-receiving-and-favors`
- `giving-receiving-core`
  Objective: membedakan perspektif memberi dan menerima pada interaksi sosial.
  Trackable skills: `n4_te_ageru`, `n4_te_kureru`, `n4_te_morau`, `n4_social_viewpoint_vocab`.
- `requests-and-help-in-context`
  Objective: meminta bantuan atau tindakan orang lain dengan nuansa yang tepat.
  Trackable skills: `n4_te_itadakemasenka`, `n4_o_kudasai`, `n4_te_kurenai_te_moraenai`, `n4_request_softening_vocab`.
- `gratitude-and-unintended-outcome`
  Objective: membicarakan bantuan yang diterima dan hasil aksi yang tidak ideal.
  Trackable skills: `n4_te_kurete_arigatou`, `n4_te_shimau`, `n4_service_and_apology_bundle`.
- `honorific-and-humble-intro`
  Objective: mengenali register hormat dan rendah yang sering muncul pada konteks layanan.
  Trackable skills: `n4_itasu`, `n4_irassharu`.

### `n4-sequencing-and-ongoing-actions`
- `after-before-and-order-of-actions`
  Objective: menjelaskan aksi berurutan dan penempatan waktu yang lebih natural.
  Trackable skills: `n4_atode`, `n4_ta_tokoro_da`, `n4_ordering_vocab`.
- `while-during-and-in-the-middle`
  Objective: menyatakan aksi simultan atau aksi yang terjadi saat proses lain berlangsung.
  Trackable skills: `n4_nagara`, `n4_teiru_aida_ni`, `n4_teiru_tokoro_da`.
- `preparation-result-state-and-movement`
  Objective: memahami aksi persiapan, state hasil, dan gerak perubahan progresif.
  Trackable skills: `n4_teoku`, `n4_tearu`, `n4_teiku`, `n4_tekuru`.
- `starting-finishing-restarting`
  Objective: menceritakan siklus aksi dari mulai, selesai, hingga mengulang atau memperbaiki.
  Trackable skills: `n4_owaru`, `n4_dasu`, `n4_naosu`, `n4_teita`.

### `n4-conditions-reasons-and-advice`
- `if-when-and-possible-cases`
  Objective: membedakan conditional utama untuk hasil, kebiasaan, dan kemungkinan.
  Trackable skills: `n4_tara_conditional`, `n4_ba_conditional`, `n4_to_conditional`, `n4_baai_wa`.
- `necessity-prohibition-and-allowance`
  Objective: membahas keharusan, larangan, dan keringanan aturan.
  Trackable skills: `n4_nai_to`, `n4_nakereba_ikenai`, `n4_nakereba_naranai`, `n4_nakutemo_ii`, `n4_hitsuyou_ga_aru`.
- `reasons-contrast-and-emphasis`
  Objective: menyatakan alasan, penilaian, dan reaksi dengan nuansa lebih kuat.
  Trackable skills: `n4_daga_desuga`, `n4_janai_ka`, `n4_noda_rou_ka`, `n4_explanatory_reasoning_bundle`.
- `advice-wishes-and-regret`
  Objective: memberi saran, menilai pilihan, dan mengekspresikan penyesalan ringan.
  Trackable skills: `n4_tara_dou`, `n4_ba_yokatta`, `n4_te_yokatta`, `n4_narubeku`.

### `n4-comparison-quantity-and-limits`
- `quantity-and-frequency-expressions`
  Objective: memahami banyak-sedikit, frekuensi, dan ukuran kasar dalam kalimat sehari-hari.
  Trackable skills: `n4_go_to_ni`, `n4_goro`, `n4_daitai`, `n4_quantity_vocab_bundle`.
- `only-except-and-not-much`
  Objective: mengekspresikan batas, pengecualian, dan ketidakcukupan.
  Trackable skills: `n4_shika_nai`, `n4_amari_nai`, `n4_sukoshi_mo_nai`, `n4_zenzen`, `n4_hotondo`.
- `comparison-range-and-degree`
  Objective: membandingkan pilihan, intensitas, dan rentang kuantitas.
  Trackable skills: `n4_ika`, `n4_igai`, `n4_sonna_ni`, `n4_hikaku_quantity_reading`.
- `examples-categories-and-inclusion`
  Objective: menyebut contoh, kategori, dan tambahan item di luar daftar inti.
  Trackable skills: `n4_toka_toka`, `n4_nado`, `n4_dake_de_naku`, `n4_hoka_ni_mo`.

### `n4-state-changes-and-viewpoint-shifts`
- `becoming-seeming-and-looking`
  Objective: membaca perubahan keadaan dan kesan yang tampak dari permukaan.
  Trackable skills: `n4_sou`, `n4_sou_ni_sou_na`, `n4_you_da`, `n4_mitai`, `n4_rashii`.
- `transitivity-and-resulting-viewpoint`
  Objective: memahami pasangan transitif-intransitif dan cara hasil aksi dipersepsikan.
  Trackable skills: `n4_transitive_intransitive_pairs`, `n4_mieru`, `n4_kikoeru`, `n4_ga_mirareru`.
- `causative-and-passive`
  Objective: membahas dipaksa, disuruh, atau terkena aksi orang lain.
  Trackable skills: `n4_passive_form`, `n4_causative_form`, `n4_causative_passive_form`.
- `ease-difficulty-and-emotional-signals`
  Objective: mengukur mudah-sulitnya aksi dan sinyal perasaan yang tampak.
  Trackable skills: `n4_yasui`, `n4_nikui`, `n4_zurai`, `n4_garu`, `n4_tagaru`.

### `n4-explanations-hearsay-and-uncertainty`
- `background-and-soft-explanation`
  Objective: memakai pola penjelasan implisit untuk memberi konteks pada ucapan.
  Trackable skills: `n4_ndakedo_ndesuga`, `n4_backgrounding_vocab`.
- `hearsay-and-reported-information`
  Objective: menyampaikan informasi tidak langsung dan sumber pendapat umum.
  Trackable skills: `n4_to_iwareteiru`, `n4_to_sareteiru`, `n4_to_kangaerareteiru`, `n4_to_omowareru_bundle`.
- `guessing-probability-and-uncertainty`
  Objective: mengutarakan dugaan dan tingkat kepastian yang belum penuh.
  Trackable skills: `n4_kamoshirenai`, `n4_hazu_da`, `n4_hazu_ga_nai`, `n4_maybe_context_vocab`.
- `concession-and-contrastive-follow-up`
  Objective: menghubungkan dua klausa ketika hasilnya tidak sejalan dengan dugaan awal.
  Trackable skills: `n4_sorede`, `n4_soreni`, `n4_soredemo`, `n4_demo_demo`, `n4_demo`.

### `n4-respectful-language-and-social-context`
- `service-register-core`
  Objective: mengenali pola hormat dan rendah yang paling sering muncul di toko, sekolah, dan layanan.
  Trackable skills: `n4_o_suru`, `n4_o_ni_naru`, `n4_nasaru`, `n4_respectful_service_vocab`.
- `formal-presence-and-institutional-tone`
  Objective: memahami tone formal yang terasa lebih resmi daripada register N5.
  Trackable skills: `n4_gozaimasu`, `n4_de_gozaimasu`, `n4_formal_service_bundle`.
- `softening-questions-and-interpersonal-tone`
  Objective: membaca variasi pertanyaan dan tone sosial yang lebih halus.
  Trackable skills: `n4_kai`, `n4_kana`, `n4_kashira`, `n4_question_phrase_ka`.
- `respectful-social-reading`
  Objective: memahami dialog singkat yang melibatkan atasan, pelanggan, atau orang yang perlu dihormati.
  Trackable skills: `n4_social_context_reading`, `n4_honorific_kanji_bundle`.

### `n4-multi-clause-reading-and-expression`
- `relative-clauses-and-modifying-information`
  Objective: membaca noun phrase yang dipadatkan dengan klausa penjelas.
  Trackable skills: `n4_describing_verbs`, `n4_verb_te_noun_de`, `n4_no_you_na_no_you_ni`, `n4_mitai_ni_mitai_na`.
- `linking-reasons-and-multiple-points`
  Objective: menggabungkan beberapa alasan, contoh, atau deskripsi dalam satu alur.
  Trackable skills: `n4_shi_shi`, `n4_nakute_conjunction`, `n4_tatoeba`, `n4_sonna_konna_anna_donna`.
- `despite-limits-and-extremes`
  Objective: memahami bacaan yang memuat keterbatasan, pengecualian, atau hasil di luar harapan.
  Trackable skills: `n4_no_ni_despite`, `n4_dake_de`, `n4_sukunaku_nai`, `n4_number_shika_nai`, `n4_number_mo`.
- `integrated-multi-clause-reading`
  Objective: menutup N4 dengan reading pendek-menengah yang memadukan opini, alasan, urutan, dan dugaan.
  Trackable skills: `n4_multi_clause_reading_inference`, `n4_expression_bridge_to_n3`.

## Cross-Track Notes
- `KANA` hampir seluruhnya dimiliki `n5-kana-basics`. Unit N4 tidak membuat inventaris kana baru, hanya memakai kana sebagai support reading.
- `KANJI` dan `VOCABULARY` dipecah per lesson sebagai bundle sequencing, bukan sebagai ladder terpisah dari learner journey.
- Grammar N5/N4 di dokumen ini diposisikan sebagai skill trackable yang diperkenalkan pertama kali di lesson owner tertentu. Reinforcement di unit/lesson lain nanti cukup lewat `unit_skill_mappings`.
- `READING` sengaja mulai lebih nyata pada unit penutup `N5` dan `N4`, tetapi lesson lain boleh menyisipkan reading micro-task selama tidak mengubah owner skill utama.

## Handoff To Follow-up Tasks
- Support flags final untuk tiap skill kini dikunci di [skill-activity-support-matrix.md](./skill-activity-support-matrix.md) sebagai hasil `SYL-06`.
- `SYL-06A` harus memakai bundle sequencing di dokumen ini untuk memecah `KANJI` dan `VOCABULARY` menjadi membership item final, deck bawaan, dan relasi `skill -> flashcard item -> flashcard deck`.
- Saat seed JSON mulai dibuat, lesson slug dan objective di dokumen ini sebaiknya dipertahankan agar API contract syllabus tidak perlu direvisi ulang.
