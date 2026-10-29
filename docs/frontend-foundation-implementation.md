# Implementasi fondasi FE — IMP-11

## Cakupan

Implementasi mengikuti [architecture](../ARCHITECTURE.md), [pattern fondasi](frontend-foundation-patterns.md), [design system](../DESIGN_SYSTEM.md), serta kontrak [API base](api-contract/README.md) dan [auth](api-contract/auth-and-authorization.md).

- Shared shell public/onboarding/app/focus, header, sidebar, bottom nav, footer opsional, account disclosure, dan state loading/empty/error.
- Primitive `Button`, `Card`, `Badge`, `Progress`, dan `Skeleton` dengan semantic token proyek.
- Adapter Axios, exception FE, session response validation, real session API service, serta shared session store MobX.
- Root dan feature container Inversify, provider/hook, plain server session DTO bootstrap, serta MSW auth handlers dengan state terisolasi.
- Public entry memakai shared shell. `/dashboard` adalah entry area belajar yang dijaga server dan menunjukkan ketersediaan fitur tanpa membuat angka progress atau recommendation fiktif.

Login/onboarding wizard, syllabus, flashcards, practice, progress dashboard, dan settings belum menjadi flow UI lengkap dalam task ini. Lima tujuan navigasi utama dipertahankan; selain Dashboard, tujuan yang belum tersedia ditandai unavailable dan tidak menjadi link rusak. Settings tersedia sebagai label sekunder yang belum aktif. `/onboarding` tetap menjadi target guard untuk learner yang belum selesai onboarding; halaman tersebut dikerjakan pada `IMP-12`. Visitor anonymous kembali ke `/` sampai login entry tersedia.

## Provider, bootstrap, dan lifetime

`src/app/providers.tsx` memasang `MockProvider` di luar `FrontendContainerProvider`, sehingga initial request store menunggu startup worker pada development mocking. Root provider memiliki satu container stabil dari `createFrontendContainer`; saat SSR, instance dibentuk per render dan tidak disimpan sebagai singleton module. Konfigurasi hanya membawa public API base path, timeout, dan optional DTO bootstrap.

Root mengikat `HttpClient`, `IAppSessionService`, dan `IAppSessionStore` lewat `SHARED_TYPES`. Store menerima real API service melalui constructor. `useAppSessionStore()` dan `useFrontendContainer()` resolve dari context provider. Session `null` berarti belum diketahui; snapshot `ANONYMOUS` adalah hasil terkonfirmasi dari endpoint. Error refresh tidak otomatis mengubah user menjadi anonymous. Sign-out baru menghapus snapshot user ketika backend mengonfirmasi sukses; kegagalan tetap menampilkan session dan inline error.

Ready layout membaca session melalui backend dan memetakan hasil menjadi `SessionResponseDto` sebelum melewati RSC. `AppSessionBootstrap` menghidrasi root store, membatalkan initial request yang lebih lama, dan menahan subtree sampai bootstrap diterapkan. Gate tidak terus membandingkan identity dengan prop server: revalidasi atau logout berikutnya harus tetap dapat memperbarui tampilan. `AppWorkspace` menyembunyikan konten protected saat access berubah dan menyelaraskan navigasi; guard server/API tetap otoritas akses.

Fitur berikutnya memakai `FeatureContainerProvider` dengan `scopeKey` yang mengikuti identitas flow, misalnya session ID. Factory domain menerima `FeatureContainerOptions`, membuat child container, lalu mengikat external service dan internal store domain. Factory diberi referensi stabil, bukan inline function yang berubah setiap render. Scope otomatis berganti ketika user/session identity berubah. Binding store yang memiliki side effect mendaftarkan deactivation `dispose`; effect fitur juga menghentikan resource yang dimilikinya. Cleanup scope memakai `unbindAllAsync()` dan menghindari penghancuran binding selama replay effect Strict Mode.

MobX yang terpasang adalah v7: anotasi eksplisit menggunakan named export `observableRef` dan `actionBound`, sesuai API package yang terpasang. Jangan menyalin namespace annotation versi lama. State hasil async diperbarui melalui action/`runInAction`; service dan abort controller tidak dijadikan observable. Capability yang sudah dikonsumsi session store adalah `IHydratableStore` dan `IDisposableStore`. Kontrak form/list/modal tetap panduan untuk task fitur yang membutuhkannya.

