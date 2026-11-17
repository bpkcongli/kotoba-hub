# JLPT Unit Sequencing

## Scope
- Dokumen ini menyelesaikan task `SYL-04`.
- Fokusnya adalah mengunci daftar `unit` per track JLPT yang masuk akal untuk learner journey KotobaHub, beserta urutan belajar utamanya.
- Dokumen ini belum menurunkan `lesson`, `skill`, `prerequisiteSkillCodes`, atau support flags detail; area tersebut tetap menjadi scope `SYL-05` dan `SYL-06`.

## Sequencing Principles
- Urutan unit mengikuti learner journey KotobaHub, bukan urutan alfabetis source, bukan urutan file mentah provider, dan bukan urutan deck grammar apa adanya.
- `N5` harus dimulai dari fondasi yang membuat learner baru cepat bisa membaca, membangun kalimat sangat pendek, dan mengenali pola yang paling sering muncul.
- `N4` harus dimulai dari jembatan bentuk kasual/plain form karena banyak grammar menengah mengandalkan fondasi itu.
- `KANJI` dan `VOCABULARY` tidak wajib dipisah menjadi unit tersendiri; keduanya boleh disebar mengikuti tema fungsi bahasa, selama sequencing tetap mendukung flashcard dan practice di tahap berikutnya.
- `READING` diperlakukan sebagai integrasi bertahap, bukan inventory yang berdiri sendiri sejak awal, karena source primer saat ini lebih kuat untuk grammar dan lexical item dibanding bank reading terstruktur.

## Final Decisions
- `jlpt-n5-foundation` memakai `10` unit published yang berangkat dari literasi kana lalu bergerak ke kalimat dasar, rutinitas, lokasi, dan konektor sederhana.
- `jlpt-n4-expansion` memakai `10` unit published yang berangkat dari plain form, lalu berkembang ke nuansa fungsi bahasa, hubungan antarklausa, dan reading multi-klausa.
- `jlpt-n3-bridge` dan `jlpt-n2-advanced` tetap dipertahankan sebagai unpublished shell pada tahap ini; daftar unit detailnya belum dikunci agar tidak melampaui scope `SYL-02`.
- Foundation unit resmi yang diprioritaskan oleh onboarding/recommendation awal tetap:
  - `n5-kana-basics` untuk `jlpt-n5-foundation`
  - `n4-plain-form-bridge` untuk `jlpt-n4-expansion`

## N5 Unit Order

