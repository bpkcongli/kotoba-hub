# Kurasi dan authoring vocabulary flashcard

Panduan `VOC-01` menyiapkan kurasi, authoring Inggris/Indonesia, dan review vocabulary system deck. Preferensi produk adalah **satu skill vocabulary mandiri dapat menaungi beberapa item tanpa memerlukan lesson atau tampil sebagai lesson di UI**. Tooling ini menyiapkan kandidat untuk model tersebut; schema/runtime `VOC-02` memakai manifest integrasi terpisah.

## Runtime VOC-02

Jalur skill mandiri dan promosi eksplisit ditetapkan pada
[kontrak vocabulary mandiri](standalone-vocabulary-contract.md). Tabel berikut
mencatat baseline VOC-01; draft curator/maker tetap bukan input importer. Integrasi
VOC-03 mengompilasi draft reviewed ke manifest v2 dan mempertahankan identitas pending.
Koreksi entry yang berbeda mengikuti jalur retirement/identitas baru yang direview,
seperti [resolusi hold](vocabulary-held-identity-resolution.md); jangan mengganti
makna pada ID lama atau memindahkan histori.

Batch pertama VOC-03 tersedia pada [laporan integrasi](vocabulary-batch-01-implementation.md):
enam item dikurasi dan di-author bilingual, lima diterima pada manifest runtime,
dan satu ditahan karena collision opsi global. Draft tetap unpublished; manifest
reviewed terpisah berada di `content/flashcards/vocabulary-groups/manifest.v2.json`.

Batch kedua mencakup seluruh 581 ID yang belum dipromosikan. Review independen
raw source/file menerima 574 paket bilingual dan 146 kelompok; hasilnya sudah
dikompilasi ke manifest runtime. Tujuh hold identitas/entry/sense sumber tetap
pending pada akhir batch kedua. Batch ketiga meresolusi ketujuhnya: tiga
makna memakai item lesson existing, empat memakai identitas baru yang benar,
dan tujuh ID salah tetap tersimpan inactive. Runtime kini 151 kelompok/583 anggota
mandiri dengan revisi 4/4 dan nol eligible pending. Lihat [resolusi hold](vocabulary-held-identity-resolution.md), [laporan integrasi
batch kedua](vocabulary-batch-02-implementation.md) dan [draft/arsip review](vocabulary-batch-02-draft.md).

## Batas antara kandidat dan runtime

| Area                        | Kondisi saat ini                                                                                 | Perlakuan authoring                                                                                            |
| --------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Skill tanpa lesson          | `skills.lesson_id` wajib, seed skill berada dalam lesson                                         | Buat kelompok kandidat dengan `ownerType: FLASHCARD_VOCABULARY_GROUP`, `lessonSlug: null`, dan `skillId: null` |
| Lesson unpublished          | Skill di bawahnya tidak masuk katalog published flashcards/progress                              | Boleh menjadi konteks usulan; tidak memberi attribution runtime                                                |
| Banyak vocabulary per skill | Relasi item ke skill memungkinkan, tetapi konten/generator vocabulary masih satu lemma per skill | Daftar anggota kelompok disimpan terpisah dari konten lexical setiap item                                      |
| Pending                     | Kartu dapat dipelajari, state Leitner diperbarui, `progressImpact: null`                         | Pertahankan status runtime pending sampai jalur kelompok mandiri tersedia                                      |
| Bilingual                   | Paket lengkap dan current dipilih per turn, dengan fallback ke Inggris                           | Authoring melengkapi kedua bahasa; adanya fallback bukan bukti kualitas terjemahan                             |

Keputusan ini tidak mengubah [kontrak seed existing](vocabulary-flashcard-seeder-schema.md), [mapping deck](flashcard-deck-mapping.md), atau [runtime BIL-05](../bilingual/bilingual-flashcards-implementation.md). Tidak membuat lesson dummy untuk melewati gate publikasi. Skill kelompok kandidat juga belum menjadi row `skills` atau bukti official mastery.

