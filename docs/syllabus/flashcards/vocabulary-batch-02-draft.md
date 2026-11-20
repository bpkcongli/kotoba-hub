# VOC-03 batch 02 — draft seluruh vocabulary pending

> Catatan historis: dokumen ini mencatat kondisi draft sebelum review independen
> selesai. Kondisi runtime dan coverage saat ini ada pada
> [laporan implementasi batch 02](vocabulary-batch-02-implementation.md).

## Hasil dan batas status

Batch `voc-03-batch-02` mencakup tepat **581 ID existing** yang belum tercantum
pada manifest promosi batch pertama, termasuk ボールペン yang ditahan sebelumnya.
Sebanyak 574 item memiliki draft paket Inggris/Indonesia dan 146 usulan kelompok;
tujuh identitas ditahan karena ketidaksesuaian atau ambiguitas entry/sense
terhadap vocabulary overlay yang dimaksud. **Belum ada item batch kedua dipromosikan. VOC-03 tetap terbuka.**

[Coverage](../../../content/flashcards/drafts/voc-03-batch-02/coverage.json)
memisahkan item authored, source-held, status review dan jumlah promosi. Manifest
aktif batch pertama, canonical vocabulary, registry pending dan overlay aktif
sama dengan baseline ketika pekerjaan ini dimulai. Tidak ada database, migration,
seed atau deployment yang dijalankan.

| Scope   | Assigned | Draft bilingual | Source-held | Kelompok usulan |
| ------- | -------: | --------------: | ----------: | --------------: |
| part-01 |      194 |             193 |           1 |              59 |
| part-02 |      194 |             194 |           0 |              40 |
| part-03 |      193 |             187 |           6 |              47 |
| Total   |      581 |             574 |           7 |             146 |

Semua root/group/item/localization draft tetap unpublished. Istilah “draft
bilingual” tidak menyatakan accepted, published, imported atau mastery resmi.

## Sumber, handoff dan review

Setiap folder `content/flashcards/drafts/voc-03-batch-02/part-*/` menyimpan:

- `assignment.json`: scope ID lengkap, record canonical saat penugasan dan enam
  SHA-256 baseline.
- `curation.json`: entry/sense, gloss terpilih, POS termasuk inheritance,
  spelling/reading restrictions, register/usage notes, baris CSV dengan nomor
  aktual, duplicate identity check dan usulan kelompok bilingual.
- `content.json`: hash curation yang dikonsumsi, primary spelling/reading existing,
  paket Inggris/Indonesia, provenance dan tiga pasangan opsi per locale.
- `editorial-handoff.json`: identitas agent, metode handoff, hash artifact dan count.
- `review.md`: temuan reviewer, hash yang diberikan, keterbatasan dan verdict.

Agent utama membaca dan mengekstrak 581 entry raw JMdict serta baris overlay N5,
memeriksa primary spelling/reading terhadap restriction sense terpilih, lalu
menyimpan artifact. `vocabulary-curator` mengusulkan grouping dari record terpilih
melalui handoff teks. `flashcard-maker` menulis arti bilingual melalui handoff teks.
Selected sense adalah ordinal 1, kecuali 肉 (`1463520`) yang memilih ordinal 2
`meat`; ordinal 1 berarti `flesh`. JMdict menetapkan makna lexical, sedangkan
Yomitan hanya sinyal JLPT heuristic. Terjemahan Indonesia adalah editorial.

Seluruh subagent sesi ini tidak mempunyai tool filesystem/terminal. Tiga
`flashcard-reviewer` tetap memeriksa seluruh tabel semantik yang diberikan dan
opsi terbatas, tetapi **tidak memeriksa file artifact/raw source secara independen**.
Verdict keseluruhan ketiganya adalah `REVIEW_INCOMPLETE`. Pemeriksaan mekanis
agent utama bukan pengganti gate independen tersebut. Tidak ada klaim bahwa
checksum, membership atau raw restrictions sudah diverifikasi oleh reviewer.

Reviewer menemukan satu ketidaksetaraan pada handoff 問題 (`1536010`); draft
sekarang mengikuti gloss raw `question (e.g. on a test)`, `problem` dengan
`question; problem` / `soal; masalah`. Reviewer menerima koreksi semantik ini saja;
status review keseluruhan tetap incomplete. Dua typo kompresi handoff lain
(`cow milk`, `inf ront`) tidak terdapat pada file aktual.

## Hold sumber

| ent_seq | Surface existing | Entry raw yang ditemukan           | Vocabulary overlay yang perlu diperiksa |
| ------- | ---------------- | ---------------------------------- | --------------------------------------- |
| 1182880 | 牡丹 / ボタン    | tree peony                         | button                                  |
| 2216120 | これ             | interjection “hey”                 | demonstrative “this”                    |
| 2216210 | それ             | interjection “there!, look!”       | demonstrative “that”                    |
| 2546180 | だんだん         | “thank you”, dialek Izumo          | gradually                               |
| 2784220 | マッチ           | match as a contest                 | match for lighting a fire               |
| 2846389 | コップ           | cop/police officer, slang/rare     | drinking cup                            |
| 2847612 | あれ             | interjection of surprise/suspicion | distal demonstrative                    |

