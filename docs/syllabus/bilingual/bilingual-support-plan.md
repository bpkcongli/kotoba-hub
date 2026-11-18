# Rencana Dukungan Bilingual KotobaHub

## Status dan batas cakupan

- `BIL-01` selesai: [kontrak konten bilingual](./bilingual-content-contract.md), schema/examples v2, ERD target dan OpenAPI sudah difinalkan. Authoring/kurasi `BIL-02` menghasilkan seluruh teks `en/id` dan batch `READY_FOR_BIL_03`; lihat [hasil konversi](./batch-01/bilingual-batch-01-conversion.md). Implementasi BIL-03 tersedia; migration/merge DB tujuan tetap eksplisit dan FE memakai gate cutover. Lihat [implementasi runtime](./bilingual-runtime-implementation.md).
- Target: materi dan aplikasi berbahasa Inggris (`en`) serta Indonesia (`id`), dengan bahasa Jepang (`ja`) tetap sebagai bahasa yang dipelajari.
- Identitas track/unit/lesson/skill/soal, slug, urutan, prerequisite, dan progress tetap canonical lintas bahasa. Locale tidak menjadi bagian ID atau kunci mastery/Leitner.
- Batch awal mencakup **16 lesson N5 yang sudah memiliki materi terkurasi dan bank 10 soal**, beserta metadata parent dan skill terkait. ID/slug dan checksum sumber dikunci pada [allowlist batch 01](./batch-01/bilingual-batch-01.json); paragraf pengantar generik tidak dihitung sebagai materi lengkap.
- Baseline seed: 42 lesson N5, 40 lesson N4; dry-run importer meloloskan 9 lesson. Dari 16 kandidat, 7 bermasalah pada atribusi skill soal. Periksa ulang saat eksekusi.

## Tahapan

Gunakan `[ ]` untuk belum selesai dan `[x]` untuk selesai. Perbarui status bersama task terkait di [task breakdown](../../task-breakdown.md); tahap ditandai selesai setelah seluruh cakupannya terpenuhi.

- [x] `BIL-01` Finalisasi schema dan kebijakan bahasa. Lihat [kontrak final](./bilingual-content-contract.md).
- [x] `BIL-02` Konversi dan kurasi seed batch awal: 492 owner bilingual/current, seluruh 18 hold terselesaikan, 16 lesson lolos gate publishable. Lihat [kurasi canonical](./batch-01/bilingual-batch-01-curation.md).
- [x] `BIL-03` Integrasi database, importer, API dan pembaca syllabus, termasuk gate cutover dan delivery quiz. Lihat [hasil implementasi/verifikasi](./bilingual-runtime-implementation.md).
- [ ] `BIL-04` Seed lesson lain (tooling authoring/review tersedia; pengisian seluruh N5/N4 dan integrasi seed belum dilakukan).
- [x] `BIL-05` Runtime/seed awal flashcard bilingual; [cakupan, fallback dan verifikasi](./bilingual-flashcards-implementation.md). Seluruh bank Indonesia belum dikurasi.
- [x] `BIL-06` Random practice dan AI bilingual; [runtime, snapshot dan verifikasi](./bilingual-practice-implementation.md). Model live dan rollout tetap BIL-08.
- [x] `BIL-07` Internationalization UI/API memakai `next-intl`, pemilih bahasa, validasi, formatter dan SSR/hydration. Lihat [implementasi dan verifikasi](./bilingual-ui-api-implementation.md).
- [ ] `BIL-08` Verifikasi dan rollout.

### BIL-01 — Finalisasi schema dan kebijakan bahasa

- Gunakan **`schemaVersion: "2.0.0"`** untuk manifest dan track v2 karena kontrak teks berubah. Versi schema terpisah dari revisi konten, versi API `/api/v1`, dan nomor migration DB.
- Tetapkan `localizations.en` / `localizations.id`; kalimat Jepang, referensi skill, input mode, dan kunci quiz tetap canonical. Seragamkan block legacy `title`/`body`; sediakan JSON Schema dan contoh minimal v2.
- Schema DB final: enam tabel terjemahan per owner, PK composite owner/locale, serta revisi/publikasi; `user_preferences` terpisah dari learner profile dan snapshot delivery quiz milik practice. Detail field/relasi ada pada kontrak final dan ERD target; migration dikerjakan `BIL-03`.
- Bedakan `contentLocale`, `uiLocale`, bahasa prompt/jawaban, dan `preferredScript`. Simpan preferensi pada context `users`; default awal `en`. Definisikan resolusi sejak awal: pilihan eksplisit yang valid → preferensi tersimpan → default. Untuk UI sebelum login, gunakan cookie locale yang divalidasi.
- Fallback: locale yang diminta dan published → `en` published. Satu bahasa per entitas/block; hint dan explanation satu soal menjadi satu paket. Jika keduanya tidak tersedia, tahan publikasi konten wajib. Response menunjukkan requested/resolved locale dan fallback; draft tidak ditampilkan.
- Petakan field lama (`englishTranslation`, `meaningsEn`, `glossesEn`, `translationEn`) ke schema baru; tentukan penyimpanan arti skill karena `skill.content` belum dipersist oleh importer syllabus.
- Output selesai: [schema seed](../ingestion/seed-content-schema.md), [JSON Schema v2](../schema/track-seed.v2.schema.json) dan contoh, ERD [syllabus](../../erd/syllabus-domain.md) / [user](../../erd/auth-and-user-profile.md) / [activity](../../erd/learning-activity.md), [OpenAPI target](../../api-contract/openapi.bilingual.yaml), serta aturan kompatibilitas v1/v2. Verifikasi: `python3 scripts/syllabus/validate_bilingual_contracts.py`.