Rujukan implementasi: [schema skills](../../../src/backend/syllabus/infrastructure/database/schema.ts), [katalog published](../../../src/backend/syllabus/interface/secondary/persistence/drizzle-syllabus-catalog.repository.ts), [facade flashcards](../../../src/backend/flashcards/interface/secondary/syllabus/flashcard-catalog.adapter.ts), [attribution progress](../../../src/backend/progress/application/ports/progress-catalog.port.ts), [schema progress](../../../src/backend/progress/infrastructure/database/schema.ts), dan [importer flashcard](../../../src/backend/flashcards/interface/secondary/seed/drizzle-flashcard-importer.ts). Pada baseline VOC-01, skills dan event progress mewajibkan lesson/unit. VOC-02 menyelaraskan keduanya melalui owner kelompok dan attribution track dengan lesson/unit null.

## Peran dan ownership

| Subagent                                                             | AI-skill                                                                                                                                                                           | Output                                                                                  |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [vocabulary-curator](../../../.codex/agents/vocabulary-curator.toml) | [source-curation](../../../.agents/skills/kotoba-vocabulary-source-curation/SKILL.md), [curriculum-mapping](../../../.agents/skills/kotoba-vocabulary-curriculum-mapping/SKILL.md) | `curation.json`: bukti lexical, kelompok, anggota, dan kandidat yang ditahan            |
| [flashcard-maker](../../../.codex/agents/flashcard-maker.toml)       | [bilingual-authoring](../../../.agents/skills/kotoba-flashcard-bilingual-authoring/SKILL.md), [anti-slop-copy](../../../.agents/skills/kotoba-anti-slop-copy/SKILL.md)             | `content.json`: paket bilingual dari curation yang ditugaskan                           |
| [flashcard-reviewer](../../../.codex/agents/flashcard-reviewer.toml) | [content-review](../../../.agents/skills/kotoba-flashcard-content-review/SKILL.md)                                                                                                 | Laporan read-only dengan bukti dan verdict                                              |
| Agent utama                                                          | Menetapkan scope, baseline, dan integrasi                                                                                                                                          | Menyimpan laporan reviewer, meneruskan perbaikan, memeriksa diff dan dependency runtime |

Satu writer per file fisik. Maker tidak mengubah hasil curator; usulan koreksi dikembalikan melalui agent utama. Reviewer tidak mengedit hasil keduanya. Authoring tidak mengubah artifact aktif, manifest syllabus, migration, flag publikasi existing, atau database sebagai efek samping. Integrasi konten aktif harus menjadi scope eksplisit penugasan dan mengikuti kontrak target.

Konfigurasi mengikuti pola subagent proyek existing tanpa model override. Jika role baru belum terdaftar di sesi aktif, buka sesi baru dari repository. Role reviewer read-only adalah instruksi kerja; TOML tersebut tidak memberikan sandbox terpisah.

Contoh penugasan berurutan melalui agent utama:

```text
Gunakan vocabulary-curator untuk batch <batch-id> dan daftar itemId yang ditugaskan.
Tulis content/flashcards/drafts/<batch-id>/curation.json dengan baseline/source hash.
Setelah handoff, gunakan flashcard-maker untuk menulis content.json dari curation itu.
Gunakan flashcard-reviewer untuk memeriksa kedua artifact dan raw source secara read-only.
Simpan laporan reviewer sebagai review.md beserta scope dan checksum artifact yang diperiksa.
```

## Input penugasan

Agent utama memberikan task ID, batch ID, daftar `itemId`/`ent_seq`, path baseline dan SHA-256, output yang dimiliki setiap writer, serta mode `CURATION`, `AUTHORING`, atau `REVIEW`. Tentukan apakah target sebuah subset atau seluruh batch. Jika scope belum lengkap, agent menelusuri sumber untuk mengusulkan scope konkret sambil menjaga artifact aktif.

Lokasi draft yang disarankan:

```text
content/flashcards/drafts/<batch-id>/curation.json
content/flashcards/drafts/<batch-id>/content.json
content/flashcards/drafts/<batch-id>/review.md
```

Folder draft tidak dibaca importer. Jangan mengirim draft ke `db:seed:flashcards`, dan jangan menjalankan generator vocabulary sebagai validator: generator existing menulis ulang artifact v1.

## Sumber dan pemilihan makna

