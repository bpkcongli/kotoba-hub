# Raw Syllabus Sources

Folder ini memuat raw source layer untuk task `SYL-03A`.

Tujuannya:
- menyimpan snapshot mentah sedekat mungkin dengan provider asli
- membawa header response, checksum, dan catatan provenance agar transform seed bisa diaudit
- memisahkan bahan baku eksternal dari seed aktif `content/syllabus/v1/manifest.json` dan `content/syllabus/v1/tracks/*.json`, serta artefak authoring terisolasi di `content/syllabus/v2/`

## Layout

```text
content/
  syllabus/
    sources/
      README.md
      kanjidic2/
      jmdict/
      tatoeba/
      yomitan-jlpt-vocab/
      bunpro/
      tae-kim/
```

Setiap provider memakai pola:

```text
<provider>/
  README.md
  raw/
    YYYY-MM-DD/
      retrieved_at_utc.txt
      <artifact>
      <artifact>.headers  # optional, captured when practical
      SHA256SUMS
```

## Snapshot Coverage

Snapshot awal `SYL-03A` mencakup:
- `KANJIDIC2`: index page, licence page, dan dataset `kanjidic2.xml.gz`
- `JMdict`: documentation page, licence page, dan dataset `JMdict_e.gz`
- `Tatoeba`: downloads page dan export resmi yang langsung relevan untuk `jpn -> eng` sentence candidates
- `yomitan-jlpt-vocab`: source repository archive plus raw `README` dan `LICENSE`
- `Bunpro`: raw deck pages `N5` dan `N4`, daftar URL grammar point hasil ekstraksi dari deck, serta snapshot HTML per grammar point

Tambahan dari pemilik repository: [Tae Kim Japanese Grammar Guide](tae-kim/README.md), PDF sumber penjelasan sekunder untuk authoring/review. Folder ini mempertahankan file yang disediakan langsung; tidak memakai layout snapshot fetch otomatis di atas. Metadata, checksum dan cara ekstraksi dicatat pada README sumber.

## Intentional Deferrals

Beberapa source pendukung belum ikut diambil pada snapshot awal ini:
- `core-frequency`
  Di [docs/syllabus/source-of-truth-and-ingestion-plan.md](/home/user/Testing/kotoba-hub/docs/syllabus/source-of-truth-and-ingestion-plan.md:180) jalur lisensi dan bulk acquisition-nya masih belum dikunci, jadi belum aman dianggap bagian dari baseline raw snapshot.
- `Tatoeba links.tar.bz2`
  Export translation graph ini official dan relevan, tetapi ukurannya jauh lebih besar daripada subset awal yang dibutuhkan untuk bootstrap pairing `jpn -> eng`. Snapshot awal memprioritaskan `jpn_indices` lebih dulu, lalu `links` bisa ditambahkan di refresh berikutnya bila transform membutuhkan graph penuh.

## Reproduction

Gunakan skrip [scripts/fetch_syllabus_sources.sh](/home/user/Testing/kotoba-hub/scripts/fetch_syllabus_sources.sh:1) untuk mengambil ulang snapshot ke tanggal baru.
