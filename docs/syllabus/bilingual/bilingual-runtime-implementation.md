# Implementasi runtime bilingual — BIL-03

Implementasi 17 November 2026 menambahkan pembacaan syllabus Inggris/Indonesia,
preferensi akun, dan delivery quiz deterministik. Artefak batch tetap 16 lesson,
492 owner, serta 160 soal. Flashcard, random practice/AI dan katalog pesan UI/API
tetap mengikuti tahap BIL-05, BIL-06 dan BIL-07.

## Persistence dan import

Migration additive `drizzle/0006_bilingual_content.sql` menambahkan enam tabel
translation, revisi/schema/fingerprint canonical, `skills.content`, flag publikasi
soal, `user_preferences` dan `practice_post_study_deliveries`. Tidak menyalin teks
v1 yang belum diaudit ke localization Inggris. Backfill bilingual memakai paket
hasil audit BIL-02 ketika manifest v2 dipilih secara eksplisit.

`PrepareBilingualSeedServiceImpl` memvalidasi JSON Schema 2020-12, versi, path
manifest, identitas batch, paket Inggris current, HTML, atribusi skill, bank
sepuluh soal dan graph prerequisite. `DrizzleBilingualImporter` mengulang validasi
semantik lalu mengunci katalog, memeriksa identity/parent/revisi terhadap DB dan
melakukan merge dalam satu transaksi. Perubahan payload dengan revisi sama atau
revisi mundur membatalkan seluruh transaksi. Payload fingerprint tidak mencakup
publication/sortOrder, tetapi mencakup isi dan provenance.

Hanya lesson dalam manifest beserta parent dan subtree miliknya yang direkonsiliasi.
Row anak yang dihilangkan menjadi unpublished; histori tidak dihapus. Lesson,
skill, block, mapping dan urutan di luar batch tetap. Ancestor tidak boleh
di-unpublish bila masih menaungi lesson published di luar scope. Import v1
ditolak setelah terdapat row v2 agar reseed lama tidak menimpa hasil merge.

Atas persetujuan pemilik proyek pada BIL-03, importer juga melakukan backfill
terbatas rantai prerequisite yang hilang di DB dari snapshot canonical v1.
Hanya skill yang terjangkau dari skill published batch yang ditambahkan,
menggunakan ID/content/prerequisite v1 asli. Parent yang belum ada dibuat
unpublished; parent dan skill existing tidak ditimpa atau dipublikasikan ulang.
Konflik identitas/urutan, prerequisite existing unpublished, sumber hilang atau
siklus membatalkan transaksi. Pemeriksaan akhir memakai seluruh rantai di DB,
bukan menganggap keberadaan di file sumber sebagai keberadaan di DB. Backfill ini
tidak membuat lesson Kana menjadi materi published atau localization yang diaudit.

Untuk row v2, translation table menjadi sumber teks localized. Kolom legacy
menyimpan proyeksi Inggris dari import yang sama. Source refs, canonical lexical
content dan fingerprint tetap tersimpan untuk audit. Tidak ada jalur editing
terpisah untuk proyeksi legacy.

## Resolusi dan API

- GET/PATCH `/api/v1/user-profile/preferences` milik `users`, tersedia dengan
  session valid sebelum onboarding. GET tanpa row mengembalikan `en/en` tanpa
  menulis. PATCH partial nonkosong memeriksa same-origin sebelum session serta
  menolak field asing/null/locale unsupported. Tidak membuat learner profile.
- Syllabus hanya berubah representasi bila `contentFormat=localized`; locale
  eksplisit valid menang atas preferensi tersimpan, lalu default `en`.
  Unsupported/kosong/berulang atau locale tanpa format ditolak. Request legacy
  mempertahankan shape/bahasa dan tidak memakai preferensi akun.
- Setiap owner memilih paket requested yang published/current atau paket Inggris
  published/current. Tidak ada penggabungan field antarbahasa. Metadata
  `localization` menunjukkan requested/resolved locale, fallback dan revisi.
  Draft/stale Inggris membuat subtree tidak eligible. `englishTranslation`
  berubah menjadi `translation` hanya pada representasi localized.
- Response privat memakai `Cache-Control: private, no-store`. DTO tidak
  mengeluarkan translation table, fingerprint, provenance internal atau kunci quiz.

Context syllabus/practice membaca preferensi melalui port miliknya dan adapter
ke facade users. Tipe locale/resolver murni lintas runtime berada di
`src/shared/locale.ts`; aturan terjemahan tetap milik syllabus.

## Delivery quiz

Localized `next` menyimpan UUID delivery dengan expiry 24 jam, owner, binding
lesson/question, target understanding, canonical prompt/kunci, revisi dan paket
bantuan/feedback. Localized `answer` wajib delivery serta `Idempotency-Key` UUID;
locale tidak diterima pada answer. Jawaban Jepang dievaluasi dari snapshot,
bukan soal yang mungkin sudah direseed. Alternatif kana/kanji yang diaudit tetap
diterima pada bank v2; aturan bank v1 tetap legacy.

Delivery dikunci saat dikonsumsi; receipt dan penanda konsumsi ditulis dalam
transaksi yang sama. Satu delivery hanya mempunyai satu receipt. Progress tetap
memakai event ID receipt dan recovery engine existing. Retry identik membaca
receipt sebelum memeriksa expiry/target baru. Preferensi berubah, expiry atau
reseed tidak menulis ulang feedback maupun kunci delivery yang telah diberikan.
Delivery milik user lain menghasilkan not-found; expired/consumed/binding/target
atau key conflict memakai error resmi pada kontrak bilingual.

## Reader dan gate cutover

