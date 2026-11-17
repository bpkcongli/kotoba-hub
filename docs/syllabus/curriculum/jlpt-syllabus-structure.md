# JLPT Syllabus Structure

## Scope
- Dokumen ini menyelesaikan task `SYL-01`.
- Fokusnya adalah mengunci struktur resmi syllabus `track -> unit -> lesson -> skill` berbasis JLPT untuk KotobaHub.
- Dokumen ini belum menetapkan daftar unit detail, lesson detail, atau inventory skill final per level; area itu tetap menjadi scope `SYL-02` sampai `SYL-06`.

## Final Decisions
- Syllabus KotobaHub tetap memakai empat lapisan resmi: `track -> unit -> lesson -> skill`.
- `track` pada baseline product mewakili satu fase besar ladder JLPT, bukan campuran banyak level dalam satu track.
- `unit` adalah grouping pedagogis utama di dalam satu track. Unit disusun berdasarkan tujuan belajar yang masuk akal untuk learner journey, bukan mengikuti struktur mentah source eksternal.
- `lesson` adalah objective belajar yang sempit dan cukup fokus untuk satu sesi belajar pendek.
- `skill` adalah target mastery paling atomik yang dipakai oleh `progress`, `personalization`, `flashcards`, dan `practice`.
- `curriculumLevel` final di layer product hanya boleh berasal dari kurasi internal KotobaHub, walau source eksternal memberi sinyal JLPT tambahan.

## Canonical Hierarchy

| Layer | Peran di product | Rule utama | Contoh |
| --- | --- | --- | --- |
| `track` | Jalur belajar besar per fase JLPT | Satu track mewakili satu level/fase utama | `jlpt-n5-foundation` |
| `unit` | Cluster materi utama di dalam track | Grouping pedagogis, bisa lintas source reference | `n5-kana-basics` |
| `lesson` | Sesi/objective belajar yang fokus | Harus cukup sempit untuk satu objective jelas | `hiragana-row-a` |
| `skill` | Kemampuan atomik yang di-track mastery-nya | Harus bisa dinilai dan diatribusikan ke user progress | `hiragana_a_row` |

## Track Policy

### Canonical Track Set
- `jlpt-n5-foundation`
- `jlpt-n4-expansion`
- `jlpt-n3-bridge`
- `jlpt-n2-advanced`

### Rules
- Setiap `track` harus memiliki tepat satu `curriculumLevel` utama: `N5`, `N4`, `N3`, atau `N2`.
- `N5` dan `N4` adalah baseline published ladder untuk MVP seed awal.
- `N3` dan `N2` boleh hadir lebih dulu sebagai skeleton unpublished agar schema, routing, dan course-map tidak berubah saat scope diperluas.
- Track tidak dipakai untuk memodelkan kategori konten seperti `grammar` atau `kanji`; kategori konten berada di level `skill_type`.

## Unit Policy
- `unit` adalah grouping pedagogis terbesar yang masih terasa sebagai satu topik perjalanan belajar.
- Satu unit harus tetap homogen secara tujuan utama, walau isi lesson dapat mencampur `kana`, `kanji`, `vocabulary`, `grammar`, atau `reading` bila memang diperlukan untuk objective unit.
- `isFoundationUnit = true` hanya dipakai untuk unit yang relevan sebagai pintu masuk awal track, terutama pada `N5` dan kemungkinan unit jembatan penting di `N4`.
- Penentuan urutan unit mengikuti learner journey KotobaHub, bukan urutan file source eksternal.

## Lesson Policy
- Satu `lesson` harus mewakili satu learning objective yang bisa dijelaskan dalam satu kalimat.
- Satu lesson boleh memperkenalkan lebih dari satu skill, tetapi semua skill di lesson tersebut harus masih berada dalam objective yang sama.
- Lesson adalah titik introduksi utama skill. Bila skill muncul lagi untuk reinforcement, reuse dilakukan lewat `unit_skill_mappings`, bukan dengan menggandakan definisi skill.
- `estimatedMinutes` harus mencerminkan sesi belajar singkat yang realistis untuk MVP, bukan mini-course panjang.

## Skill Policy
- `skill` adalah satuan terkecil yang di-track oleh sistem dan harus cukup atomik untuk:
  - menerima progress event
  - dihitung mastery snapshot-nya
  - dipakai sebagai target personalization
  - diikat ke jenis aktivitas belajar yang valid
- Setiap skill hanya punya satu `lesson_id` owner sebagai titik introduksi utama.
- `skill.code` harus stabil, human-readable, dan tidak bergantung pada `external_id` source mentah.
- `skill.slug` mengikuti bentuk route/content slug, sedangkan `skill.code` menjadi identifier referensial lintas module.
- `prerequisiteSkillCodes` dipakai untuk dependency ringan antarskill, bukan untuk memodelkan graph pedagogis yang sangat detail.

