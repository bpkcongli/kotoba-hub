# Practice UI — IMP-15

## Acuan dan cakupan

Implementasi mengikuti [task breakdown](../task-breakdown.md), [architecture](../../ARCHITECTURE.md), [frontend foundations](frontend-foundation-patterns.md), [design system](../../DESIGN_SYSTEM.md), [kontrak practice](../api-contract/practice.md), [OpenAPI](../api-contract/openapi.practice.yaml), [engine IMP-09](../practice-engine.md), serta [sequence practice](../sequence-diagram/random-question-generator-and-answer-evaluation.md) dan [progress](../sequence-diagram/update-progress-snapshot.md). Backend `IMP-09` dan handoff lesson `IMP-13` sudah tersedia sebelum task ini.

- `/practice` memulai random practice dengan jumlah soal `1..10`, default lima. Difficulty dan question mix berasal dari session yang dikembalikan backend.
- `/practice/sessions/[sessionId]` menjalankan satu soal aktif dengan difficulty question terpilih, input, submit, dan feedback inline. Feedback soal terakhir tetap ditampilkan sebelum learner membuka `/practice/sessions/[sessionId]/summary`.
- `/syllabus/lessons/[lessonSlug]/post-study` menggantikan placeholder handoff dengan quiz deterministik satu soal. Flow ini memakai endpoint direct; tidak membuat random practice session.
- Route berada di layout server `APP_READY`; otorisasi setiap request tetap di backend. Navigasi Practice kini tersedia. Fokus session dan quiz lesson memakai satu main landmark tanpa navigasi utama.

## Input, state, dan retry

Domain practice memiliki DTO/schema response, service HTTP melalui adapter Axios, store MobX, child container Inversify, provider, dan hook. Binding service sama pada backend nyata dan MSW. Store dimiliki scope fitur/user; request dibatalkan dan hasil lama diabaikan saat scope berakhir. Provider random practice berada di atas `AppWorkspace` agar berpindah dari hub ke focus shell atau summary tidak menghapus session.

Keempat tipe soal dirender sesuai payload backend:

- `SHORT_FREE_RESPONSE`: satu slot kosong dengan input romaji/Jepang dan bentuk Jepang final yang dapat diedit.
- `SLOT_FILL`: empat opsi Jepang dengan radio keyboard-accessible.
- `ARRANGE_TOKEN`: token bank dan answer order; tombol menambah atau melepas token tanpa drag wajib. Arah bahasa mengikuti question.
- `FREE_RESPONSE`: prompt English, textarea jawaban, dan penjelasan bahwa feedback memakai AI.

Konversi romaji memakai `wanakana`; learner melihat bentuk final sebelum submit. Input Jepang/katakana dan hasil IME kanji dipertahankan. Payload membawa input mentah, bentuk Jepang final, dan `normalizedKanji` jika ada kanji. Submit menunggu composition selesai dan konversi romaji lengkap. Frontend tidak menghitung grade, mastery, atau kenaikan understanding.

Setelah submit dimulai, payload dan `responseTimeMs` dikunci sampai hasil terkonfirmasi. Retry random memakai payload identik. Direct quiz membuat UUID `Idempotency-Key` sekali per attempt dan menggunakannya kembali pada kegagalan atau respons hilang, termasuk jawaban salah dan review level sepuluh. Attempt baru setelah feedback memakai key baru. Error target lesson yang sudah kedaluwarsa menyediakan aksi mengambil soal terbaru; kegagalan jaringan/response ambigu tetap mengulang attempt yang sama.

## Hasil dan pemahaman lesson

Feedback menampilkan benar/salah, score, penjelasan backend, sumber grading, serta mastery skill jika `progressImpact` tersedia. Nilai `null` dijelaskan sebagai jawaban tersimpan tanpa pembaruan mastery yang dikembalikan. Summary mengagregasi hasil answer session yang sudah dikonfirmasi dan memberi CTA practice ulang atau review syllabus; tidak mengarang progress atau weak-skill snapshot.

Quiz lesson menampilkan difficulty terpilih dan understanding `0..10` dari `/next`. Hasil answer menampilkan transisi sebelum/sesudah, `postStudyQuizCompleted`, dan next review difficulty dari backend. Completion hanya ditampilkan sesuai response authoritative. Jawaban salah pada level nol tetap `Quiz required`; review pada level sepuluh tetap tersedia. CTA review mengambil ulang soal authoritative sebelum attempt baru.

## Batas implementasi

Kontrak random practice belum memiliki GET session/summary. Snapshot hanya bertahan selama provider practice hidup. Refresh/deep link tanpa snapshot menawarkan kembali ke hub, tanpa mengklaim resume atau membuat session otomatis. Jawaban yang telah disimpan backend tetap menjadi bagian histori learner.

MSW memakai fixture development untuk seluruh tipe soal, ownership session, retry receipt, dan understanding per user. Contoh tersebut bukan bank soal canonical atau klaim coverage katalog produksi. Direct fixture sengaja sederhana untuk memverifikasi flow UI.

Dashboard progress lintas layar tetap `IMP-16`; integrasi backend nyata seluruh perjalanan tetap `IMP-17`/`TEST-11`. Verifikasi UI menggunakan API service asli yang diintersep MSW, tanpa OAuth, MySQL, atau model AI live.

## Verifikasi

Verifikasi pada 30 Oktober 2026:

- `bun run check` lulus: lint, typecheck, format, serta **58 suite / 649 tes**. Tiga suite practice baru berisi **17 tes**. Gate terarah bersama syllabus dan app shell mencakup **5 suite / 29 tes**.
- `bun run build` lulus, termasuk route practice baru dan direct quiz lesson.
- `TEST-08` mencakup empat tipe soal, payload input final, keyboard/IME/kanji, feedback terakhir sebelum summary, wrong-answer summary, null impact, auth/error/deep link, receipt replay setelah jawaban benar maupun salah, cap level sepuluh, stale target, disposal/isolation, dan pergantian shell. Service Axios asli diintersep MSW; tidak ada class mock service.
- Review independen menemukan dan memverifikasi dua perbaikan: generasi yang dibatalkan tidak boleh memicu navigasi terlambat, dan konflik target quiz harus memberi aksi mengambil soal terbaru. Tidak ada temuan terbuka. Regresi auth recovery setelah scope berubah juga diperbaiki dan dites.
- Preview browser lokal memakai komponen, CSS token, service HTTP, dan MSW asli dengan router harness. Hub, keempat tipe soal, feedback, summary, quiz lesson, serta review diperiksa pada **375, 768, 1024, dan 1440px**; seluruh flow juga pada **200% ukuran teks di 375px**. Tidak ada overflow horizontal, main landmark ganda, kontrol utama di bawah 44px, atau error JavaScript. Fokus prompt/feedback tetap terlihat di bawah sticky header setelah perbaikan scroll margin. Screenshot tersedia di `/tmp/kotoba-imp15-preview/` selama workspace ini tersedia.
- Kontras teks secondary pada secondary surface **5.60:1**, teks primary pada putih **15.30:1**, serta putih pada navy **16.39:1**. Feedback memakai label teks dan score.

Preview ini tidak menggantikan verifikasi routing protected atau persistence backend end-to-end.
