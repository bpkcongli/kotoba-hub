# VOC-03 — resolusi tujuh hold identitas

## Keputusan sebelum integrasi

Tujuh kandidat N5 memakai ent_seq homograf yang keliru pada overlay Yomitan.
Entry dictionary dan makna lama tidak boleh diganti pada ID yang sudah mempunyai
histori. Koreksi memakai jalur retirement dan deduplikasi berikut.

| Item pending lama | Entry benar | Disposisi |
| --- | --- | --- |
| あれ / 2847612 (interjection) | 1000580, pronoun | Retire; sudah dicakup item lesson `27325d16-74f5-5880-a722-55eed6a2cd8c` |
| これ / 2216120 (interjection) | 1628530, pronoun | Retire; sudah dicakup item lesson `74d37e86-1fc6-5849-b977-49f0a77a1529` |
| それ / 2216210 (interjection) | 1006970, pronoun | Retire; sudah dicakup item lesson `9cf31de1-b02e-5113-ad7d-b479fe765564` |
| コップ / 2846389 (cop) | 1050390, sense 1 drinking glass | Retire dan buat item pending baru |
| だんだん / 2546180 (Izumo thanks) | 1597350, sense 1 gradually | Retire dan buat item pending baru |
| 牡丹 / 1182880 (peony) | 1123880, sense 1 clothing button | Retire dan buat item pending baru |
| マッチ / 2784220 (contest) | 1128430, sense 1 ignition match | Retire dan buat item pending baru |

Ketiga item pronoun mempunyai owner lesson published existing; jangan membuat
item atau skill vocabulary kedua untuk makna yang sama. Ketiga paket existing
memakai kana utama dan sense 1 yang sama, dengan qualifier jarak pembicara/lawan
bicara serta opsi bilingual yang direview; owner lesson dan ID tetap. Empat item baru memakai
namespace UUIDv5 pending existing dengan **ent_seq yang benar**, skill code baru,
dan entry/sense serta ejaan/bacaan yang direview. Sinyal N5 tetap heuristic:
record overlay lama salah taut ent_seq, sehingga koreksi makna/form merupakan
keputusan editorial yang harus dicatat, bukan klaim bahwa raw CSV sudah benar.

## Preservasi histori

- Ketujuh record canonical lama tetap tersedia, dengan ID, ent_seq, arti, jawaban,
  skillId null dan field lexical lama dipertahankan; hanya `isActive=false`.
- Membership system deck untuk tujuh record lama dihapus. Empat item baru mengisi
  empat slot replacement; tiga slot duplikat dihapus tanpa repacking seluruh deck.
  Metadata count/segment diselaraskan dengan membership aktual, ID deck lain tetap.
- Importer existing menonaktifkan item dari membership system lama lalu mengisi
  ulang plan. Tidak menghapus row item, state Leitner, custom deck membership,
  session/answer snapshots atau event. Frozen turn lama tetap memakai makna dan
  attribution pending lama. Sesi baru memfilter item inactive.
- Tidak ada pemindahan state/history dari ID lama ke ID baru atau item pronoun
  existing. ID baru mulai dengan state kosong. Tidak ada attribution retroaktif.
- Registry pending mempertahankan record lama sebagai identitas historis dan
  menambahkan empat record yang benar; ledger resolusi menyatakan retirement.
  Generator v1 tidak dijalankan untuk promosi atau regenerasi massal.

## Promosi dan urutan seed

Manifest aktif mempertahankan seluruh 147 kelompok/579 anggota existing.
Empat kelompok baru hanya berisi empat ID baru; membership kelompok existing
immutable. Canonical/overlay naik dari revisi 3/3 ke 4/4 setelah review selesai.
Tidak memerlukan perubahan schema DB, API, evaluator atau formula mastery.

Guard importer **promotion requires existing pending item** tetap berlaku.
Upgrade dari batch 02 memerlukan dua seed: (1) manifest bootstrap tanpa empat
kelompok baru untuk mempertahankan 579 promosi existing sambil menulis empat item
baru sebagai pending dan meretire tujuh ID lama; (2) import manifest kelompok
lengkap lalu seed dengan manifest lengkap untuk mempromosikan empat ID tersebut.
Bootstrap manifest dapat dibuat sementara dari manifest lengkap dengan mengecualikan
empat code baru yang tercatat di ledger batch 03, bukan file runtime tambahan.
Jangan memakai bootstrap setelah empat item baru sudah dipromosikan: demotion
tetap ditolak. Fresh database mengisi item pending sebelum import/promosi kelompok.

