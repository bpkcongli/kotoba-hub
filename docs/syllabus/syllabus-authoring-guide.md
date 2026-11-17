# Authoring dan review syllabus N5/N4

Panduan ini melengkapi tooling `BIL-04` untuk mengisi **hanya `lesson.contentBlocks` dan `lesson.postStudyQuestions`** pada lesson yang sudah ada. Konten baru ditulis dalam Inggris dan Indonesia, dengan contoh/prompt/kunci Jepang canonical yang sama. [Kontrak bilingual](bilingual-content-contract.md), [schema v2](schema/track-seed.v2.schema.json) dan [source plan](source-of-truth-and-ingestion-plan.md) tetap menjadi baseline.

Tooling ini tidak menyelesaikan `BIL-02`, mengaktifkan importer v2, atau menyatakan seluruh N5/N4 telah selesai. Batch awal masih **HELD** sesuai [laporan konversi](bilingual-batch-01-conversion.md); `BIL-03` tetap menjadi dependency cutover. Seluruh draft baru tetap unpublished sampai integrasi yang sesuai kontrak.

## Pembagian tanggung jawab

| Agent | Skill | Hasil |
| --- | --- | --- |
| [syllabus-maker](../../.codex/agents/syllabus-maker.toml) | [content-block-maker](../../.agents/skills/kotoba-syllabus-content-block-maker/SKILL.md), [post-study-question-maker](../../.agents/skills/kotoba-syllabus-post-study-question-maker/SKILL.md), [anti-slop-copy](../../.agents/skills/kotoba-anti-slop-copy/SKILL.md) | Draft bilingual, cakupan objective, sumber, hasil validasi, blocker |
| [syllabus-reviewer](../../.codex/agents/syllabus-reviewer.toml) | Kedua skill maker, [content-review](../../.agents/skills/kotoba-syllabus-content-review/SKILL.md), anti-slop-copy | Temuan berbukti dan verdict; tidak mengedit draft |
| Agent utama | Menentukan scope, ownership file, baseline dan integrasi | Meneruskan temuan ke maker, memeriksa diff, menjaga kontrak dan gate publikasi/import |

Prinsip didactic reduction, assessment design dan content editing diadaptasi dari Scibly; [atribusi dan batas adaptasinya](syllabus-authoring-skill-sources.md) dicatat terpisah. Tidak ada instalasi skill eksternal atau pemilihan model tambahan. Konfigurasi mengikuti agent proyek yang lain. Bila role baru belum muncul pada sesi Codex aktif, mulai sesi baru dari repository ini. Reviewer mengikuti instruksi tidak mengedit; izin sandbox tetap diwarisi dari sesi parent, bukan dibuat oleh TOML agent.

## Input penugasan dan lokasi output

Agent utama membaca `docs/task-breakdown.md` dan referensi task terlebih dahulu, lalu memberikan:

- Task ID, track/unit/lesson UUID dan slug, path katalog baseline beserta checksum/commit, serta judul dan objective yang sudah ada.
- Skill canonical lesson tersebut, prerequisites, support flags, sumber Bunpro yang relevan, dan section Tae Kim jika sudah dipetakan.
- Mode pekerjaan: **melengkapi konten baru**, **lokalisasi owner lama**, atau **kurasi canonical yang dinyatakan eksplisit**. Batas default hanya dua array; identitas, judul, objective, struktur dan skills tidak berubah.
- Path output yang dimiliki maker dan apakah targetnya snippet parsial atau bank lengkap. Daftar owner/field yang boleh diedit harus jelas saat memakai overlay lama.

Judul saja tidak cukup untuk menentukan atribusi skill. Jika penugasan belum menyebut ID/path, maker dapat menelusuri katalog untuk mengusulkan scope konkret kepada agent utama, tetapi tidak menulis ulang satu track berdasarkan tebakan. Selesaikan bagian yang independen sambil melaporkan dependency yang belum jelas.

Ada dua jalur yang berbeda:

1. **Lesson baru di luar frozen batch:** tulis satu fragment JSON per lesson di path yang ditugaskan, misalnya `content/syllabus/v2/drafts/<track-slug>/<lesson-slug>.json`. Root fragment hanya berisi `contentBlocks` dan `postStudyQuestions`; ini bahan review, bukan seed track atau format input importer. Identitas target dan bukti sumber disertakan dalam handoff. Katalog v1/v2 yang ditugaskan dibaca sebagai konteks; tidak ditulis langsung. Agent utama menangani integrasi ke authoring/seed yang sesuai setelah tooling importer tersedia.
2. **BIL-02 batch-01:** hanya owner yang sudah ada pada `content/syllabus/v2/authoring/batch-01.json` boleh diedit sesuai scope eksplisit. Overlay ini memiliki struktur berbeda dari fragment: teks berada di `owners.<UUID>.localizations`. Jangan memasukkan block/soal baru ke overlay, menambah allowlist, mengganti checksum baseline, atau mengedit `v2/tracks/` hasil kompilasi. Compiler batch-01 bukan generator N4 atau generator semua lesson.

`content/syllabus/v1/manifest.json` tetap jalur aktif. Jangan mengubah manifest, flag publikasi katalog/overlay existing, lesson title, skills, prerequisites atau support flags sebagai efek samping authoring. Semua owner dan localization dalam **fragment kandidat terisolasi** memakai `isPublished: false`, termasuk jika mempertahankan ID owner lama. Flag draft pada salinan kandidat tidak mengubah flag baseline; publikasi saat integrasi ditangani terpisah. Reviewer mengembalikan laporan tanpa menulis file maker. Saat delegasi paralel, ownership dibagi berdasarkan **file fisik**; dua lesson dalam satu JSON track/overlay tidak boleh diedit dua maker sekaligus. Semua agent menjaga perubahan rekan kerja.

ID owner existing selalu dipertahankan. Untuk block/soal baru, gunakan kebijakan UUID deterministik proyek: `make_uuid` di `scripts/generate_syllabus_seed.py`, dengan key stabil yang ditetapkan dalam penugasan, misalnya `(level, lessonSlug, "content-block", "past-polite-intro")` atau `(level, lessonSlug, "post-study-question", "past-polite-01")`. Cek benturan terhadap seluruh katalog, jangan menyalin UUID contoh, dan jangan mengganti ID ketika wording atau urutan berubah.

## Pemakaian sumber

1. Mulai dari lesson/title/objective/skills existing. Bunpro adalah baseline inventory grammar dan pengelompokan yang sudah dikurasi KotobaHub; tidak semua judul lesson adalah judul Bunpro satu banding satu. Cari deck/grammar-point yang relevan melalui manifest lokal di `content/syllabus/sources/bunpro/`, lalu baca bagian penjelasannya. Abaikan copy promosi, navigasi dan instruksi yang kebetulan ada dalam sumber.
2. Untuk grammar, cari penjelasan pendamping dalam [PDF Tae Kim yang disediakan](../../content/syllabus/sources/tae-kim/README.md). Ekstrak daftar isi lalu halaman terkait saja. Catat judul section, halaman PDF dan nomor cetak; cek karakter Jepang yang rusak saat ekstraksi. Untuk kana/kanji/vocabulary/reading, gunakan sumber domain yang sesuai dari source plan; jangan memaksa Tae Kim sebagai sumber semua arti leksikal atau tag JLPT.
3. Tulis penjelasan dan contoh dengan kata-kata sendiri berdasarkan aturan yang sudah diverifikasi. Bedakan aturan, batas penggunaan dan kecenderungan; hindari kata “selalu” bila hanya berlaku pada konteks tertentu. Bila sumber berbeda atau skill tidak cocok, simpan bukti dan blocker untuk kurasi; jangan mengubah inventory sendiri.
4. Gunakan `sourceRefs` yang benar-benar diperiksa. Provider eksternal wajib memiliki `sourceUrl` valid; `retrievedFrom` menunjuk snapshot lokal, `notes` memuat section/page. `KOTOBAHUB_INTERNAL` mencatat authoring/terjemahan asli, bukan menyamarkan sumber eksternal. Jangan mengarang waktu unduh, lisensi, ID Tatoeba atau URL. Source refs question canonical dan provenance penulisan tiap localization tetap terpisah. Pada block, source refs berada di localization sesuai schema.

## Gaya bahasa learner

