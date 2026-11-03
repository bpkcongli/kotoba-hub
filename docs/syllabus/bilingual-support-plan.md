# Rencana Dukungan Bilingual KotobaHub

## Status dan batas cakupan

- Dokumen planning; schema v1, ERD, kontrak API, dan runtime saat ini tetap berlaku sampai revisi terkait diselesaikan.
- Target: materi dan aplikasi berbahasa Inggris (`en`) serta Indonesia (`id`), dengan bahasa Jepang (`ja`) tetap sebagai bahasa yang dipelajari.
- Identitas track/unit/lesson/skill/soal, slug, urutan, prerequisite, dan progress tetap canonical lintas bahasa. Locale tidak menjadi bagian ID atau kunci mastery/Leitner.
- Batch awal mencakup **16 lesson N5 yang sudah memiliki materi terkurasi dan bank 10 soal**, beserta metadata parent dan skill terkait. Daftar slug dikunci saat `BIL-01`; paragraf pengantar generik tidak dihitung sebagai materi lengkap.
- Baseline seed: 42 lesson N5, 40 lesson N4; dry-run importer meloloskan 9 lesson. Dari 16 kandidat, 7 bermasalah pada atribusi skill soal. Periksa ulang saat eksekusi.

## Tahapan

Gunakan `[ ]` untuk belum selesai dan `[x]` untuk selesai. Perbarui status bersama task terkait di [task breakdown](../task-breakdown.md); tahap ditandai selesai setelah seluruh cakupannya terpenuhi.

- [ ] `BIL-01` Finalisasi schema dan kebijakan bahasa.
- [ ] `BIL-02` Konversi seed untuk lesson yang sudah tersedia.
- [ ] `BIL-03` Integrasi database, importer, API, dan pembaca syllabus.
- [ ] `BIL-04` Seed lesson lain (ditangguhkan: menunggu subagent dan skill authoring/review pada sesi terpisah).
- [ ] `BIL-05` Flashcard bilingual.
- [ ] `BIL-06` Random practice dan AI bilingual.
- [ ] `BIL-07` Internationalization backend dan frontend.
- [ ] `BIL-08` Verifikasi dan rollout.

### BIL-01 — Finalisasi schema dan kebijakan bahasa

- Gunakan **`schemaVersion: "2.0.0"`** untuk manifest dan track v2 karena kontrak teks berubah. Versi schema terpisah dari revisi konten, versi API `/api/v1`, dan nomor migration DB.
- Tetapkan `localizations.en` / `localizations.id`; kalimat Jepang, referensi skill, input mode, dan kunci quiz tetap canonical. Seragamkan block legacy `title`/`body`; sediakan JSON Schema dan contoh minimal v2.
- Arah DB: tabel `track_translations`, `unit_translations`, `lesson_translations`, `skill_translations`, `lesson_content_block_translations`, dan `lesson_post_study_question_translations`; FK ke owner, unik `(owner_id, locale)`, status publikasi, serta revisi sumber. Payload block berupa JSON sesuai `blockType`.
- Bedakan `contentLocale`, `uiLocale`, bahasa prompt/jawaban, dan `preferredScript`. Simpan preferensi pada context `users`; default awal `en`. Definisikan resolusi sejak awal: pilihan eksplisit yang valid → preferensi tersimpan → default. Untuk UI sebelum login, gunakan cookie locale yang divalidasi.
- Fallback: locale yang diminta dan published → `en` published. Satu bahasa per entitas/block; hint dan explanation satu soal menjadi satu paket. Jika keduanya tidak tersedia, tahan publikasi konten wajib. Response menunjukkan requested/resolved locale dan fallback; draft tidak ditampilkan.
- Petakan field lama (`englishTranslation`, `meaningsEn`, `glossesEn`, `translationEn`) ke schema baru; tentukan penyimpanan arti skill karena `skill.content` belum dipersist oleh importer syllabus.
- Output: revisi [schema seed](./seed-content-schema.md), [JSON Schema](./schema/), ERD [syllabus](../erd/syllabus-domain.md) / [user](../erd/auth-and-user-profile.md), OpenAPI terkait, serta aturan kompatibilitas v1/v2 sebelum implementasi.

### BIL-02 — Konversi seed untuk lesson yang sudah tersedia

- Konversi allowlist `BIL-01` dengan ID, materi Jepang, HTML, provenance, dan kunci tetap. Audit bahasa v1: jangan melabeli teks Indonesia sebagai `en`; lengkapi baseline Inggris, lalu Indonesia.
- Cakup metadata, paragraf, contoh, grammar, arti skill yang relevan, serta placeholder/hint/explanation quiz. Review kesetaraan makna dan istilah pedagogis; jangan menambah lesson atau bank soal baru.
- Perbaiki atribusi skill 7 kandidat tanpa mengganti ID soal; publikasi tetap mensyaratkan bank 10 soal valid dan ladder `1..10`.
- Siapkan artefak v2 terpisah; regenerasi mempertahankan kurasi/terjemahan. Manifest aktif tetap v1 sampai importer siap; subset batch tidak boleh menggantikan seluruh track aktif.

### BIL-03 — Integrasi database, importer, API, dan pembaca syllabus

