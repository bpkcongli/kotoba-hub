# Bunpro Provenance

Provider primer untuk canonical inventory grammar sesuai [docs/syllabus/source-of-truth-and-ingestion-plan.md](/home/user/Testing/kotoba-hub/docs/syllabus/source-of-truth-and-ingestion-plan.md:73).

## Artifacts

- `raw/<date>/decks/n5.html`
  Snapshot deck `Bunpro N5 Grammar`.
- `raw/<date>/decks/n4.html`
  Snapshot deck `Bunpro N4 Grammar`.
- `raw/<date>/manifests/n5-grammar-point-urls.txt`
  Daftar URL grammar point hasil ekstraksi dari deck N5.
- `raw/<date>/manifests/n4-grammar-point-urls.txt`
  Daftar URL grammar point hasil ekstraksi dari deck N4.
- `raw/<date>/manifests/n5-grammar-point-files.tsv`
  Mapping `index -> source URL -> local file` untuk crawl N5.
- `raw/<date>/manifests/n4-grammar-point-files.tsv`
  Mapping `index -> source URL -> local file` untuk crawl N4.
- `raw/<date>/grammar_points/n5/*.html`
  Snapshot detail page grammar point N5.
- `raw/<date>/grammar_points/n4/*.html`
  Snapshot detail page grammar point N4.

## Notes

- Crawl disimpan sebagai HTML mentah agar tidak kehilangan payload `__NEXT_DATA__` yang dibutuhkan untuk parsing field seperti `title`, `meaning`, `jlpt`, `structure`, `register`, dan examples.
- Query `?deck_id=` dipertahankan di manifest source, tetapi file lokal dinamai berdasarkan slug grammar point agar stabil.
- Pada snapshot awal ini, checksum dan manifest URL diprioritaskan untuk seluruh detail page. Header HTTP tidak disimpan per halaman grammar point karena volumenya besar dan nilainya lebih rendah dibanding payload HTML mentahnya.
