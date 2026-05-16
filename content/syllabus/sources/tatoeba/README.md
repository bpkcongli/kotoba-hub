# Tatoeba Provenance

Provider primer untuk example sentence candidates sesuai [docs/syllabus/source-of-truth-and-ingestion-plan.md](/home/user/Testing/kotoba-hub/docs/syllabus/source-of-truth-and-ingestion-plan.md:158).

## Artifacts

- `raw/<date>/downloads.html`
  Halaman download resmi yang mendokumentasikan cadence mingguan dan lisensi.
- `raw/<date>/jpn_sentences.tsv.bz2`
  Semua sentence Jepang dari export resmi per-language.
- `raw/<date>/eng_sentences.tsv.bz2`
  Semua sentence Inggris dari export resmi per-language.
- `raw/<date>/jpn_indices.tar.bz2`
  Indeks Tanaka-style yang menghubungkan pasangan JP-EN.
- `raw/<date>/jpn_transcriptions.tsv.bz2`
  Transcriptions untuk sentence Jepang.
- `raw/<date>/sentences_with_audio.tar.bz2`
  Metadata sentence yang punya audio.

## Why This Subset

KotobaHub belum membutuhkan dump semua bahasa. Subset di atas tetap official, cukup untuk merakit candidate `jpn -> eng`, dan lebih dekat ke kebutuhan transform seed daripada `sentences.tar.bz2` penuh.

`links.tar.bz2` sengaja belum ikut pada snapshot awal ini karena `jpn_indices` sudah cukup untuk bootstrap sentence pairing awal dan ukuran file `links` jauh lebih besar. Jika nanti transform membutuhkan graph translation penuh lintas sentence, tambahkan artifact itu pada refresh berikutnya.