| Order | Unit slug | Title | Tujuan pedagogis utama | Catatan sequencing |
| --- | --- | --- | --- | --- |
| 1 | `n5-kana-basics` | Kana Basics | Membuat learner bisa membaca hiragana, katakana dasar, dan pola bunyi inti sebelum masuk ke kalimat bermakna. | Menjadi foundation unit utama untuk learner benar-benar baru. |
| 2 | `n5-self-introduction-and-copula` | Self Introduction And Copula | Memperkenalkan kalimat nominal paling dasar untuk identitas, sapaan, dan survival classroom language. | Dipasang awal agar learner cepat merasa bisa "mengatakan sesuatu" dalam bahasa Jepang. |
| 3 | `n5-this-that-and-place-reference` | This, That, And Place Reference | Mengajarkan referensi benda, orang, dan lokasi dengan pola yang langsung berguna di percakapan dasar. | Diletakkan sebelum grammar yang lebih berat agar learner punya anchor konteks visual yang mudah. |
| 4 | `n5-core-particles-and-sentence-order` | Core Particles And Sentence Order | Mengunci pola topik, subjek, objek, kepemilikan, dan penyusunan kalimat pendek yang stabil. | Unit ini adalah fondasi struktural untuk hampir semua lesson sesudahnya. |
| 5 | `n5-daily-verbs-and-routines` | Daily Verbs And Routines | Memperkenalkan pola verba sopan dasar untuk rutinitas harian, aksi sederhana, dan pertanyaan dasar. | Baru masuk setelah learner cukup nyaman dengan pembacaan dan partikel inti. |
| 6 | `n5-descriptions-and-preferences` | Descriptions And Preferences | Mengajarkan adjective dasar, suka/tidak suka, serta deskripsi orang, benda, dan keadaan sederhana. | Ditempatkan setelah verba dasar agar learner bisa mulai memperkaya kalimat, bukan hanya menyebut aksi. |
| 7 | `n5-time-counting-and-schedules` | Time, Counting, And Schedules | Mengelompokkan angka, counter, hari, jam, frekuensi, dan ekspresi jadwal yang sangat sering dipakai. | Tema ini muncul setelah rutinitas agar konteks penggunaan waktunya terasa natural. |
| 8 | `n5-movement-existence-and-location` | Movement, Existence, And Location | Menyatukan perpindahan, keberadaan orang/benda, dan relasi tempat dalam kalimat praktis. | Dipasang setelah partikel, verba, dan waktu karena pola lokasi sangat bergantung pada fondasi itu. |
| 9 | `n5-te-form-and-everyday-functions` | Te-form And Everyday Functions | Memperkenalkan te-form untuk request, permission, ongoing action, dan penghubung aksi sederhana. | Ini menjadi gerbang terakhir sebelum learner masuk ke kombinasi pola yang lebih fleksibel. |
| 10 | `n5-reasons-comparisons-and-short-reading` | Reasons, Comparisons, And Short Reading | Menutup N5 dengan konektor dasar, alasan sederhana, perbandingan ringan, dan reading pendek terarah. | Unit akhir berfungsi sebagai integration pass untuk vocabulary, kanji, dan grammar yang sudah diperkenalkan. |

## N4 Unit Order

| Order | Unit slug | Title | Tujuan pedagogis utama | Catatan sequencing |
| --- | --- | --- | --- | --- |
| 1 | `n4-plain-form-bridge` | Plain Form Bridge | Mengunci bentuk kasual/plain form sebagai prasyarat untuk sebagian besar pola grammar N4. | Menjadi foundation unit resmi untuk learner yang naik dari N5. |
| 2 | `n4-intention-ability-and-experience` | Intention, Ability, And Experience | Memperluas ekspresi niat, keinginan, kemampuan, dan pengalaman personal. | Dipasang cepat karena pola ini bernilai tinggi untuk percakapan sehari-hari dan menuntut plain form yang stabil. |
| 3 | `n4-giving-receiving-and-favors` | Giving, Receiving, And Favors | Mengajarkan perspektif sosial saat memberi, menerima, dan melakukan sesuatu untuk orang lain. | Unit ini memperdalam relasi antarpartisipan sebelum learner masuk ke kalimat yang lebih panjang. |
| 4 | `n4-sequencing-and-ongoing-actions` | Sequencing And Ongoing Actions | Menangani urutan aksi, kebiasaan, penundaan, persiapan, dan durasi aktivitas. | Cocok diletakkan lebih awal karena sangat produktif untuk narasi aktivitas harian. |
| 5 | `n4-conditions-reasons-and-advice` | Conditions, Reasons, And Advice | Mengelompokkan pola sebab-akibat, conditional, saran, kewajiban, dan larangan yang lebih eksplisit. | Unit ini menjadi titik transisi dari kalimat satu klausa ke reasoning yang lebih kompleks. |
| 6 | `n4-comparison-quantity-and-limits` | Comparison, Quantity, And Limits | Membahas perbandingan, derajat, jumlah, batas, dan nuansa "hanya/sekitar/terlalu". | Ditempatkan setelah learner cukup nyaman dengan struktur kalimat majemuk ringan. |
| 7 | `n4-state-changes-and-viewpoint-shifts` | State Changes And Viewpoint Shifts | Memperkenalkan perubahan keadaan, cara melihat hasil aksi, serta pergeseran sudut pandang yang lebih abstrak. | Unit ini menyiapkan learner untuk pola menengah yang tidak lagi selalu literal satu aksi satu hasil. |
| 8 | `n4-explanations-hearsay-and-uncertainty` | Explanations, Hearsay, And Uncertainty | Mengajarkan penjelasan implisit, kutipan isi pikiran/ucapan, informasi tidak langsung, dan ketidakpastian. | Diletakkan setelah fondasi multi-klausa cukup kuat agar nuansa maknanya tidak terlalu membebani. |
| 9 | `n4-respectful-language-and-social-context` | Respectful Language And Social Context | Memperkenalkan bentuk sopan sosial yang lebih sadar konteks tanpa masuk terlalu jauh ke level lanjut. | Datang belakangan karena learner perlu cukup stabil dulu pada pola inti sebelum memproses variasi register. |
| 10 | `n4-multi-clause-reading-and-expression` | Multi-clause Reading And Expression | Menutup N4 dengan integrasi reading pendek-menengah, chaining clauses, dan ekspresi yang lebih natural. | Unit akhir diposisikan sebagai jembatan menuju `N3`, bukan sekadar review kosmetik. |

