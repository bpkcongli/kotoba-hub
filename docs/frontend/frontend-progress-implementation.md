# Frontend progress implementation — IMP-16

## Baseline dan keputusan kontrak

Implementasi mengacu pada [task breakdown](../task-breakdown.md), [architecture](../../ARCHITECTURE.md), [frontend foundations](frontend-foundation-patterns.md), [design system](../../DESIGN_SYSTEM.md), [kontrak progress](../api-contract/progress.md), [OpenAPI progress](../api-contract/openapi.progress.yaml), [aturan progress engine](../erd/learning-activity.md#progress-engine-v1-imp-06), serta [sequence progress](../sequence-diagram/update-progress-snapshot.md). Backend `IMP-06`, syllabus `IMP-13`, dan answering flow `IMP-14`/`IMP-15` tersedia sebelum task ini.

Realtime pada MVP berarti event dan snapshot ditulis sebelum response jawaban dikembalikan, kemudian UI membaca ulang read model. Nilai mastery, completion, difficulty, dan understanding tetap berasal dari backend.

Ada batas antara rancangan layar dan kontrak baseline yang perlu dipertahankan:

- Overview mengembalikan jumlah weak skill, tanpa daftar nama atau score per weak skill. UI memakai jumlah resmi dan CTA menuju practice.
- Timeline berisi event jawaban, tanpa snapshot mastery historis. Riwayat aktivitas ditampilkan sesuai event; grafik tren mastery tidak diturunkan dari score jawaban.
- Syllabus tidak mengembalikan state learner per lesson. Status completion dan understanding lesson dibaca melalui endpoint direct `POST /practice/lesson-post-study/next`, yang merupakan pembacaan soal/cue tanpa menyimpan attempt. Pembacaan dibatasi pada unit yang dipilih.
- Ringkasan `trackedLessonsCount` hanya mencakup lesson yang sudah memiliki snapshot. Angka tersebut bukan jumlah seluruh lesson published.
- Reading state belum dipersistensikan. Membuka lesson atau mendapatkan soal tidak berarti learner telah selesai membaca atau menyelesaikan lesson. Label `Reading` tetap menjadi state lokal pada surface baca; level nol hanya membuktikan quiz belum selesai.

Keputusan ini memakai endpoint yang tersedia; tidak menambah kontrak backend atau mengubah aturan completion minimal understanding `1` dan batas review `10`.

## Surface dan ownership

- `/dashboard` menyajikan langkah belajar berikutnya, overview mastery/understanding, weak-skill action, dan recent sessions.
- `/progress` menambahkan pemilihan unit untuk status quiz per lesson dan history jawaban. Filter track berlaku pada overview serta history; filter activity type berlaku pada feed aktivitas.
- Navigasi Progress menjadi aktif pada sidebar desktop dan bottom navigation mobile. Kedua route tetap berada dalam layout server `APP_READY`; endpoint backend tetap memeriksa akses setiap request.
- `src/frontend/progress` memiliki DTO/schema, service HTTP, kontrak dan implementasi store, child container Inversify, provider, hook, helper presentasi, dan komponen progress. Dashboard mengomposisikan fitur progress yang sama.

Store tidak mengambil data di constructor. Hook screen memulai read setelah provider siap, membaca ulang saat screen dipasang atau browser kembali aktif, dan membatalkan request saat scope dibersihkan. Setiap request memiliki identitas sehingga response lama tidak menimpa filter atau hasil terbaru. Container mengikuti identitas session dan scope screen; state tidak dibagikan antar-user melalui singleton server.

Overview, feed session, history jawaban, dan selected-unit status memiliki loading/error state terpisah. Data lama yang dipertahankan saat refresh gagal diberi penanda belum diperbarui. Filter baru tidak menampilkan hasil dari filter sebelumnya. Session dengan status `UNKNOWN` tetap ditampilkan sebagai status belum tersedia; satu jawaban tidak menyiratkan sesi selesai. Riwayat track yang sudah tidak published tetap dapat dipilih tanpa menawarkan unit dari track lain.

Status per unit menampilkan jumlah lesson completed dan quiz required, understanding `0..10`, difficulty quiz/review berikutnya, serta CTA membaca lesson atau membuka quiz. Pembacaan quiz dibatasi maksimal tiga request serentak. Ringkasan flashcard/practice dan feedback quiz lesson menyediakan tautan `View progress` untuk membaca hasil yang telah tersimpan.

Service memakai adapter Axios dan validasi envelope/DTO Zod. MSW mengintersep request HTTP dengan binding service yang sama seperti produksi. Mock activity dan overview adalah fixture development/test, bukan bukti persistence MySQL atau evaluasi provider AI.

Mock progress menerima projection hasil jawaban flashcard yang memiliki skill, random practice, dan direct quiz. Jalur retry memakai hasil yang tersimpan sebelum menambah event baru. State koleksi dipisah berdasarkan user dan direset bersama handler pada setiap tes; flashcard tanpa mapping skill tidak membuat progress resmi.

## Verifikasi

- `bun run check`: lint, typecheck, Prettier, serta **60 suite / 661 tes** lulus. Setelah penyempurnaan copy dan ringkasan unit terakhir, typecheck, scoped lint/format, serta **12 tes progress** dijalankan ulang dan lulus.
- `bun run build` lulus, termasuk route protected `/progress` dan komposisi dashboard terbaru.
- Dua suite baru, `tests/component/progress-store.test.ts` dan `tests/component/progress-flow.test.tsx`, memakai service asli melalui MSW: completion terpisah dari mastery, write-through direct quiz dan replay idempotent, pagination/filter, kegagalan refresh/retry, validasi DTO, respons lama, disposal, focus refresh, session expired, dan historical track.
- Review independen memeriksa kontrak, lifecycle store/provider, filter, state stale/error/auth, serta projection mock; tidak ada temuan tersisa. `git diff --check` lulus.
- Preview browser memakai komponen, CSS token, adapter HTTP, serta MSW asli dengan router harness lokal. Empty state, quiz level nol, dan progress setelah jawaban benar diperiksa pada **375, 768, 1024, dan 1440px**, serta **200% ukuran teks pada 375px**. State error `500` dan session expired diperiksa pada 375/1440px. Tidak ada overflow horizontal, main landmark ganda, tombol/select di bawah 44px, atau error JavaScript. Screenshot berada di `/tmp/kotoba-imp16-preview/` selama workspace tersedia.
- Kontras foreground utama dan helper text terhadap surface yang dipakai lulus pemeriksaan skill UI (minimal `4.5:1`); focus select memakai utility focus proyek.

Pengujian ini tidak menjalankan OAuth, AI provider, atau persistence MySQL live. Integrasi seluruh perjalanan dengan backend/persistence nyata tetap mengikuti `IMP-17` dan task integration/E2E terkait.
