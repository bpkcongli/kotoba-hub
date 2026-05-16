# JMdict Provenance

Provider primer untuk vocabulary seed sesuai [docs/syllabus/source-of-truth-and-ingestion-plan.md](/home/user/Testing/kotoba-hub/docs/syllabus/source-of-truth-and-ingestion-plan.md:106).

## Artifacts

- `raw/<date>/j_jmdict.html`
  Halaman dokumentasi resmi JMdict.
- `raw/<date>/licence.html`
  Halaman licence EDRDG.
- `raw/<date>/JMdict_e.gz`
  Snapshot dataset XML bilingual yang dipakai sebagai lexical base layer.

## Notes

- Snapshot yang diambil adalah `JMdict_e.gz` karena cukup untuk MVP syllabus dan tetap mempertahankan `ent_seq`, spelling, reading, gloss, POS, serta priority tags.
- Header HTTP dan checksum disimpan berdampingan untuk audit retrieval.
