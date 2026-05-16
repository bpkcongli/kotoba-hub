# KANJIDIC2 Provenance

Provider primer untuk metadata kanji sesuai [docs/syllabus/source-of-truth-and-ingestion-plan.md](/home/user/Testing/kotoba-hub/docs/syllabus/source-of-truth-and-ingestion-plan.md:40).

## Artifacts

- `raw/<date>/kanjd2index_legacy.html`
  Halaman index resmi yang menautkan DTD/XSD dan file dataset.
- `raw/<date>/licence.html`
  Halaman licence EDRDG yang relevan untuk distribusi ulang.
- `raw/<date>/kanjidic2.xml.gz`
  Snapshot dataset primer yang akan dipakai untuk parsing kanji.

## Notes

- Field `jlpt` di source ini tetap harus diperlakukan sebagai legacy JLPT, bukan `curriculumLevel` final.
- Header HTTP dan checksum disimpan berdampingan untuk audit retrieval.

