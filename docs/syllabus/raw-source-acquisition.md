# Raw Source Acquisition Baseline

## Scope
- Dokumen ini mencatat output task `SYL-03A`.
- Fokusnya adalah raw snapshot layer untuk source syllabus yang akan dipakai sebelum transform ke seed final.

## Snapshot Result

Raw snapshot disimpan di [content/syllabus/sources/](/home/user/Testing/kotoba-hub/content/syllabus/sources/README.md:1).

Baseline yang sudah diakuisisi:
- `KANJIDIC2`
  Dataset resmi `kanjidic2.xml.gz` plus index dan licence page.
- `JMdict`
  Dataset resmi `JMdict_e.gz` plus documentation dan licence page.
- `Tatoeba`
  Export resmi yang relevan untuk sentence pairing `jpn -> eng`: `jpn_sentences`, `eng_sentences`, `jpn_indices`, `jpn_transcriptions`, `sentences_with_audio`.
- `yomitan-jlpt-vocab`
  Source repo archive sebagai overlay JLPT vocabulary.
- `Bunpro`
  Deck `N5` dan `N4`, daftar URL grammar point hasil ekstraksi, serta snapshot HTML per grammar point.

## Provenance Convention

Setiap snapshot menyimpan:
- payload mentah provider
- response headers untuk artifact yang jalur akuisisinya stabil dan bernilai audit tinggi
- `retrieved_at_utc.txt`
- `SHA256SUMS`

Pendekatan ini sengaja dipilih agar:
- transform seed dapat diulang terhadap snapshot yang sama
- kita bisa membedakan perubahan parser vs perubahan upstream
- atribusi dan lisensi tetap bisa ditelusuri tanpa mengandalkan ingatan atau bookmark eksternal

## Current Alignment Check

Hasil verifikasi saat snapshot awal ini diambil:
- Bunpro `N5` deck masih menautkan `130` grammar point.
- Bunpro `N4` deck masih menautkan `179` grammar point.
- Tatoeba downloads page masih menyatakan weekly exports diperbarui setiap Sabtu pukul `06:30 UTC`.
- KANJIDIC2 dan JMdict masih tersedia melalui jalur EDRDG yang didokumentasikan di `docs/syllabus`.

Tidak ada mismatch baru yang memaksa perubahan asumsi dokumen `SYL-00` sampai `SYL-03`.

## Current Snapshot State

| Provider | State | Notes |
| --- | --- | --- |
| `KANJIDIC2` | complete | Dataset, index page, licence page, headers, dan checksum sudah tersimpan. |
| `JMdict` | complete | Dataset, index page, licence page, headers, dan checksum sudah tersimpan. |
| `Tatoeba subset` | complete | `jpn_sentences`, `eng_sentences`, `jpn_indices`, `jpn_transcriptions`, dan `sentences_with_audio` sudah tersimpan beserta checksum. |
| `yomitan-jlpt-vocab` | complete | Raw `README`, `LICENSE`, source archive, headers, dan checksum sudah tersimpan. |
| `Bunpro N5/N4` | complete | Deck pages, URL manifests, `130` detail page N5, `179` detail page N4, dan checksum sudah tersimpan. |

## Deferred Sources

Belum disnapshot pada baseline ini:
- `Tae Kim`
  Secondary explanation source, bukan canonical grammar inventory source.
- `core-frequency`
  Jalur lisensi dan bulk acquisition belum final di dokumentasi, jadi belum aman dijadikan bagian default raw layer.
- `Tatoeba links.tar.bz2`
  Masih official dan relevan, tetapi sengaja ditunda agar snapshot awal tetap praktis. `jpn_indices` diprioritaskan lebih dulu sebagai jalur pairing yang lebih kecil dan langsung berguna untuk bootstrap.

Jika nanti dua source ini ikut dibutuhkan untuk transform nyata `SYL-04+`, tambahkan snapshot dengan konvensi folder yang sama.