## Acceptance

Review harus mencakup raw entry lama/benar, CSV, deduplikasi ketiga owner lesson,
canonical ID baru, paket bilingual dan opsi kedua arah. Validasi dan tes harus
memeriksa 7/7 hold terdisposisi, empat item baru, tidak ada active pending tersisa,
serta preservasi raw snapshot, revisi, replay, custom membership dan state lama.
Smoke penulisan hanya pada database kosong disposable dengan guard `_test`.
Import/rollout production terpisah pada BIL-08/DEP-05.

## Artefak dan audit

Batch kecil ini memakai `assignment.json`, `curation.json`, `content.json`,
`review.md`, dan `coverage.json` di `content/flashcards/drafts/voc-03-batch-03`.
`baseline.json.gz` menyimpan teks persis empat artifact sebelum batch 03, dengan
checksum tiap file pada assignment. Validator dan tes batch 02 tetap memeriksa
hasil historis revisi 3/3 terhadap snapshot ini; artifact aktif diuji terpisah
sebagai revisi 4/4. File draft bukan input importer.

Jalankan `python3 scripts/flashcards/validate_vocabulary_draft.py` untuk rantai
batch 02 dan `python3 scripts/flashcards/validate_vocabulary_holds.py` untuk
resolusi batch 03. Opsi `--write-bootstrap /tmp/voc03-bootstrap.json` pada
validator batch 03 membuat subset manifest sementara yang diperlukan saat
upgrade. Mode `--draft-only` hanya memeriksa source/handoff sebelum integrasi.

## Hasil integrasi dan verifikasi

Review independen raw source/file menerima 7/7 resolusi dan 42 pasangan opsi.
Hasil aktif: 151 kelompok/583 anggota vocabulary mandiri, 636 eligible mapped,
0 eligible pending, revisi konten/terjemahan 4/4. Tujuh ID salah tetap di canonical
sebagai inactive; empat ID benar ditambahkan dan tiga target lesson dipakai ulang.
Registry lama tetap utuh dengan empat tambahan. Lihat
[coverage](../../../content/flashcards/drafts/voc-03-batch-03/coverage.json) dan
[review](../../../content/flashcards/drafts/voc-03-batch-03/review.md).

Verifikasi yang dijalankan:

- Validator batch 02 atas snapshot historis dan batch 03 atas artifact aktif,
  termasuk hash raw source, handoff dan hasil integrasi.
- Seluruh 74 suite/823 tes unit/integrasi dan empat release checks lulus;
  lint serta pemeriksaan TypeScript lulus.
- Smoke MySQL 8.4 pada instance sementara `/tmp`, database kosong berakhiran
  `_test`, menjalankan migrasi serta upgrade 2→3→4. Promosi langsung empat ID
  yang belum ada ditolak; bootstrap, promosi lengkap dan replay lulus, sedangkan
  demotion setelah promosi tetap ditolak.
- Tujuh payload lama tetap sama kecuali inactive; custom membership, Leitner,
  event, snapshot dan retry lama dipertahankan. Empat ID baru mulai NEW dan
  menghasilkan event standalone sendiri tanpa attribution lesson/unit. Semua
  42 turn bilingual benar tidak memakai fallback.
- CLI dry-run manifest memvalidasi 151 kelompok/583 anggota secara offline;
  dry-run flashcards terhadap katalog database disposable menghasilkan 636 item
  mapped dan nol pending. Coverage locale seluruh plan adalah en 636/id 608;
  28 fallback Indonesia pada item lesson existing berada di luar scope tujuh
  resolusi ini. Seluruh tujuh target batch 03 tersedia pada kedua locale.

Tidak ada perubahan schema DB/backend importer pada resolusi ini. Tidak ada
seed/import atau deployment production yang dijalankan. Task VOC-03 selesai
pada scope kurasi, review dan integrasi artifact; rollout tetap BIL-08/DEP-05.
