# Yomitan JLPT Vocab Provenance

Overlay source untuk sinyal JLPT vocabulary sesuai [docs/syllabus/source-of-truth-and-ingestion-plan.md](/home/user/Testing/kotoba-hub/docs/syllabus/source-of-truth-and-ingestion-plan.md:117).

## Artifacts

- `raw/<date>/README.md`
  README upstream yang menjelaskan attribution dan limitation.
- `raw/<date>/LICENSE.txt`
  File license upstream.
- `raw/<date>/source-main.zip`
  Archive source repository branch `main`.

## Notes

- Source ini dipakai sebagai `jlpt signal`, bukan lexical truth.
- Archive repo lebih berguna daripada hanya release dictionary karena menyimpan struktur source yang bisa diaudit dan dipetakan ke `JMdict ent_seq`.