## Final `curriculumLevel` Taxonomy
- `N5`
- `N4`
- `N3`
- `N2`

Rules:
- `track.curriculumLevel` harus sama dengan fase ladder utama track.
- `skill.curriculumLevel` adalah level final hasil kurasi KotobaHub, bukan copy langsung dari field JLPT source mentah.
- Skill di satu lesson sebaiknya konsisten dengan level track induknya. Bila ada skill bridging, level final tetap harus dipilih eksplisit oleh kurasi internal.

## Final `skillType` Taxonomy
- `KANA`: penguasaan hiragana, katakana, bunyi dasar, dan kombinasinya.
- `KANJI`: penguasaan satu kanji atau cluster kecil kanji yang masih layak dinilai sebagai satu target mastery.
- `VOCABULARY`: penguasaan kosakata, makna, reading, dan penggunaan dasar kata/frasa pendek.
- `GRAMMAR`: penguasaan pola tata bahasa, fungsi pola, atau transformasi bentuk kalimat.
- `READING`: penguasaan pemahaman bacaan pendek, pola baca, atau interpretasi konteks kalimat/paragraf.

## Support Flag Policy

| `skillType` | `supportsFlashcards` | `supportsPracticeObjective` | `supportsPracticeFreeResponse` | Policy |
| --- | --- | --- | --- | --- |
| `KANA` | `true` | `true` | `false` | Fixed default untuk recognition dan recall dasar |
| `KANJI` | `true` | `true` | `false` | Fixed default pada MVP |
| `VOCABULARY` | `true` | `true` | `false` by default | Free response hanya diaktifkan bila skill memang menargetkan production Jepang |
| `GRAMMAR` | `false` by default | `false` by default | `true` by default | Objective boleh diaktifkan bila answer space deterministik |
| `READING` | `false` | `false` by default | `true` by default | Objective tidak menjadi baseline; aktifkan hanya bila nanti ada format comprehension yang benar-benar deterministik |

Operational rules:
- `supportsFlashcards` pada MVP diprioritaskan hanya untuk `KANA`, `KANJI`, dan `VOCABULARY`.
- `supportsPracticeObjective` dipakai bila sistem bisa menilai jawaban secara deterministic atau dengan opsi objektif yang sempit.
- `supportsPracticeFreeResponse` dipakai bila skill lebih cocok dinilai lewat produksi jawaban singkat atau interpretasi terbuka yang tetap terarah.

## Naming Convention
- `track.slug`: `jlpt-n{level}-{phase}`, contoh `jlpt-n5-foundation`
- `unit.slug`: `n{level}-{topic}`, contoh `n5-kana-basics`
- `lesson.slug`: kebab-case objective singkat, contoh `hiragana-row-a`
- `skill.code`: snake_case stabil lintas module, contoh `hiragana_a_row`
- `skill.slug`: kebab-case dari objective skill, contoh `hiragana-a-row`

## Reference Tree Example

```text
track: jlpt-n5-foundation
  unit: n5-kana-basics
    lesson: hiragana-row-a
      skill: hiragana_a_row (KANA)
    lesson: katakana-row-a
      skill: katakana_a_row (KANA)
  unit: n5-first-kanji-and-core-words
    lesson: day-and-time-basics
      skill: kanji_day_sun (KANJI)
      skill: vocab_today (VOCABULARY)
  unit: n5-core-particles
    lesson: particles-wa-ga-o
      skill: n5_particles_wa_ga_o (GRAMMAR)

track: jlpt-n4-expansion
  unit: n4-plain-form-bridge
    lesson: plain-past-form
      skill: n4_past_plain_form (GRAMMAR)
```

## Guardrails For Follow-up Tasks
- `SYL-02` harus memakai track set dan taxonomy di dokumen ini saat menentukan scope published vs skeleton.
- `SYL-04` tidak boleh membuat unit yang bertabrakan dengan rule “satu track = satu fase JLPT utama”.
- `SYL-05` tidak boleh membuat skill yang terlalu besar hingga tidak bisa menjadi target mastery tunggal.
- `SYL-06` harus menurunkan support flags mengikuti policy di dokumen ini, bukan menetapkan flag ad hoc per seed tanpa alasan pedagogis.

## Known Alignment Notes
- Dokumen ini menegaskan bahwa `KANJI` adalah `skillType` resmi. Ini menyelaraskan kebutuhan source-of-truth syllabus dengan referensi enum internal.
- Dokumen ini juga mengunci ladder product di `N5`, `N4`, `N3`, dan `N2`, sambil tetap mempertahankan keputusan MVP bahwa coverage detail awal difokuskan ke `N5 -> N4`.