- Lexical primer: `content/syllabus/sources/jmdict/raw/2026-05-16/JMdict_e.gz`. Periksa entry XML yang sebenarnya, bukan hanya gloss/reading yang sudah diratakan generator.
- Sinyal JLPT: `original_data/n5.csv` dalam `content/syllabus/sources/yomitan-jlpt-vocab/raw/2026-05-16/source-main.zip`. Sinyal ini heuristic; JMdict tidak menetapkan JLPT. N4 memakai bukti overlay N4 jika memang ditugaskan, bukan menyalin label N5.
- Baseline identitas: `content/flashcards/system-decks/vocabulary-foundation.json` dan registry `vocabulary-foundation-pending-n5-skill-codes.json`. Periksa juga item mapped agar kata yang sama tidak digandakan karena usulan owner baru.
- Terjemahan Indonesia ditulis secara editorial sesuai makna terpilih; jangan mengklaim berasal dari snapshot JMdict Inggris. Contoh tambahan harus menyebut sumber yang benar-benar diperiksa atau ditandai sebagai kalimat original yang memerlukan review.
- [Source plan](../ingestion/source-of-truth-and-ingestion-plan.md) dan README/checksum/lisensi source tetap berlaku. Pertahankan provenance pada output dan integrasi.

Setiap bukti lexical mencatat `ent_seq`, snapshot path/checksum, ordinal sense berbasis satu, gloss yang dipilih, POS, serta restriction `stagk`, `stagr`, `re_restr` dan catatan register bila ada. Ordinal sense hanya berlaku untuk snapshot tersebut; itu bukan ID sense global. Catat pewarisan POS antarsense bila perlu. Variasi spelling atau reading dari satu entry tidak otomatis saling menggantikan pada semua makna.

Jika source tidak tersedia atau makna belum terpecahkan, simpan kandidat sebagai held dengan alasannya. Jangan mengisi bukti dari ingatan atau membuat sumber agar batch terlihat lengkap.

## Kelompok skill mandiri

Kelompok mempunyai proposed code stabil, judul/objective Inggris dan Indonesia, target level beserta alasannya, serta daftar item anggota. Tema harus cukup sempit agar hasil review bermakna; 5–10 item dapat menjadi titik awal, bukan batas wajib. Ukuran kelompok terpisah dari segment deck runtime yang saat ini maksimal 10 vocabulary.

`proposedSkillCode` mengidentifikasi kelompok; `itemId` dan `ent_seq` mengidentifikasi vocabulary. Jangan memakai code kelompok sebagai key semua item. Kandidat yang sudah mempunyai official owner mempertahankan owner existing; perubahan owner harus disebut sebagai usulan migrasi, bukan diterapkan saat curation. Kelompok lintas konteks dapat dicatat sebagai tag tambahan, tetapi setiap item dalam satu batch memiliki satu kelompok owner kandidat yang jelas.

## Kontrak handoff draft

Format di bawah adalah **konvensi authoring, bukan schema importer**. Tidak memperkenalkan nilai enum baru pada runtime. JSON harus dapat diparse, tetapi pengecekan bahasa dan konsistensi lintas berkas tetap dilakukan terpisah.

`curation.json` memakai `draftFormat: kotoba-vocabulary-curation-v1` dan memuat:

| Field                             | Isi wajib                                                                                                                                                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `batchId`, `scope`, `isPublished` | Identitas batch, daftar item yang ditugaskan, dan root `isPublished: false`                                                                                                                                                                                                           |
| `baselines`                       | Array `{path, sha256}` untuk artifact, registry, dan source yang benar-benar digunakan                                                                                                                                                                                                |
| `groups`                          | Array `{proposedSkillCode, ownerType, trackSlug, lessonSlug, skillId, isPublished, localizations, itemIds, levelRationale}`; kedua locale memberi `title`, `objective`, dan `isPublished: false`; `ownerType` adalah `FLASHCARD_VOCABULARY_GROUP`, lesson/skill null, published false |
| `items`                           | Array `{itemId, entSeq, proposedSkillCode, surfaceFormText, kanaDisplayText, isPublished, senseEvidence, runtimeMapping}` untuk kandidat yang dapat diteruskan; `isPublished: false`                                                                                                  |
| `heldItems`                       | Array `{itemId, entSeq, reason, evidenceNeeded}`; sertakan setiap item scope yang belum dapat diteruskan                                                                                                                                                                              |