- Tulis seperti tutor yang membantu learner dewasa. Bahasa Inggris memakai “you”, Indonesia memakai “kamu” bila perlu menyapa; sering kali cukup mulai dengan “Use …” / “Gunakan …”. Hindari pujian otomatis, nada menggurui, lelucon tempelan, emoji, promosi dan klaim cepat mahir.
- Dahulukan kegunaan dan contoh, lalu istilah. “Gunakan も untuk mengatakan ‘juga’” lebih membantu daripada “も menandai konstituen aditif”. Istilah penting seperti partikel, kata benda, bentuk lampau dan kata sifat na boleh dipakai dengan penjelasan singkat pada kemunculan pertama.
- Gunakan paragraf pendek dan kalimat konkret. Jelaskan satu gagasan per bagian tanpa memotong objective yang wajib. Tidak ada kuota jumlah block atau kata yang seragam untuk semua lesson.
- Pilih contoh sehari-hari yang alami, register konsisten dan vocabulary yang sudah dikenal. N4 boleh mengandalkan prerequisite N5, tetapi tidak memakai grammar N3/N2 sebagai kesulitan buatan. Jangan menambah furigana/romanization atau tag HTML baru di luar kontrak renderer.
- Pertahankan makna, tense, negasi, register dan batas aturan dalam kedua bahasa. Susunan kalimat boleh berbeda. Terjemahan tidak menambahkan aturan atau petunjuk yang hanya tersedia bagi satu locale.
- Hint membantu memilih langkah, tidak mengeja kunci. Explanation sesudah jawaban menyebut alasan yang relevan dengan kalimat, bukan sekadar “Correct!” / “Benar!”. Placeholder netral. `null` atau `[]` boleh dipakai jika field tersebut memang tidak diperlukan.

Contoh gaya, bukan materi untuk langsung diimpor:

| Hindari | Gunakan |
| --- | --- |
| “The nominal predicate undergoes copular past inflection.” | “Use でした after a noun to say what something was.” |
| “Pelajari konsep luar biasa ini untuk meningkatkan penguasaanmu.” | “Gunakan でした setelah kata benda untuk menceritakan keadaan di masa lalu.” |
| “Ini mudah, cukup hafalkan semuanya.” | “Perhatikan kata waktunya, lalu pilih bentuk yang sesuai.” |

## Format dan revisi

| Field | Canonical | `localizations.en` dan `.id` |
| --- | --- | --- |
| `PARAGRAPH` | `content: {}` | `title` nullable, `body` HTML |
| `EXAMPLE_SENTENCE` | `content.japaneseSentence` HTML | `translation` HTML; jangan pakai `englishTranslation` |
| `GRAMMAR_STRUCTURE` | `content.skillCode` untuk grammar skill di lesson yang sama | `ALL`, `STANDARD`, `POLITE`: semua key hadir, null jika tidak berlaku, minimal satu berisi |
| `postStudyQuestions[]` | Skill, difficulty, prompt Jepang, kunci, input method, source refs | `placeholder`, `hintTexts`, `explanation` beserta metadata |

Setiap owner memiliki UUID, sortOrder positif unik dalam array, `contentRevision` positif dan flag publikasi. Kedua localization memiliki `sourceRevision`, `translationRevision`, flag publikasi dan `sourceRefs` nonkosong. `sourceRevision` cocok dengan contentRevision yang benar-benar direview, bukan otomatis ditimpa supaya lolos validator.

Owner baru mulai pada revisi 1. Untuk existing, perubahan canonical/Jepang/kunci/atribusi atau Inggris yang memengaruhi pemahaman menaikkan contentRevision; perubahan teks/provenance localization menaikkan translationRevision locale terkait. Bahasa Indonesia harus direview ulang terhadap sumber baru sebelum sourceRevision disamakan. Perubahan presentasi HTML tetap menaikkan translationRevision. Revisi tidak mundur dan tidak di-reset menjadi 1 saat regenerasi.

Untuk draft ini gunakan subset HTML yang sudah diperiksa compiler batch: `p`, `div`, `span`, `strong`, `br`; atribut hanya `class` bernilai `text-emphasis`, `text-warning`, `question-blank`, `question-dialogue`, `question-scenario`, atau `question-continuation`. Tidak ada script, style, event handler, komentar atau Markdown dalam string HTML. Validator draft memeriksa subset ini; sanitasi renderer/importer tetap tanggung jawab implementasi runtime.

