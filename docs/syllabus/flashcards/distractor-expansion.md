# TD-006 — perluasan distraktor vocabulary

Keputusan pemilik proyek: tag hanya metadata authoring/kurasi. Artifact seed,
database dan API tetap memakai kontrak existing tanpa tag atau migration baru.
Setiap item vocabulary aktif harus mempunyai sekurangnya **enam distraktor unik
setelah filter** pada setiap bank legacy dan setiap locale/script yang tersedia.
Paket Indonesia yang belum tersedia tetap mengikuti fallback seluruh paket
existing; pekerjaan ini tidak membuat terjemahan baru untuk menutup coverage.

Enam kandidat menyediakan 20 kombinasi tiga distraktor dan 120 urutan tiga
distraktor. Jika pool lebih besar, jumlah kemungkinan meningkat. Pengacakan
tidak menjamin semua kemungkinan tampil sebelum pengulangan.

## Authoring dan review

Draft terpisah berada di `content/flashcards/drafts/distractor-expansion-01`.
Baseline menyimpan artifact sebelum perubahan beserta SHA-256. Kurasi mencatat
tag semantik, identitas lexical dan bukti raw JMdict. Kandidat boleh berasal dari
tag sama maupun lintas tag; tag bukan bukti bahwa dua makna berbeda.

Author memilih peer nyata yang eligible pada katalog published saat ini, lalu
menyimpan kandidat dan alasan per item. Pemeriksaan meliputi arti/alias kedua
bahasa, sense yang tumpang tindih, homograf, reading sah dan collision lintas
script. Reviewer independen memeriksa draft dan sumber yang tepat, mencatat
temuan/hold serta hash artifact. Integrasi hanya memakai draft yang lolos review.
Jika enam kandidat aman belum tersedia, authoring ditahan; kandidat global tidak
ditambahkan diam-diam.

Draft otomatis yang ada sekarang bukan hasil review dan tidak boleh diimport.
Periksa kandidat per item dengan `python3 scripts/flashcards/render_distractor_review.py`
(opsi `--start`/`--limit` membatasi jumlah item). `curation.json` menyimpan
entry JMdict mentah beserta hash; `proposals.json` menyimpan ID kandidat.
Pasangan yang ditolak reviewer dan alasannya disimpan di `exclusions.json` agar
tidak diusulkan kembali saat regenerasi.
`python3 scripts/flashcards/validate_distractor_expansion.py` hanya memeriksa
integritas dan collision mekanis. Tambahkan `--require-reviewed` untuk gate
integrasi, yang menolak draft selama laporan review independen belum mencakup
seluruh scope dan terikat pada hash draft yang tepat. Audit bank in-memory dapat
dijalankan dengan `bun scripts/flashcards/audit_distractor_expansion.ts`.
Opsi `--all-active` juga memeriksa 110 item yang belum eligible memakai katalog
sintetis; hasil tersebut tidak mempublikasikan lesson atau mengubah database.
Generator menolak menimpa draft existing kecuali dipanggil dengan `--force`;
regenerasi membatalkan binding hash review yang sudah ada bila output berubah.

Gate integrasi membaca `review.json` yang mencatat `verdict`, `author`,
`independentReviewer`, `curationSha256`, `proposalsSha256`,
`reviewReportSha256`, `rawSourcesInspected`, `heldItems`, dan `itemReviews`.
Hash laporan naratif `review.md` mengikat verdict terstruktur ke temuan reviewer.
Setiap item review harus
memuat verdict `READY`, seluruh `checkedPairs` legacy dan locale yang tersedia,
serta `peerReviews` untuk setiap ID kandidat dengan verdict `SAFE` dan alasan
nonkosong. Laporan review naratif tetap menyebut sumber, temuan, koreksi, dan
batas pemeriksaan. Field tersebut mencatat hasil review; validasi bentuk field
tidak menggantikan penilaian editorial atau membuktikan independensi reviewer.

