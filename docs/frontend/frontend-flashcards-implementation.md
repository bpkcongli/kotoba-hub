# Flashcards UI — IMP-14

## Acuan dan cakupan

Implementasi mengikuti [task breakdown](../task-breakdown.md), [architecture](../../ARCHITECTURE.md), [frontend foundation patterns](frontend-foundation-patterns.md), [design system](../../DESIGN_SYSTEM.md), [kontrak flashcards](../api-contract/flashcards.md), [OpenAPI](../api-contract/openapi.flashcards.yaml), dan [engine IMP-07](../erd/learning-activity.md#flashcard-engine-v1-imp-07). Backend `IMP-07` sudah tersedia sebelum UI dikerjakan.

Route `/flashcards` menyediakan katalog deck dan konfigurasi script sebelum sesi dimulai. Route `/flashcards/sessions/[sessionId]` menjalankan pilihan ganda dalam focus mode; `/flashcards/sessions/[sessionId]/summary` menampilkan hasil sesi. Navigasi utama mengaktifkan Flashcards. Guard server `APP_READY` dan guard API yang sudah ada tetap menjadi batas akses.

## State dan kontrak

- Service eksternal menggunakan shared Axios adapter, memvalidasi envelope/DTO, dan mempertahankan error code serta trace ID. Binding service sama pada mode nyata dan MSW.
- MobX store dan child container Inversify dimiliki provider fitur; request dibatalkan dan hasil lama diabaikan saat scope berakhir. Identitas user menentukan scope provider. `FlashcardRouteScope` berada di atas `AppWorkspace` pada ready layout agar pergantian app shell ke focus shell tidak membuat ulang store. Keluar dari subtree flashcards melepas scope.
- Pilihan pasangan script mengikuti keluarga deck `KANA`, `KANJI`, dan `VOCABULARY`. Sesi aktif memakai konfigurasi authoritative dari backend; mengganti pasangan memerlukan sesi baru.
- Submit mengirim ID opsi backend. Setelah kegagalan, retry mempertahankan `itemId`, `selectedOptionId`, dan `responseTimeMs` identik agar replay backend tetap idempotent. Tidak ada grading, perhitungan mastery, atau penjadwalan Leitner di frontend.
- Feedback tetap dekat jawaban, termasuk pada kartu terakhir sebelum summary. Kana memakai feedback ringkas; kanji memuat meaning, onyomi, kunyomi, contoh; vocabulary memuat term, reading, dan meaning. Bucket item dibedakan dari mastery skill.
- `progressImpact = null` dijelaskan sebagai jawaban tersimpan tanpa update mastery syllabus. Tidak ada mastery delta atau due-count yang dibuat dari data yang tidak disediakan kontrak.

## Batas implementasi

Kontrak belum memiliki endpoint GET untuk memuat kembali session dan summary. Snapshot sesi hanya dipertahankan selama provider flashcards masih hidup. Refresh atau deep link tanpa snapshot memberi state sesi tidak tersedia dan CTA kembali ke deck; UI tidak mengklaim resume setelah reload atau membuat sesi pengganti otomatis.

Editor custom deck tidak termasuk `IMP-14`, sesuai [PRD](../../PRD.md). Katalog dapat menampilkan custom deck yang sudah tersedia bagi user. Dashboard progress lengkap tetap `IMP-16`, integrasi lintas flow tetap `IMP-17`, dan E2E backend nyata tetap `TEST-11`.

Snapshot seed `IMP-07` masih memiliki vocabulary pending tanpa mapping skill, sebagaimana dicatat di PRD. Mock development mencakup keluarga dan feedback lain untuk verifikasi UI; fixture tersebut bukan klaim coverage katalog produksi.

## Verifikasi

- `bun run lint`, `bun run typecheck`, `bun run format:check`, dan `bun run build` lulus.
- `bun run test:ci`: **55 suite / 632 test** lulus. Cakupan flashcards ada di `flashcard-store.test.ts`, `flashcard-flow.test.tsx`, dan `flashcard-workspace.test.tsx`; perubahan shell diverifikasi di `app-shell.test.tsx`.
- Store test memakai container baru dan service HTTP asli melalui MSW. Skenario response hilang menjalankan handler yang sudah menyimpan jawaban, mengembalikan kegagalan, lalu memeriksa replay payload/timing identik dan counter yang tidak bertambah dua kali.
- Component test `TEST-07` mencakup seluruh 11 pasangan script valid, pilihan keyboard, fokus prompt/feedback, feedback benar/salah ketiga keluarga, kartu terakhir sebelum summary, null impact, error/retry, akses kedaluwarsa, deep link tanpa snapshot, serta disposal dan isolasi store. Tes transisi workspace mencakup hub → sesi → summary dan keluar/masuk subtree.
- Review independen menemukan dan memverifikasi perbaikan retry katalog serta remount provider pada pergantian shell; tidak ada temuan tersisa.
- Preview browser lokal menggunakan komponen, token CSS/font produksi, service HTTP asli, dan MSW dengan router harness. Setup, question, kanji feedback, dan summary diperiksa pada **375, 768, 1024, 1440px**; setup/question/feedback juga pada **200% ukuran teks** di 375px. Tidak ditemukan overflow horizontal, landmark main ganda, kontrol utama di bawah 44px, atau error JavaScript. Label hasil membungkus ke baris tersendiri; scroll margin menjaga judul feedback di bawah sticky header saat fokus berpindah, termasuk pada teks 200%. Screenshot pemeriksaan berada di `/tmp/kotoba-imp14-preview/` selama workspace ini tersedia.
- Kontras teks secondary pada secondary surface **5.60:1**, teks primary pada putih **15.30:1**, navy pada putih **16.39:1**. Feedback memakai label teks; kebenaran jawaban tidak dibedakan dengan warna saja.

Preview ini tidak membuktikan persistence MySQL atau protected routing end-to-end; integrasi backend nyata/E2E tetap mengikuti `IMP-17` dan `TEST-11`.