Root server layout membentuk bootstrap serializable dari session/preferensi dan
status katalog. Cookie UI pra-login hanya menerima `en/id`; setelah login akun
memakai preferensi/default. Client MobX memakai bootstrap yang sama, adapter
Axios dan DI shared existing. Pemilih content language menyimpan preferensi
melalui PATCH dan tetap tersedia ketika katalog loading/error.

UI memakai localized hanya jika seluruh lesson yang published pada DB tersedia
sebagai subtree v2 valid dengan parent, skill, block dan bank Inggris current.
Jika ada blocker, UI tetap legacy dan server mencatat slug blocker. Locale
Indonesia yang belum current tetap dapat fallback ke Inggris tanpa menyempitkan
katalog. Scope feature mencakup session/format/locale; hasil request lama tidak
boleh menimpa scope baru. Payload/key jawaban pending tetap dibekukan meskipun
preferensi berubah.

Renderer menampilkan HTML tersanitasi, `lang` sesuai resolved locale, `lang=ja`
untuk kalimat Jepang, dan penanda fallback Inggris pada materi/quiz yang memakai
fallback. UI umum masih mengikuti bahasa existing sampai BIL-07.

## Operasi

Gunakan app dan ops dari release yang sama. Ambil backup DB dan jalankan migration
sebelum app BIL-03 membaca tabel baru. Berikut perintah operator; implementasi
ini tidak menjalankannya pada database production:

```sh
bun run db:migrate
bun run db:seed:syllabus:dry-run --manifest content/syllabus/v2/manifest.json
bun run db:seed:syllabus --manifest content/syllabus/v2/manifest.json
bun run db:check:bilingual-cutover
```

Dry-run tidak membuka/menulis DB dan melaporkan validitas artefak saja; konflik
terhadap DB diperiksa pada transaksi import. Pemeriksa cutover read-only
menghasilkan `{ready,blockers}` dan exit 1 bila katalog kosong atau tertahan.
SSR menggunakan predicate yang sama. Default CLI tetap manifest v1 untuk database
yang belum mempunyai row v2; setelah merge selalu gunakan manifest v2 eksplisit.
Docker ops memaketkan hanya manifest/track v2, dua JSON Schema dan allowlist yang
dibutuhkan, tanpa authoring/raw source atau dokumen lain.

Rollback tidak memakai down migration atau reseed v1. Kolom legacy dipertahankan,
tetapi kompatibilitas seluruh binary lama belum diverifikasi: validator lama
sebelum BIL-03 dapat menolak alternatif kanji pada tujuh lesson yang baru eligible.
Pakai release reader kompatibel yang sudah diuji, serta lanjutkan rehearsal
backup/restore/image rollback dan deployment live pada BIL-08.

## Verifikasi

- Gate kontrak/artefak Python dan preservation test menjaga checksum sumber,
  identitas, kunci, revisi dan allowlist. Dua label dialog plain/HTML diperbaiki
  secara eksplisit sesuai persetujuan pemilik proyek; lihat catatan batch.
- Unit/API/component test mencakup fallback paket, locale invalid, preferensi
  sebelum onboarding, gate katalog, payload legacy, stale response dan retry
  delivery/key yang sama setelah bahasa berubah, serta sanitasi/lang renderer.
- Smoke MySQL terisolasi menjalankan migration, backfill dari v1, merge/reseed,
  konflik revisi dengan rollback, preservasi konten/progress di luar scope,
  fallback dan concurrency/replay delivery. Jalankan dengan DB disposable:

```sh
BILINGUAL_TEST_DATABASE_URL='mysql://USER:PASSWORD@HOST/kotoba_bilingual_test' \
  bun run test:bilingual --allow-test-db-write
```

Smoke mensyaratkan nama DB berakhiran `_test`, berbeda dari `DATABASE_URL`, dan
flag tulis eksplisit. Gunakan DB kosong untuk pengulangan; fixture bukan cleanup
database aplikasi. Pemeriksaan browser memakai fixture session/database terisolasi; rollout
production tetap terpisah.

### Hasil eksekusi 17 November 2026

| Pemeriksaan | Hasil |
| --- | --- |
| `bun run check` | Lint, typecheck, format, 4 release-test file, 63 suite / 694 tes Jest lulus |
| Kontrak/konversi Python | Schema/examples/OpenAPI, 23 kasus invalid, 17 tes preservasi dan gate 16/16 lulus |
| Dry-run v2 | `MERGE_LESSONS`, 16 lesson / 160 soal; tanpa tulis DB |
| `bun run db:generate` | Tidak ada drift schema/snapshot setelah migration 0006 |
| Smoke MySQL 8.4 | Migration v1→v2, backfill 21 prerequisite, merge/reseed, rollback revision conflict, preservasi luar batch/progress, fallback, ownership, stale/expired, konsumsi concurrent dan receipt replay/recovery lulus |
| Cutover DB uji | `{ready:true,blockers:[]}` setelah fixture blocker luar batch diuji dan dinonaktifkan hanya di DB disposable |
| Build dan Docker | Build Next.js production, canary allowlist, checksum app/ops, dry-run v1/v2 offline dan guard env migration lulus |
| Chrome image final | 1440×1000 dan 390×844: bootstrap Indonesia, reader/lang Jepang, PATCH ke Inggris + reload, render quiz dan tanpa overflow horizontal; tidak ada exception JS/kegagalan API |

Screenshot lokal tersimpan di `/tmp/bil03-browser-evidence/`; pemeriksaan browser
mengecualikan request favicon existing yang mengembalikan 404. Pemeriksaan ini
bukan suite E2E Playwright TEST-11 atau bukti deployment production. Container DB
serta preview disposable dihentikan setelah verifikasi.