`senseEvidence` berisi `{sourcePath, sourceSha256, senseOrdinals, selectedGlossesEn, partsOfSpeech, restrictions, notes}`. `restrictions` mencatat restriction spelling/reading yang relevan, termasuk array kosong yang telah diperiksa. `runtimeMapping` menyalin status dan owner baseline yang sebenarnya: pending tetap `{mappingStatus: PENDING_LESSON_MAPPING, skillId: null, unitSlug: null, lessonSlug: null}`. Referensi kelompok tidak menggantikan field tersebut.

`content.json` memakai `draftFormat: kotoba-vocabulary-content-v1` dan memuat:

| Field                                | Isi wajib                                                                                                            |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `batchId`, `curation`, `isPublished` | Batch sama, `{path, sha256}` dari curation yang dipakai maker, dan root `isPublished: false`                         |
| `items`                              | Array `{itemId, proposedSkillCode, contentRevision, isPublished, sourceRefs, japanese, localizations, optionChecks}` |
| `heldItems`                          | Array `{itemId, reason, evidenceNeeded}` untuk item curation yang tidak selesai di-author                            |

`japanese` memuat `surfaceFormText`, `kanaDisplayText`, dan `acceptedAnswers` per `JAPANESE`/`KANA`, dibatasi makna dan restriction yang sudah diverifikasi. Perbedaan dengan canonical answers baseline dilaporkan sebagai usulan perubahan canonical, tidak ditulis ke artifact aktif. `sourceRefs` memisahkan bukti dictionary, sinyal JLPT, dan catatan authoring; jangan menisbatkan teks original ke sumber eksternal.

Setiap paket `localizations.en`/`id` memuat `sourceRevision`, `translationRevision`, `isPublished: false`, `meaning`, `aliases`, `explanationText` nullable, `examples`, dan `distractorCandidates`. Contoh berisi satu `japaneseText`, `translation`, dan provenance yang cocok di kedua locale. Pertahankan revisi existing pada salinan baseline; bila isi usulan berubah, catat revisi target sesuai BIL-05 dan perubahan yang memerlukannya. Untuk owner kandidat baru, mulai revisi positif. Flag root/group/item dan localization kandidat tetap false.

`distractorCandidates` merujuk item kandidat yang nyata beserta value dan alasan bukan jawaban sah. Boleh kosong ketika bukti belum cukup, tetapi tandai opsi tersebut tidak siap. Jangan membuat makna salah agar opsi cukup. Bentuk paket draft ini tidak sama dengan overlay aktif `localizations.v2.json`; compiler/integrator harus menerjemahkannya ke kontrak aktif yang sesuai dalam task terpisah.

## Pemeriksaan opsi dan review

Vocabulary localized saat ini mendukung `JAPANESE → MEANING`, `MEANING → JAPANESE`, dan `MEANING → KANA`. Untuk setiap item/locale, `optionChecks` mencatat ketiga pasangan: status `READY`/`HELD`, kandidat yang diperiksa, dan alasan hold. `READY` berarti opsi yang ditinjau secara editorial mempunyai satu jawaban sah dan sedikitnya satu distractor unik; bukan bukti runtime sudah menerima draft. Pasangan dengan opsi ambigu harus ditahan tanpa diam-diam dilewati.

Bandingkan arti/alias setelah normalisasi NFKC, case, dan whitespace. Periksa collision dua arah: distractor tidak boleh merupakan sinonim benar, homograf dengan prompt sama, reading yang juga sah, atau terjemahan setara. Hindari menguji batas makna yang tidak dinyatakan dalam prompt. Dua item yang diterjemahkan sama tidak menjadi distractor satu sama lain. Jangan menggabungkan bahasa dalam satu paket opsi.

Reviewer membaca baseline, raw source, curation dan content yang tepat. Selesaikan setiap pasangan dari prompt dan opsi sebelum mencocokkan kunci maker. Verifikasi meaning, spelling, reading, register, kesetaraan en/id, identitas/revisi, membership, provenance, serta cakupan assigned/held. Tidak cukup menerima source list maker atau JSON yang lolos parsing.

Laporan menyebut hash artifact yang direview, scope, sumber/entry/sense yang benar-benar diperiksa, temuan per JSON path, dampak learner, bukti, koreksi, dan pemeriksaan yang belum dilakukan. Verdict:

- `NEEDS_CHANGES`: ada kesalahan isi/identitas/kontrak yang menghalangi integrasi kandidat.
- `REVIEW_INCOMPLETE`: bukti atau artifact tidak cukup untuk menilai scope penugasan.
- `READY_FOR_INTEGRATION`: scope yang disebut lulus review editorial; tetap draft dan belum runtime-ready/published/imported. Bila ada held items, sebut verdict hanya untuk subset yang lolos.

Agent utama menyimpan laporan reviewer dan checksum-nya, lalu mengembalikan temuan ke writer yang tepat. Maker/curator tidak menandai hasil sendiri reviewed. JSON parse dapat diperiksa tanpa menulis data:

```sh
python3 -m json.tool content/flashcards/drafts/<batch-id>/curation.json > /dev/null
python3 -m json.tool content/flashcards/drafts/<batch-id>/content.json > /dev/null
```

Periksa pula semua item scope muncul tepat sekali dalam accepted/held, semua referensi group/item valid, UUID existing tidak berubah, baseline hash sesuai, dan semua flag kandidat unpublished. Parsing tidak memverifikasi butir-butir tersebut atau kualitas bahasa. Jangan mengklaim `db:seed:flashcards:dry-run` membaca draft; perintah itu hanya membaca artifact aktif dan katalog DB.

## Dependency aktivasi `VOC-02`

Jalur aktivasi ditetapkan pada [kontrak VOC-02](standalone-vocabulary-contract.md)
dan [operasi seed](../../../drizzle/README.md#vocabulary-mandiri-voc-02). Kelompok menjadi
skill resmi setelah manifest reviewed diimport; promosi flashcard harus eksplisit dengan
ID pending existing. Draft authoring tidak otomatis mengaktifkan kelompok atau progress.

Generator mapped v1 menurunkan ID dari skill code sedangkan pending dari ent_seq; jangan
menjalankan generator tersebut untuk promosi. Importer VOC-02 menjaga ID, state user+item,
custom deck dan session/answer snapshots. Event lama tidak diberi attribution retroaktif.

Kelompok memakai evidence maksimal 20 attempt per item dengan seluruh anggota sebagai
denominator, termasuk anggota yang belum dijawab. Leitner tetap terpisah per item.
Menyembunyikan lesson dengan isPublished false tetap bukan jalur aktivasi kelompok.

## Verifikasi tooling `VOC-01`

- Tiga konfigurasi TOML berhasil diparse; empat skill lulus `skill-creator/scripts/quick_validate.py`. Tautan lokal baru resolve, format skill/panduan baru diperiksa dengan Prettier, dan `git diff --check` lulus.
- Subagent read-only memverifikasi audit skill–lesson terhadap schema, facade, importer dan kalkulator mastery. Review independen konfigurasi/instruksi tidak menemukan temuan yang menghalangi penggunaan tooling. Review tersebut bukan review konten vocabulary.
- Uji terisolasi di `/tmp/kotoba-vocab-tooling-trial/` memakai tiga pending item existing: 鉛筆 (`1178590`), 紙 (`1311530`), dan 辞書 (`1318970`). Curator menghasilkan `curation.json` setelah memeriksa entry JMdict dan baris overlay yang dipin. Pemeriksaan ulang oleh agent utama mencocokkan checksum sumber/baseline, bentuk/sense, identitas, attribution pending, flag unpublished dan referensi kelompok.
- Agent utama melanjutkan authoring lokal menggunakan skill bilingual setelah subagent mencapai batas penggunaan. `content.json` sementara memuat tiga paket en/id dan 18 kombinasi item/locale/pasangan opsi. Pemeriksaan konsistensi tidak menemukan opsi duplikat atau collision dengan alias jawaban terpilih. Tidak ada seed, database atau artifact aktif yang ditulis.
- Uji berantai dengan maker dan reviewer independen belum selesai; draft konten berstatus `REVIEW_INCOMPLETE`. Pengujian ini tidak membuktikan kualitas editorial seluruh bank atau kesiapan runtime. File `/tmp` hanya bukti uji sementara, bukan seed/versioned deliverable. Review batch konten yang sebenarnya tetap pekerjaan `VOC-03`.