### BIL-02 — Konversi seed untuk lesson yang sudah tersedia

- Konversi allowlist `BIL-01` dengan ID, materi Jepang, HTML, provenance, dan kunci tetap. Audit bahasa v1: jangan melabeli teks Indonesia sebagai `en`; lengkapi baseline Inggris, lalu Indonesia.
- Cakup metadata, paragraf, contoh, grammar, arti skill yang relevan, serta placeholder/hint/explanation quiz. Review kesetaraan makna dan istilah pedagogis; jangan menambah lesson atau bank soal baru.
- Perbaiki atribusi skill 7 kandidat tanpa mengganti ID soal; publikasi tetap mensyaratkan bank 10 soal valid dan ladder `1..10`.
- Siapkan artefak v2 terpisah; regenerasi mempertahankan kurasi/terjemahan. Manifest aktif tetap v1 sampai importer siap; subset batch tidak boleh menggantikan seluruh track aktif.
- Hasil 6 November 2026: [authoring/artefak v2](../../../content/syllabus/v2/README.md) lengkap untuk kedua bahasa; [laporan blocker](./batch-01/bilingual-batch-01-conversion.md) mencatat 9 lesson siap, 7 ditahan. Pemeriksaan schema/tes authoring lulus, tetapi gate `--require-publishable` wajib gagal sampai semua atribusi selesai. Tahap ini belum selesai; BIL-03 belum dibuka.
- Hasil kurasi 17 November 2026: delapan skill lexical baru, tujuh konversi block, dua prerequisite yang diperbaiki dan empat hint direview secara eksplisit. Snapshot v1 tetap utuh; scope/checksum tambahan dikunci pada allowlist. Seluruh 16 lesson lolos gate, sehingga BIL-02 selesai dan dependency konten BIL-03 terpenuhi. Keterbatasan assessment baseline yang prompt/kuncinya dibekukan dicatat pada [laporan kurasi](./batch-01/bilingual-batch-01-curation.md).

### BIL-03 — Integrasi database, importer, API, dan pembaca syllabus

- Implementasikan migration additive, backfill hasil audit bahasa, dan validator/importer v2. Pertahankan kolom/kontrak lama selama transisi dengan satu sumber teks utama.
- Tetapkan pemilihan versi melalui manifest dan cutover eksplisit. Import batch terjemahan tidak boleh menonaktifkan subtree di luar batch; hentikan versi tidak didukung dengan error jelas.
- Implementasikan preferensi, DTO netral bahasa, fallback, dan renderer lesson yang konsisten di server/client. Cache/store memakai locale dan menolak hasil request locale lama.
- Pertahankan guard auth, validasi jawaban Jepang, progress, dan idempotency. Terjemahan published harus merujuk revisi canonical yang sesuai.

Hasil 17 November 2026: migration `0006`, merge v2 dan backfill 21 prerequisite
terbatas diuji pada MySQL terisolasi; 694 tes Jest, 17 tes preservasi Python,
artefak Docker app/ops dan Chrome desktop/mobile lulus. Dua koreksi label prompt
plain serta backfill prerequisite telah diotorisasi pemilik proyek. Katalog DB
uji menghasilkan `ready: true`; deployment/backup/restore live tetap BIL-08.

### BIL-04 — Seed lesson lain (belum dieksekusi)

- Subagent dan skill authoring/review seed v2 sudah tersedia; [panduan authoring](../authoring/syllabus-authoring-guide.md) menetapkan draft terisolasi per lesson. Pengisian seluruh N5/N4 dan integrasi seed masih pekerjaan terpisah dari kurasi BIL-02.
- Setelah tooling siap, perluas konten berdasarkan schema final dan hasil batch awal. Tahap ini tidak memblokir `BIL-05`–`BIL-08` untuk cakupan yang sudah siap.

### BIL-05 — Flashcard bilingual

Runtime, migration 0007, API/FE dan seed awal tersedia; lihat
[hasil implementasi dan batas kurasi](./bilingual-flashcards-implementation.md).
Overlay awal: 88 judul deck/38 vocabulary ID. Item yang belum mempunyai paket
Indonesia memakai fallback Inggris eksplisit; rollout production tetap BIL-08.