- Implementasikan migration additive, backfill hasil audit bahasa, dan validator/importer v2. Pertahankan kolom/kontrak lama selama transisi dengan satu sumber teks utama.
- Tetapkan pemilihan versi melalui manifest dan cutover eksplisit. Import batch terjemahan tidak boleh menonaktifkan subtree di luar batch; hentikan versi tidak didukung dengan error jelas.
- Implementasikan preferensi, DTO netral bahasa, fallback, dan renderer lesson yang konsisten di server/client. Cache/store memakai locale dan menolak hasil request locale lama.
- Pertahankan guard auth, validasi jawaban Jepang, progress, dan idempotency. Terjemahan published harus merujuk revisi canonical yang sesuai.

### BIL-04 — Seed lesson lain (ditangguhkan)

- **Ditangguhkan sesuai arahan pemilik proyek**, sampai subagent dan skill authoring/review seed v2 disiapkan pada sesi terpisah.
- Setelah tooling siap, perluas konten berdasarkan schema final dan hasil batch awal. Tahap ini tidak memblokir `BIL-05`–`BIL-08` untuk cakupan yang sudah siap.

### BIL-05 — Flashcard bilingual

- Perluas schema/seed/API deck/item untuk judul, arti, penjelasan, contoh, dan distractor `en`/`id`. Pisahkan representasi teks dari bahasa pada mode `ENGLISH`, dengan kompatibilitas sesi lama.
- Pertahankan item ID dan state Leitner. Bekukan bahasa, opsi, kunci, dan revisi konten dalam snapshot sesi; pergantian preferensi berlaku untuk sesi berikutnya.
- Validasi opsi setelah penerjemahan: arti yang sama tidak boleh menghasilkan pilihan ambigu atau duplikat. Jangan fallback sebagian opsi ke bahasa berbeda.

### BIL-06 — Random practice dan AI bilingual

- Bawa locale instruksi/feedback dan bahasa prompt/jawaban ke request AI; revisi prompt berversi, schema, validator, grading, dan DTO untuk `en`↔`ja` serta `id`↔`ja`.
- Bahasa soal, kunci, dan evaluator harus konsisten; pasangan yang belum tersedia tidak dialihkan diam-diam. Bahasa bantuan boleh fallback dengan penanda yang jelas.
- Snapshot locale, soal, kunci, dan feedback untuk sesi/receipt serta retry yang stabil. Catat locale dan versi prompt pada observability; evaluasi ketepatan soal dan grading memakai contoh Inggris/Indonesia yang setara.
- Selaraskan output AI lain yang terlihat learner, termasuk alasan assessment/rekomendasi. Bank quiz lesson tetap hasil kurasi syllabus, terpisah dari generation random practice.

### BIL-07 — Internationalization backend dan frontend

- Fondasi locale dimulai di `BIL-01`/`BIL-03`; tahap ini memperluas katalog pesan ke seluruh aplikasi. Pilih library i18n saat implementasi setelah memeriksa kompatibilitas App Router/SSR/client.
- FE: shell, auth/onboarding, settings/pemilih bahasa, syllabus, flashcard/practice, progress, validasi, empty/error state, dan format angka/tanggal. Sinkronkan locale SSR/hydration, atribut `lang`, serta teks Jepang; locale tidak otomatis menentukan timezone.
- BE: lokalisasi pesan API/validasi pada lapisan presentasi dengan key/parameter stabil. Pertahankan status/code/error field, trace ID, enum, dan log operasional; client tidak bergantung pada teks pesan.
- Dokumentasikan pemilik pesan BE/FE agar tidak diterjemahkan dua kali. Terjemahan konten tersimpan di seed/DB; kamus i18n aplikasi menyimpan pesan UI/API.

### BIL-08 — Verifikasi dan rollout

- Uji schema/reseed, ID, kelengkapan/revisi terjemahan, fallback tanpa draft, kontrak, cache lintas locale/user, dan SSR/hydration. Smoke lesson → quiz → progress serta flashcard/practice kedua bahasa, termasuk sesi lama dan retry setelah preferensi berubah.
- Review terjemahan terhadap bahasa Jepang, terminologi, dan provenance; perubahan baseline Inggris menandai terjemahan Indonesia untuk review ulang. HTML terjemahan mengikuti sanitasi yang sama.
- Uji migration/backfill pada DB terisolasi; siapkan backup, kompatibilitas app/ops image, dry-run seed, dan rollback sebelum cutover production. Schema v1/kolom legacy baru dipensiunkan setelah pembacaan dan rollback versi lama tidak diperlukan.

Urutan utama: **`BIL-01 → BIL-02 → BIL-03 → BIL-05/BIL-06 → BIL-07 → BIL-08`**. Flashcard dan practice dapat dikerjakan terpisah setelah runtime siap. Verifikasi dilakukan tiap tahap; `BIL-04` tetap ditangguhkan.

## Acuan implementasi

- Ownership dan struktur: [ARCHITECTURE.md](../../ARCHITECTURE.md).
- Kontrak: [syllabus](../api-contract/syllabus.md), [profile](../api-contract/user-profile-and-personalization.md), [flashcards](../api-contract/flashcards.md), [practice](../api-contract/practice.md), dan [base/error](../api-contract/README.md), beserta OpenAPI masing-masing.
- Runtime: [learning activity ERD](../erd/learning-activity.md), [AI integration](../ai-integration.md), [frontend foundations](../frontend/frontend-foundation-patterns.md), serta [migration/seeding](../../drizzle/README.md).