Compiler menghasilkan `reviewedDistractorPoolItemIds` pada artifact vocabulary
aktif. Tag, alasan editorial dan laporan review tidak ikut diimport. Revisi
overlay canonical/terjemahan naik dari 4/4 ke 5/5, dengan teks, identitas,
ownership dan membership existing dipertahankan. `sourceRefs` overlay menambahkan
path curation, proposal, review terstruktur dan laporan naratif agar perubahan
dapat diaudit setelah artifact dipindah ke path canonical. Item inactive tetap utuh.

`python3 scripts/flashcards/compile_distractor_expansion.py --preview --output-dir <dir-kosong>`
menghasilkan manifest draft bertanda `REVIEW_INCOMPLETE`, tanpa artifact seed.
Mode `--reviewed` hanya dapat menghasilkan manifest `READY_FOR_INTEGRATION` dan
dua artifact seed setelah gate editorial dan audit mekanis lulus; verdict itu
menyatakan kesiapan editorial. Output compiler awal menandai `integrationStatus`
sebagai `AWAITING_DATABASE_VALIDATION`. Setelah smoke MySQL disposable lulus,
ledger reviewed dapat dinaikkan menjadi `DATABASE_VALIDATED` dengan bukti command,
versi database, hash smoke test, count hasil, dan preservasi yang diperiksa.
Manifest ini adalah ledger audit, bukan input langsung seeder existing; seeder
membaca artifact pada path canonical. Kedua mode compiler menulis ke direktori
output terpisah dan tidak menjalankan importer atau database.

## Validasi dan kompatibilitas

Validasi harus membuktikan coverage seluruh item aktif, minimal enam nilai unik
per bank setelah filter, referensi eligible, allowlist ketat dan konsistensi
revisi. Normalisasi teks dan pemeriksaan otomatis melengkapi review semantik.
Planner menolak bank vocabulary yang tidak memenuhi enam kandidat untuk revisi
5 dan sesudahnya. Revisi historis tetap dapat direplay untuk pengujian upgrade;
snapshot sesi lama tidak diubah dan tidak dinilai ulang dengan bank baru.

Uji variasi memakai sumber acak terkontrol dan memeriksa kombinasi isi opsi,
bukan hanya posisi. Uji reseed pada MySQL disposable memeriksa repeatability,
grading/retry frozen session, progress, Leitner dan custom deck. Rollout
production mengikuti BIL-08/DEP-05 dan bukan bagian dari penulisan DB uji.

## Hasil review dan manifest

Batch `distractor-expansion-01` telah melalui review penuh dan dua review subset
read-only. Dua belas pasangan ambigu tersimpan di `exclusions.json`, termasuk dua
temuan sampel awal. Regenerasi akhir mempertahankan enam peer pada seluruh 746
item dan tidak menyisakan hold. Laporan naratif serta ledger terstruktur berada di
`content/flashcards/drafts/distractor-expansion-01/review.md` dan `review.json`.

Output reviewed berada di
`content/flashcards/drafts/distractor-expansion-01/reviewed/`:

- `manifest.json`: `READY_FOR_INTEGRATION`, 746 item, target revisi `5/5`.
- `vocabulary-foundation.json`: artifact canonical kandidat dengan pool reviewed.
- `localizations.v2.json`: overlay kandidat dengan revisi dan provenance baru.

Manifest adalah ledger handoff dan kini mencatat `CANONICAL_SEED_INTEGRATED`.
Smoke MySQL `8.4.13` membuktikan dry-run/reseed revision `4/4` ke `5/5` pada 636
item runtime-eligible, repeatability, variasi pool, preservasi
ID/ownership/custom deck/Leitner/progress/frozen session, replay jawaban lama,
serta rollback transactional. Bukti lengkap berada di
`content/flashcards/drafts/distractor-expansion-01/database-validation.md`.
Kedua artifact reviewed telah dipromosikan byte-for-byte ke
`content/flashcards/system-decks/`; rollout database production tetap mengikuti
batas BIL-08 dan DEP-05.