- Perluas schema/seed/API deck/item untuk judul, arti, penjelasan, contoh, dan distractor `en`/`id`. Pisahkan representasi teks dari bahasa pada mode `ENGLISH`, dengan kompatibilitas sesi lama.
- Pertahankan item ID dan state Leitner. Bekukan bahasa, opsi, kunci, dan revisi konten dalam snapshot sesi; pergantian preferensi berlaku untuk sesi berikutnya.
- Validasi opsi setelah penerjemahan: arti yang sama tidak boleh menghasilkan pilihan ambigu atau duplikat. Jangan fallback sebagian opsi ke bahasa berbeda.

### BIL-06 — Random practice dan AI bilingual

Runtime opt-in, template AI v2, snapshot bahasa/feedback dan kompatibilitas sesi lama
tersedia. Tidak diperlukan migration baru; bahasa disimpan di JSON existing.
Lihat [hasil implementasi dan batas verifikasi](./bilingual-practice-implementation.md).

- Bawa locale instruksi/feedback dan bahasa prompt/jawaban ke request AI; revisi prompt berversi, schema, validator, grading, dan DTO untuk `en`↔`ja` serta `id`↔`ja`.
- Bahasa soal, kunci, dan evaluator harus konsisten; pasangan yang belum tersedia tidak dialihkan diam-diam. Bahasa bantuan boleh fallback dengan penanda yang jelas.
- Snapshot locale, soal, kunci, dan feedback untuk sesi/receipt serta retry yang stabil. Catat locale dan versi prompt pada observability; evaluasi ketepatan soal dan grading memakai contoh Inggris/Indonesia yang setara.
- Selaraskan output AI lain yang terlihat learner, termasuk alasan assessment/rekomendasi. Bank quiz lesson tetap hasil kurasi syllabus, terpisah dari generation random practice.

### BIL-07 — Internationalization backend dan frontend

- Fondasi locale dimulai di `BIL-01`/`BIL-03`; tahap ini memperluas katalog pesan ke seluruh aplikasi. Implementasi memakai `next-intl` 4.15.1 dengan provider locale eksplisit pada App Router/SSR/client.
- FE: shell, auth/onboarding, settings/pemilih bahasa, syllabus, flashcard/practice, progress, validasi, empty/error state, dan format angka/tanggal. Sinkronkan locale SSR/hydration, atribut `lang`, serta teks Jepang; locale tidak otomatis menentukan timezone.
- BE: lokalisasi pesan API/validasi pada lapisan presentasi dengan key/parameter stabil. Pertahankan status/code/error field, trace ID, enum, dan log operasional; client tidak bergantung pada teks pesan.
- Dokumentasikan pemilik pesan BE/FE agar tidak diterjemahkan dua kali. Terjemahan konten tersimpan di seed/DB; kamus i18n aplikasi menyimpan pesan UI/API.

Hasil 18 November 2026: katalog UI/API, pemilih bahasa dengan cookie/preferensi,
metadata dan formatter tersedia. Seluruh 766 tes Jest, 4 suite release offline,
quality checks, validasi kontrak dan build production lulus; Chrome memeriksa
landing/login/404, SSR dan pergantian bahasa pada desktop/tablet/mobile. Flow
protected memakai MSW; rollout production tetap BIL-08. Lihat [ownership pesan,
aturan snapshot dan batas verifikasi](./bilingual-ui-api-implementation.md).

### BIL-08 — Verifikasi dan rollout

- Uji schema/reseed, ID, kelengkapan/revisi terjemahan, fallback tanpa draft, kontrak, cache lintas locale/user, dan SSR/hydration. Smoke lesson → quiz → progress serta flashcard/practice kedua bahasa, termasuk sesi lama dan retry setelah preferensi berubah.
- Review terjemahan terhadap bahasa Jepang, terminologi, dan provenance; perubahan baseline Inggris menandai terjemahan Indonesia untuk review ulang. HTML terjemahan mengikuti sanitasi yang sama.
- Uji migration/backfill pada DB terisolasi; siapkan backup, kompatibilitas app/ops image, dry-run seed, dan rollback sebelum cutover production. Schema v1/kolom legacy baru dipensiunkan setelah pembacaan dan rollback versi lama tidak diperlukan.

Urutan utama: **`BIL-01 → BIL-02 → BIL-03 → BIL-05/BIL-06 → BIL-07 → BIL-08`**. Flashcard dan practice dapat dikerjakan terpisah setelah runtime siap. Verifikasi dilakukan tiap tahap; pengisian penuh `BIL-04` belum dieksekusi.

## Acuan implementasi

- Ownership dan struktur: [ARCHITECTURE.md](../../../ARCHITECTURE.md).
- Kontrak: [syllabus](../../api-contract/syllabus.md), [profile](../../api-contract/user-profile-and-personalization.md), [flashcards](../../api-contract/flashcards.md), [practice](../../api-contract/practice.md), dan [base/error](../../api-contract/README.md), beserta OpenAPI masing-masing.
- Runtime: [learning activity ERD](../../erd/learning-activity.md), [AI integration](../../ai-integration.md), [frontend foundations](../../frontend/frontend-foundation-patterns.md), serta [migration/seeding](../../../drizzle/README.md).