ID dan ent_seq existing tidak diganti diam-diam. Penyelesaian hold memerlukan
review koreksi identitas/entry beserta implikasi ID dan histori; membuat arti
sesuai overlay pada entry yang keliru bukan jalur promosi yang sah. Bukti baris
CSV asli tersedia pada `heldItems` di coverage dan curation.

## Kandidat integrasi dan distractor

[Integration candidate](../../../content/flashcards/drafts/voc-03-batch-02/integration-candidate.json)
adalah format draft tersendiri, **bukan input importer**. Isinya 146 group
unpublished, 574 usulan canonical update dan 574 usulan overlay bilingual; root
menyatakan `REVIEW_INCOMPLETE`. Hash manifest baseline mengikat lima item promosi
existing yang harus dipertahankan pada integrasi berikutnya. Revisi overlay yang
diusulkan `3/3`, belum diterapkan pada overlay aktif `2/2`.

Kandidat membatasi canonical baru ke primary spelling/display reading existing
serta arti terpilih; alternate forms/readings dan gloss sense lain belum diterima
untuk sesi baru. Ini adalah **usulan perubahan canonical**, bukan perubahan ID,
deck membership atau penerimaan jawaban pada frozen session existing. Review
berikutnya harus memeriksa setiap penyempitan dan kecocokan N5 sebelum menerapkan.
Examples kosong dan explanation null secara eksplisit, sehingga tidak ada materi
authored yang dibuang compiler.

Ketiga distractor per item adalah 紙/かみ/paper/kertas,
切手/きって/postage stamp/prangko dan 封筒/ふうとう/envelope/amplop. Ketiganya
memakai ID batch pertama yang telah direview. Kosakata target yang sinonim satu
sama lain tidak menjadi distractor satu sama lain. Pilihan ini menghindari
collision global seperti ボールペン dengan `pen`. Tingkat kesulitan dan kualitas
grouping masih dapat disempurnakan dalam review sumber/file berikutnya.

Field canonical opsional `reviewedDistractorPoolItemIds` menyediakan allowlist
ketat pada bank legacy dan localized; referensi invalid ditolak dan pool yang
habis setelah filter alias/eligibility menyebabkan seed plan gagal, tanpa fallback
ke kandidat global. Field lama `distractorPoolItemIds` tetap preference. Lihat
[kontrak seed](vocabulary-flashcard-seeder-schema.md#reviewed-distractor-pools-voc-03).
Tidak ada artifact aktif yang memakai field baru dari kandidat ini.

## Verifikasi

`python3 scripts/flashcards/validate_vocabulary_draft.py` berjalan read-only tanpa
DB dan memeriksa hash baseline/handoff, coverage seluruh 581 ID, primary
spelling/reading, gloss/restriction/POS/register/usage note raw, baris CSV aktual,
unpublished flags, membership dan 3.444 set opsi draft. Ini memeriksa integritas
mekanis, bukan kebenaran terjemahan secara independen.

Tes real-content memakai salinan sumber di memori untuk memodelkan **hipotesis
574 item telah lolos review dan diaktifkan**. Hasilnya 639 item, 632 mapped dan
7 pending, dengan enam pasangan localized tiap kandidat tanpa fallback dan tiga
peer yang tepat pada legacy maupun localized. Tes tersebut tidak membuat katalog
ini menjadi aktif, tidak mengimpor group unpublished, dan tidak menulis database.
Katalog aktif tetap mempunyai 581 pending; fallback aktif belum berubah.

Lint, typecheck dan 73 suite / 821 tes Jest lulus, termasuk tes batch pertama,
allowlist, dan preview seluruh kandidat batch kedua.
Tidak ada smoke MySQL atau pengujian deployment untuk batch draft ini.

## Langkah berikutnya

Jalankan `flashcard-reviewer` dengan tool workspace agar dapat membaca assignment,
raw JMdict/Yomitan, seluruh curation/content, grouping, candidate dan hash aktual.
Selesaikan temuan canonical/sense/grouping/option lalu simpan verdict independen
untuk subset yang benar-benar diterima. Tujuh hold membutuhkan keputusan koreksi
identitas yang terpisah. Setelah itu kompilasi subset accepted ke manifest runtime
yang tetap memuat kelima item batch pertama, naikkan canonical/overlay revision,
lakukan dry-run dan smoke preservasi pada MySQL disposable sesuai
[runbook VOC-03](../../../drizzle/README.md#voc-03-reviewed-vocabulary-batch).

Promosi tidak memerlukan perubahan pada sesi lama atau attribution retroaktif.
Rollout production tetap pekerjaan terpisah setelah gate konten dan verifikasi.
