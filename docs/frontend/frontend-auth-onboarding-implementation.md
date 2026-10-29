# Auth dan onboarding UI — IMP-12

## Cakupan

Implementasi mengikuti [architecture](../../ARCHITECTURE.md), [frontend patterns](frontend-foundation-patterns.md), [design system](../../DESIGN_SYSTEM.md), serta kontrak [auth](../api-contract/auth-and-authorization.md), [personalization](../api-contract/user-profile-and-personalization.md), dan [syllabus](../api-contract/syllabus.md).

- Landing memiliki entry ke `/login`. Login memulai Google OAuth melalui form POST browser ke `/api/v1/auth/google/start`; cookie dan redirect tetap ditangani backend/Auth.js.
- Server guard mengarahkan anonymous ke `/login`, learner yang belum onboarding ke `/onboarding`, dan learner yang sudah selesai onboarding dari login/wizard ke `/dashboard`. Return path login divalidasi sebagai relative path aman; login/onboarding tidak dipakai sebagai tujuan berulang untuk learner yang sudah selesai.
- `/onboarding` memakai shell khusus dengan sign out tanpa sidebar/bottom nav. Snapshot session server dihidrasi melalui `AppSessionBootstrap`; shell client menyelaraskan perubahan session tanpa menggantikan guard server/API.
- Wizard memiliki tahap learning preferences, review draft, lalu confirmation. Current level dan target berasal dari track published; current juga menyediakan `BEGINNER`. Nilai profile lama yang tidak lagi tersedia ditandai unavailable dan perlu dikoreksi. Tidak ada asumsi N4 sudah dipublikasikan.
- Assessment menerima daily goal, preferred script, weak focus labels, dan optional note. Catatan kosong dapat diteruskan tanpa AI. Note nonblank memerlukan normalisasi backend; kegagalannya ditampilkan dengan pilihan menghapus note dan mencoba kembali.
- Draft belum menyimpan profile. Learner dapat mengedit assessment atau menghapus suggestion sebelum menekan `Confirm study plan`. Edit membatalkan draft lama. Known skill claims hanya diambil dari suggestion yang direview, bukan label focus atau note mentah.
- Confirmation memakai endpoint terpisah, lalu membaca ulang session sebelum navigasi dashboard. Jika confirmation berhasil tetapi refresh session gagal, state saved tetap dipertahankan dan tersedia retry `Continue to dashboard` tanpa mengirim confirmation lagi.

## State dan dependency

`src/frontend/onboarding` memiliki DTO/schema response Zod, real external API service, MobX store, Inversify feature container, provider/hook, dan komposisi form/review. Store mengimplementasikan shared `IDefaultFormStore` yang kini memiliki consumer, ditambah capability disposal dan operasi wizard. Container mengikuti identity user/session dari shared feature provider. Constructor tidak melakukan fetch; load dimulai oleh feature effect.

Response HTTP divalidasi sebelum menjadi state. Input dan draft dipertahankan saat mutation gagal. Abort/controller identity menolak response lama setelah disposal atau request pengganti. `401` memicu revalidasi shared session; UI tidak memperlakukan semua `403` sebagai onboarding required. Sign out yang gagal mempertahankan input; snapshot baru menjadi anonymous setelah backend mengonfirmasi sign out.

Validasi form memakai `assessmentFormDataSchema` di `services/internal/IOnboardingStore.ts`; tipe `AssessmentFormData` diturunkan dari schema Zod. Private method `createAssessmentFormDataSchema` pada `OnboardingStore` menambahkan pemeriksaan current/target level terhadap katalog published terbaru. Store memanggil `safeParse` dan memetakan issue, termasuk item focus bersarang, ke error field form. Daily goal tetap berupa string pada form, lalu menjadi number saat payload assessment dibuat; validasi tidak mengubah input learner.

Handler `src/mocks/api/onboarding/onboarding.routes.ts` menyediakan profile, published tracks, assessment, dan confirmation. Fixture sengaja memakai satu published N5 track dan mengikuti kontrak; confirmation memperbarui mock profile serta authorization session. Mutable state direset bersama session/handler pada tes. Binding API service identik di mode nyata dan mock.

## Verifikasi dan batas

Tes komponen/store menggunakan service Axios asli melalui MSW, fresh container, serta reset handler dan state. Cakupan mencakup review sebelum confirm, suggestion removal, draft invalidation, failure/retry tanpa kehilangan input, katalog kosong lalu reload gagal, level unpublished, invalid response, field error, session expired, disposal, dan refresh session sebelum dashboard. Tes server page memeriksa guard serta return path login.

Jalankan `bun run check` dan `bun run build`. Pemeriksaan browser lokal memakai halaman login nyata dan preview komponen wizard asli dengan fixture/MSW; ini memeriksa assessment, review, edit, validasi, viewport 375/768/1024/1440, dan pembesaran teks 200%. Preview tidak melewati guard server aplikasi. Flow OAuth Google nyata, persistence MySQL, dan AI live tidak dijalankan pada verifikasi UI ini; E2E terisolasi tetap task `TEST-11`.

Kontrak callback Google yang sudah ada tetap mengembalikan JSON `401`/`422` saat OAuth gagal. Native browser redirect mempertahankan perilaku tersebut. Login menyediakan pesan retry aman untuk entry dengan query `error`; callback belum mengarahkan error kembali ke halaman login. Penyelarasan UX callback memerlukan perubahan kontrak backend tersendiri.
