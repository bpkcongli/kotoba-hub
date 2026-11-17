# Syllabus content

| Folder | Isi | Status |
| --- | --- | --- |
| [v1/](./v1/manifest.json) | Manifest dan empat track seed `1.0.0` | Default CLI sebelum ada row v2; sumber generator flashcard |
| [v2/](./v2/README.md) | Authoring dan batch bilingual `2.0.0` | Siap diimport eksplisit oleh importer BIL-03; merge tidak mengganti katalog |
| [sources/](./sources/README.md) | Snapshot sumber dan catatan provenance | Sumber bersama lintas versi |

Setiap manifest menyimpan path track relatif terhadap folder versinya. Raw source tetap di `sources/`; UUID namespace dan isi seed v1 tidak berubah ketika folder dipindahkan.

Relokasi 6 November 2026 memindahkan `content/syllabus/manifest.json` ke `content/syllabus/v1/manifest.json` dan `content/syllabus/tracks/` ke `content/syllabus/v1/tracks/`. Provenance `retrievedFrom` dalam snapshot authoring/artefak BIL-02 tetap mencatat lokasi saat kurasi; prefix historis `content/syllabus/tracks/` kini merujuk file yang sama di `content/syllabus/v1/tracks/`. Checksum sumber pada allowlist tetap sama. Perubahan lokasi ini tidak merevisi materi atau terjemahan.