Bank lengkap harus memiliki tepat **10 soal**, masing-masing difficulty **1–10** satu kali, semuanya `SHORT_FREE_RESPONSE` dengan satu `___`. Plain dan HTML merepresentasikan kalimat/blank yang sama. Tingkat kesulitan dinilai dalam lesson tersebut, bukan disamakan dengan sepuluh level JLPT atau kategori Bloom. Buat rencana cakupan skill dan alasan kenaikan difficulty; jangan sekadar mengganti nama orang dalam sepuluh template identik.

Kunci tidak diterjemahkan. Minimal satu alternatif kana per soal; varian kanji Jepang dan `、` yang sudah terkurasi dipertahankan. Evaluasi literal setelah NFKC/trim tidak menghapus tanda baca. Pada konversi/lokalisasi, jangan membuang atau menambah alternatif, menormalisasi ulang, atau memperbaiki prompt Jepang diam-diam. Pada soal baru, pastikan konteks/register membatasi jawaban secara wajar tanpa mengandalkan hint opsional; laporkan ambiguitas yang tidak bisa diselesaikan dalam scope.

## Validasi

Untuk fragment baru, gunakan [validator draft](../../scripts/validate_syllabus_authoring.py) dari root repository dengan Python yang menyediakan `jsonschema`. Contoh format yang disertakan memakai skill existing `n5_copula_past_polite` pada lesson `copula-negative-and-past-reference` sebagai konteks, tetapi bukan pengganti isi lesson tersebut:

```sh
python3 scripts/validate_syllabus_authoring.py \
  docs/syllabus/examples/lesson-content-authoring.v2.example.json \
  --track content/syllabus/v1/tracks/jlpt-n5-foundation.json \
  --lesson 86e7168a-ef45-5550-a44e-18574971067a
```

Ganti path fragment, track dan lesson UUID dengan scope sebenarnya. Tambahkan `--require-complete-bank` untuk hasil yang diklaim lengkap. **Contoh parsial satu soal di bawah sengaja gagal pada gate bank lengkap.** Bank lengkap tetap unpublished; flag tersebut memeriksa kelengkapan, bukan mengizinkan publikasi.

Validator memeriksa fragment terhadap `$defs` schema v2, dua locale, revisi current, flag draft, ID/sortOrder unik dalam fragment, skill owner dan tipe grammar, subset HTML, kesetaraan plain/HTML, serta ladder unik. Gate lengkap juga memerlukan block nonkosong, tepat level 1–10 dan skill question published. Validator tidak memeriksa benturan UUID lintas katalog, diff identitas/revisi terhadap baseline, akurasi Jepang, isi sumber, hint leakage, kewajaran difficulty atau cakupan pedagogi. Reviewer dan agent utama memeriksa hal-hal itu terhadap baseline dan handoff. Ini bukan validator seed track/importer.

Untuk perubahan **overlay batch-01** saja, jalankan:

```sh
python3 scripts/convert_bilingual_batch.py --check
python3 scripts/test_bilingual_batch.py
python3 scripts/validate_bilingual_contracts.py
```

Jika overlay memang diubah dan hasil kompilasi perlu diperbarui, agent utama menjalankan compiler tanpa `--check` sesuai workflow batch, lalu mengulang checks. `--check --require-publishable` tetap harus gagal selama batch HELD. Checks batch/schema examples tersebut tidak membuktikan draft N4 telah tervalidasi dan tidak menggantikan review isi.

## Handoff dan rubric review

Maker menyerahkan task/scope dan baseline, path fragment atau daftar owner overlay, ringkasan objective → block → soal/skill, sumber yang dipakai beserta section/page, alasan difficulty 1–10, checks beserta hasil aktual, serta bagian yang belum lengkap/blocker. Metadata handoff berada di laporan ke agent utama atau path laporan yang ditugaskan, bukan field tambahan pada fragment.

Reviewer memeriksa candidate dan baseline secara independen, membaca sumber yang relevan, membaca tiap locale sendiri, lalu membandingkan kesetaraan. Selesaikan soal tanpa membaca kunci/hint lebih dulu. Bedakan cacat baseline dari regresi maker. Rubric:

| Aspek | Syarat review |
| --- | --- |
| Scope/format | Hanya field ditugaskan; schema v2, identitas, HTML, revisi dan flag benar |
| Sumber/Jepang | Aturan, contoh, jawaban dan register akurat; section/page dapat dilacak |
| Pedagogi | Objective tercakup, beban sesuai prerequisite, penjelasan bisa dipakai learner |
| Bilingual/gaya | Makna dan bantuan setara; kalimat ramah, konkret dan istilah dijelaskan |
| Assessment | Skill owner tepat, jawaban deterministik, hint tidak bocor, bank lengkap dan progression masuk akal |

Severity: **P1** menghalangi integrasi, misalnya aturan/kunci salah, skill owner tidak cocok, locale wajib hilang atau bank yang diklaim lengkap ternyata parsial. **P2** adalah masalah kejelasan, terjemahan atau kualitas assessment yang perlu diperbaiki. Saran selera yang tidak berdampak pada learner dipisahkan sebagai opsional; jangan membuat blocker dari preferensi pribadi.

Format laporan:

```text
Verdict: NEEDS_CHANGES | READY_FOR_INTEGRATION | REVIEW_INCOMPLETE
Scope: track/unit/lesson IDs, exact files/owners, baseline, partial/full bank
Findings:
- [P1/P2] file + JSON path/line — masalah, dampak learner, bukti sumber, usulan perbaikan
Coverage: objective/skill dan difficulty yang diperiksa; bagian yang belum diverifikasi
Sources: Bunpro snapshot/section, Tae Kim section + halaman
Checks: perintah, hasil aktual, batas pemeriksaan
Baseline issues / unresolved questions: terpisah dari regresi
```

`NEEDS_CHANGES` jika ada temuan wajib diperbaiki. `REVIEW_INCOMPLETE` jika bukti/scope belum cukup untuk mengambil keputusan. `READY_FOR_INTEGRATION` hanya untuk scope yang selesai diperiksa dan tanpa temuan wajib; verdict pada snippet harus secara eksplisit terbatas pada snippet. Verdict tidak menghapus hold BIL-02 atau menjalankan import. Maker memperbaiki temuan dalam scope yang sama, reviewer memeriksa ulang bagian terdampak, lalu agent utama memutuskan integrasi sesuai dependency task.

## Snippet JSON

[File contoh lengkap](examples/lesson-content-authoring.v2.example.json) memuat ketiga tipe content block dan satu soal. UUID di file tersebut khusus demonstrasi, semua flag false, dan seluruh object harus dipahami sebagai fragment **parsial**; belum mencakup semua objective atau sepuluh soal lesson. Kunci `でした` melatih skill yang benar-benar ada, dengan kalimat asal afirmatif dan perintah mengubahnya ke bentuk lampau sopan di prompt Jepang.

Snippet berikut menunjukkan `EXAMPLE_SENTENCE` dan soal; `PARAGRAPH` serta `GRAMMAR_STRUCTURE` tersedia di file JSON yang sama. Jangan menambahkan komentar, elipsis atau field laporan ke JSON authoring.

### lesson.contentBlocks — contoh satu block