## HTTP dan MSW

`shared/adapters/http-client` mengembalikan HTTP status dan body `unknown`; `AppSessionService` memvalidasi status/envelope/data dengan Zod sebelum mengembalikan DTO. Cookie session tetap milik browser; adapter tidak membaca cookie HttpOnly, menambahkan secret, melakukan redirect, atau otomatis retry mutation. Normalisasi mempertahankan API code, trace ID, serta field errors; network/timeout/cancelled dibedakan. Presenter menghasilkan plain `StoreError` dengan pesan aman untuk UI.

Normalisasi dilakukan oleh `normalizeHttpError` di `shared/adapters/http-client/helpers`; dependency Axios tetap berada pada adapter tersebut. Store mengimpor `presentError` dari `shared/helpers` untuk pemetaan exception ke `StoreError`. `shared/exceptions` mengekspor class exception dan tipe pendukung, tanpa fungsi normalisasi/presenter. Kedua folder helper memiliki barrel `index.ts`; barrel shared helper juga mengekspor `cn`.

Referensi module lokal `./...` pada kode IMP-11 tetap relatif, termasuk barrel export. Referensi yang sebelumnya naik folder melalui `../...` memakai alias absolut `@/` ke `src/`. Fixture tes di luar `src/` diimpor melalui `@tests/`; mapping tersebut didefinisikan di `tsconfig.json` dan `jest.config.cjs`. Contoh import normalisasi: `import { normalizeHttpError } from '@/frontend/shared/adapters/http-client/helpers';`, sementara import root provider tetap `import { Providers } from './providers';`.

Handler `src/mocks/api/auth/auth.routes.ts` menyediakan session read dan sign-out. Fixture anonymous/onboarding/app-ready berada di `src/mocks/fixtures/session.ts`, dengan `setMockSession` dan reset state di `src/mocks/states/session.ts`. Mode mock tetap memakai binding Axios/API service yang sama. Default scenario anonymous tidak memberi akses ke route server protected; browser MSW tidak melewati server guard atau mengintersep query backend langsung. OAuth redirect tidak diimplementasikan sebagai JSON mock.

Untuk development, set `NEXT_PUBLIC_API_MOCKING=true` dan restart `bun run dev`. Production tidak memulai worker. Skenario state test direset bersama handler setelah setiap test; unmatched application API menjadi kegagalan yang terlihat.

## Layout dan batas komponen

`shared/components/layouts/index.ts` mengekspor layout presentasional yang aman dirangkai server; `layouts/client.ts` mengekspor `AppWorkspace` yang memakai hooks/session. Public export primitive dan state panel berada di folder pemiliknya. Komponen feature tidak membuat `<main>` kedua karena shell memiliki skip link dan main region.

Pada `0–1023px`, shell app memakai topbar dan bottom nav dengan safe-area serta ruang konten bawah. Mulai `1024px`, sidebar dan topbar dipakai. Onboarding tidak menampilkan navigasi belajar penuh. `FocusModeShell` menerima slot exit dan progress dari pemilik flow; shell tidak menghitung nilai progress atau mengasumsikan endpoint pause tersedia.

Helper `cn` tetap dipakai. Formatter date/currency/duration tidak dibuat tanpa consumer. Semua grading, mastery, lesson understanding/completion, dan recommendation tetap authoritative dari backend.

## Verifikasi

Jalankan `bun run check` untuk lint, route/TypeScript, formatting, dan seluruh Jest suite; `bun run build` memeriksa bundling production. Fokus regresi IMP-11 ada di `tests/component/app-shell.test.tsx`, `http-client.test.ts`, `app-session.test.ts`, `frontend-providers.test.tsx`, dan `mock-provider.test.tsx`, ditambah test startup MSW yang sudah ada.

Pengujian FE menggunakan real API service/Axios melalui MSW. Skenario penting mencakup unknown/anonymous/bootstrap, invalid envelope, failure metadata, request cancellation/stale result, sign-out gagal/sukses, isolasi container, pergantian feature scope, startup gate, dan semantic shell. Pemeriksaan browser atas protected shell dapat memakai render komponen dengan fixture terpisah; fixture tersebut tidak membuktikan login OAuth atau persistence backend. Flow end-to-end tersebut tetap mengikuti task FE/integrasi berikutnya.