## Cross-Unit Packaging Notes
- `KANA` terkonsentrasi hampir seluruhnya di `n5-kana-basics`, lalu muncul kembali hanya sebagai reinforcement atau reading support di unit sesudahnya.
- `KANJI` dan `VOCABULARY` harus diturunkan mengikuti tema tiap unit, bukan dibuat sebagai ladder terpisah yang memecah learner journey.
- Unit `N5` sesudah fondasi kana harus mulai membawa kanji dan vocabulary frekuensi tinggi secara bertahap agar learner tidak mengalami dua track mental yang terpisah antara "membaca huruf" dan "belajar bahasa".
- Unit `N4` tidak perlu membuat unit kana baru; bila ada review kana, posisinya hanya sebagai support untuk reading fluency atau pembenahan confusion pair.
- `READING` paling aman diperlakukan sebagai objective integratif, terutama di unit penutup `N5` dan `N4`, sambil tetap membuka ruang reading mini di unit sebelumnya bila memang membantu objective.

## Out Of Scope For This Stage
- `jlpt-n3-bridge` dan `jlpt-n2-advanced` belum mendapatkan daftar unit final pada dokumen ini.
- Kita sengaja tidak mengunci jumlah `lesson` per unit pada `SYL-04`.
- Kita juga belum mengunci distribusi grammar Bunpro satu per satu ke unit tertentu; distribusi detail itu baru aman dilakukan di `SYL-05`.

## Guardrails For `SYL-05`
- Lesson harus diturunkan dengan tetap menghormati urutan unit di dokumen ini; jangan membuat lesson awal yang mengandaikan penguasaan unit berikutnya.
- Grammar point Bunpro `N5` dan `N4` perlu dipetakan ke unit berdasarkan fungsi belajar, bukan sekadar label deck atau urutan crawl.
- Vocabulary dan kanji perlu masuk ke lesson secara bertahap agar setiap unit punya inventory recognition dan recall yang cukup untuk flashcard serta practice berikutnya.
- Jika ada grammar point yang tampak berada di perbatasan dua unit, pilih unit tempat pola itu pertama kali paling masuk akal diperkenalkan, lalu reuse di unit berikutnya melalui `unit_skill_mappings`, bukan dengan menggandakan skill.

## Alignment Notes
- Urutan ini konsisten dengan [jlpt-syllabus-structure.md](./jlpt-syllabus-structure.md) yang menempatkan `unit` sebagai grouping pedagogis utama.
- Urutan ini konsisten dengan [seed-coverage-scope.md](./seed-coverage-scope.md) yang memprioritaskan sequencing detail untuk `N5` lalu `N4`, sambil menjaga `N3/N2` tetap shell.
- Urutan ini juga sengaja menjaga contoh slug yang sudah dipakai dokumen lain tetap valid, terutama `n5-kana-basics` dan `n4-plain-form-bridge`.