```json
{
  "contentBlocks": [
    {
      "id": "4f330135-1116-5086-af98-1686983d7bf7",
      "blockType": "EXAMPLE_SENTENCE",
      "content": {
        "japaneseSentence": "<p>きのうはやすみでした。</p>"
      },
      "sortOrder": 3,
      "isPublished": false,
      "contentRevision": 1,
      "localizations": {
        "en": {
          "sourceRevision": 1,
          "translationRevision": 1,
          "isPublished": false,
          "sourceRefs": [
            {
              "provider": "BUNPRO",
              "category": "GRAMMAR_POINT",
              "externalId": "だった-でした",
              "sourceUrl": "https://bunpro.jp/grammar_points/だった-でした",
              "retrievedFrom": "content/syllabus/sources/bunpro/raw/2026-05-16/grammar_points/n5/047-%E3%81%A0%E3%81%A3%E3%81%9F-%E3%81%A7%E3%81%97%E3%81%9F.html",
              "notes": "Structure/About/Caution checked in the local snapshot; examples below are newly authored."
            },
            {
              "provider": "TAE_KIM",
              "category": "GRAMMAR_GUIDE",
              "externalId": "2012-11-21/4.1.4",
              "sourceUrl": "https://guidetojapanese.org/learn/grammar/polite",
              "retrievedFrom": "content/syllabus/sources/tae-kim/Tae Kim Japanese Grammar Guide.pdf",
              "notes": "Section 4.1.4, PDF/printed pages 88-89; reference for polite noun past and i-adjective contrast."
            },
            {
              "provider": "KOTOBAHUB_INTERNAL",
              "category": "AUTHORING_EXAMPLE",
              "externalId": "copula-past-polite-example/en",
              "notes": "Original illustrative wording; not a completed lesson or published seed."
            }
          ],
          "translation": "<p>Yesterday was a day off.</p>"
        },
        "id": {
          "sourceRevision": 1,
          "translationRevision": 1,
          "isPublished": false,
          "sourceRefs": [
            {
              "provider": "BUNPRO",
              "category": "GRAMMAR_POINT",
              "externalId": "だった-でした",
              "sourceUrl": "https://bunpro.jp/grammar_points/だった-でした",
              "retrievedFrom": "content/syllabus/sources/bunpro/raw/2026-05-16/grammar_points/n5/047-%E3%81%A0%E3%81%A3%E3%81%9F-%E3%81%A7%E3%81%97%E3%81%9F.html",
              "notes": "Structure/About/Caution checked in the local snapshot; examples below are newly authored."
            },
            {
              "provider": "TAE_KIM",
              "category": "GRAMMAR_GUIDE",
              "externalId": "2012-11-21/4.1.4",
              "sourceUrl": "https://guidetojapanese.org/learn/grammar/polite",
              "retrievedFrom": "content/syllabus/sources/tae-kim/Tae Kim Japanese Grammar Guide.pdf",
              "notes": "Section 4.1.4, PDF/printed pages 88-89; reference for polite noun past and i-adjective contrast."
            },
            {
              "provider": "KOTOBAHUB_INTERNAL",
              "category": "AUTHORING_EXAMPLE",
              "externalId": "copula-past-polite-example/id",
              "notes": "Original illustrative wording; not a completed lesson or published seed."
            }
          ],
          "translation": "<p>Kemarin hari libur.</p>"
        }
      }
    }
  ]
}
```

### lesson.postStudyQuestions — contoh satu soal

```json
{
  "postStudyQuestions": [
    {
      "id": "bb089e0d-dee5-5dc1-95ab-c6c378d7d61c",
      "skillCode": "n5_copula_past_polite",
      "difficultyLevel": 1,
      "questionType": "SHORT_FREE_RESPONSE",
      "promptPayload": {
        "schemaVersion": 1,
        "sentenceTemplate": "「あめです」をかこのていねいなかたちに：あめ___。",
        "sentenceTemplateHtml": "<p>「あめです」をかこのていねいなかたちに：あめ<span class=\"question-blank\">___</span>。</p>",
        "promptLanguage": "JA",
        "answerLanguage": "JA",
        "slotCount": 1,
        "blankInputMode": "ROMAJI_TO_KANA",
        "inputMethod": {
          "acceptsRomaji": true,
          "transformsTo": "KANA"
        }
      },
      "expectedAnswer": {
        "acceptedTextAnswers": [
          "でした"
        ],
        "normalizationProfile": "kana-strict-v1"
      },
      "sortOrder": 1,
      "isPublished": false,
      "sourceRefs": [
        {
          "provider": "BUNPRO",
          "category": "GRAMMAR_POINT",
          "externalId": "だった-でした",
          "sourceUrl": "https://bunpro.jp/grammar_points/だった-でした",
          "retrievedFrom": "content/syllabus/sources/bunpro/raw/2026-05-16/grammar_points/n5/047-%E3%81%A0%E3%81%A3%E3%81%9F-%E3%81%A7%E3%81%97%E3%81%9F.html",
          "notes": "Structure/About/Caution checked in the local snapshot; examples below are newly authored."
        },
        {
          "provider": "TAE_KIM",
          "category": "GRAMMAR_GUIDE",
          "externalId": "2012-11-21/4.1.4",
          "sourceUrl": "https://guidetojapanese.org/learn/grammar/polite",
          "retrievedFrom": "content/syllabus/sources/tae-kim/Tae Kim Japanese Grammar Guide.pdf",
          "notes": "Section 4.1.4, PDF/printed pages 88-89; reference for polite noun past and i-adjective contrast."
        },
        {
          "provider": "KOTOBAHUB_INTERNAL",
          "category": "QUESTION_AUTHORING",
          "externalId": "copula-past-polite-example/question-1",
          "notes": "Original single-blank example; explicitly transforms the given affirmative sentence into the polite past."
        }
      ],
      "contentRevision": 1,
      "localizations": {
        "en": {
          "sourceRevision": 1,
          "translationRevision": 1,
          "isPublished": false,
          "sourceRefs": [
            {
              "provider": "BUNPRO",
              "category": "GRAMMAR_POINT",
              "externalId": "だった-でした",
              "sourceUrl": "https://bunpro.jp/grammar_points/だった-でした",
              "retrievedFrom": "content/syllabus/sources/bunpro/raw/2026-05-16/grammar_points/n5/047-%E3%81%A0%E3%81%A3%E3%81%9F-%E3%81%A7%E3%81%97%E3%81%9F.html",
              "notes": "Structure/About/Caution checked in the local snapshot; examples below are newly authored."
            },
            {
              "provider": "TAE_KIM",
              "category": "GRAMMAR_GUIDE",
              "externalId": "2012-11-21/4.1.4",
              "sourceUrl": "https://guidetojapanese.org/learn/grammar/polite",
              "retrievedFrom": "content/syllabus/sources/tae-kim/Tae Kim Japanese Grammar Guide.pdf",
              "notes": "Section 4.1.4, PDF/printed pages 88-89; reference for polite noun past and i-adjective contrast."
            },
            {
              "provider": "KOTOBAHUB_INTERNAL",
              "category": "AUTHORING_EXAMPLE",
              "externalId": "copula-past-polite-example/en",
              "notes": "Original illustrative wording; not a completed lesson or published seed."
            }
          ],
          "placeholder": "Type the missing ending",
          "hintTexts": [
            "<p>Change the given sentence to the polite past. Keep the same meaning.</p>"
          ],
          "explanation": "<p>あめです means it is rainy. Change <strong>です</strong> to <strong>でした</strong> after the noun あめ to talk about the past: あめでした means it was rainy.</p>"
        },
        "id": {
          "sourceRevision": 1,
          "translationRevision": 1,
          "isPublished": false,
          "sourceRefs": [
            {
              "provider": "BUNPRO",
              "category": "GRAMMAR_POINT",
              "externalId": "だった-でした",
              "sourceUrl": "https://bunpro.jp/grammar_points/だった-でした",
              "retrievedFrom": "content/syllabus/sources/bunpro/raw/2026-05-16/grammar_points/n5/047-%E3%81%A0%E3%81%A3%E3%81%9F-%E3%81%A7%E3%81%97%E3%81%9F.html",
              "notes": "Structure/About/Caution checked in the local snapshot; examples below are newly authored."
            },
            {
              "provider": "TAE_KIM",
              "category": "GRAMMAR_GUIDE",
              "externalId": "2012-11-21/4.1.4",
              "sourceUrl": "https://guidetojapanese.org/learn/grammar/polite",
              "retrievedFrom": "content/syllabus/sources/tae-kim/Tae Kim Japanese Grammar Guide.pdf",
              "notes": "Section 4.1.4, PDF/printed pages 88-89; reference for polite noun past and i-adjective contrast."
            },
            {
              "provider": "KOTOBAHUB_INTERNAL",
              "category": "AUTHORING_EXAMPLE",
              "externalId": "copula-past-polite-example/id",
              "notes": "Original illustrative wording; not a completed lesson or published seed."
            }
          ],
          "placeholder": "Ketik akhiran yang belum ada",
          "hintTexts": [
            "<p>Ubah kalimat yang diberikan ke bentuk lampau yang sopan. Pertahankan maknanya.</p>"
          ],
          "explanation": "<p>あめです berarti saat ini hujan. Ubah <strong>です</strong> menjadi <strong>でした</strong> setelah kata benda あめ untuk menceritakan masa lalu: あめでした berarti saat itu hujan.</p>"
        }
      }
    }
  ]
}
```
