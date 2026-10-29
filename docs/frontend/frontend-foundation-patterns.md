# Frontend foundation patterns

## Status dan cakupan

Baseline pattern untuk `IMP-11` dan consumer `IMP-12`–`IMP-17`. Fondasi runtime HTTP/session/DI, shared shell, dan primitive P0 sudah diimplementasikan; panduan penggunaan dan batas cakupan ada di [implementasi fondasi FE](frontend-foundation-implementation.md). Axios ditambahkan melalui Bun beserta lockfile. Snippet skill tetap berupa contoh adaptasi, bukan daftar class yang wajib dibuat: interface form/list/modal dan formatter baru ditambahkan ketika fitur memiliki consumer nyata.

Acuan: [architecture](../../ARCHITECTURE.md), [API base](../api-contract/README.md), [auth](../api-contract/auth-and-authorization.md), [personalization](../api-contract/user-profile-and-personalization.md), [progress](../api-contract/progress.md), [design system](../../DESIGN_SYSTEM.md), [responsive rules](../system-design/responsive-layout-rules.md), dan [page inventory](../system-design/information-architecture-and-page-inventory.md). Panduan agent: [kotoba-frontend-foundations](../../.agents/skills/kotoba-frontend-foundations/SKILL.md).

## Penempatan

| Concern                               | Target path di `src/frontend`                                               |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Interface store reusable              | `shared/interfaces/stores/`                                                 |
| Root options dan bootstrap DTO        | `shared/interfaces/FrontendContainerOptions.ts`, `FrontendBootstrapData.ts` |
| Feature container options             | `shared/interfaces/FeatureContainerOptions.ts`                              |
| HTTP contract                         | `shared/adapters/http-client/HttpClient.ts`                                 |
| Axios implementation                  | `shared/adapters/http-client/impl/AxiosHttpClient.ts`                       |
| Class exception FE dan tipe pendukung | `shared/exceptions/`                                                        |
| Normalisasi error HTTP/Axios          | `shared/adapters/http-client/helpers/normalize-http-error.ts`               |
| Presenter error untuk store/UI        | `shared/helpers/present-error.ts`                                           |
| Shell                                 | `shared/components/layouts/`                                                |
| Formatter lintas fitur                | `shared/helpers/`                                                           |
| Interface dan class store fitur       | `<domain>/services/internal/I<Feature>Store.ts`, `impl/<Feature>Store.ts`   |

Folder dibuat saat dibutuhkan. Public API folder yang terisi diekspor melalui `index.ts`/`index.tsx`, dengan entry point server/client terpisah. Exception/entity backend tidak diimpor ke client.

Import dan re-export lokal `./...` dipertahankan, misalnya `./providers` atau `./button`. Referensi yang naik folder melalui `../...` menggunakan alias `@/` ke `src/`; tes fondasi menggunakan `@tests/` ke `tests/` untuk fixture/helper tes. Mapping tersedia pada TypeScript dan Jest; barrel export tetap mengarah ke file pemiliknya agar tidak menciptakan self-import atau menggabungkan entry point server/client.

## General interfaces: pilih berdasarkan capability

Interface menyatakan state/action yang digunakan, bukan superclass wajib. Shared contract tidak mengandung endpoint, router, toast, komponen UI, atau aturan grading. State dapat `readonly` pada interface; perubahan melalui action class.

| Contract                            | Kapan dipakai                                                      | Isi pokok                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| `IDefaultFormStore<TForm, TResult>` | Form dengan validasi dan submit async, misalnya assessment         | `formData`, `formErrors`, `isSubmitting`, `error`, `result`, `setFormData`, `validateFormData`, `submit`              |
| `IDefaultListStore<TItem>`          | Koleksi dengan pagination server, misalnya progress timeline/decks | `items`, `totalCount`, `currentPage`, `rowsPerPage`, `isLoading`, `error`, `load`, `setCurrentPage`, `setRowsPerPage` |
| `IDefaultModalStore<TPayload>`      | Dialog yang state-nya dibagi dalam flow                            | `isOpen`, `payload`, `open`, `close`; tanpa fetch/submit wajib                                                        |
| `IHydratableStore<TSnapshot>`       | Store menerima plain bootstrap snapshot                            | `hydrate(snapshot): void`, sinkron dan tanpa HTTP                                                                     |
| `IDisposableStore`                  | Store memiliki request, reaction, subscription                     | `dispose(): void`, cleanup idempotent                                                                                 |

Contoh masing-masing tersedia di [store patterns](../../.agents/skills/kotoba-frontend-foundations/references/store-patterns.md). Dua capability tambahan tersebut tidak wajib untuk semua store. Mode create/view/edit dan step/review/confirmation wizard ditambahkan pada interface domain bila diperlukan. Dialog form dapat mengomposisikan interface modal dan form.

Dashboard aggregate, syllabus tree, session store global, dan flashcard/practice answering loop biasanya memerlukan interface khusus. Current question bukan pagination. Validasi FE membantu input; backend tetap memvalidasi payload, katalog, akses, dan learning rules. Assessment draft belum berarti profil tersimpan; konfirmasi final adalah operasi terpisah.

List memakai halaman UI berbasis `1`, dengan query `offset = (currentPage - 1) * rowsPerPage`, `limit = rowsPerPage`. Batas mengikuti kontrak: safe integer offset, limit `1..100`. `totalCount` berasal dari `metadata.pagination.totalRecords`. Ganti page size/filter mengembalikan halaman ke `1`. Search/sort/filter hanya ditambahkan bila endpoint mendukungnya. Respons lama tidak boleh mengganti hasil query terbaru. Data lama yang ditahan saat refresh gagal harus ditandai belum diperbarui di UI.

Store menggunakan constructor injection, MobX action/computed, dan `runInAction` setelah `await`; dependency, controller abort, dan disposer bukan observable. Constructor tidak fetch. Pemilik lifecycle memulai load setelah `MockProvider` siap dan membersihkan resource ketika scope ditinggalkan. Cleanup aman pada setup/cleanup effect berulang di development. Abort mutation menghentikan penantian client, bukan menjamin rollback backend; retry harus mempertimbangkan kontrak idempotency operasi tersebut.

## RootContainerParams dan scope DI

Kebutuhan root params diwujudkan melalui nama canonical `FrontendContainerOptions` dari architecture. Contoh wiring: [container options](../../.agents/skills/kotoba-frontend-foundations/references/store-patterns.md#container-options-dan-constructor-injection).

- `FrontendContainerOptions`: konfigurasi public HTTP (`apiBasePath` literal `/api/v1`, timeout positif) dan `bootstrap?: FrontendBootstrapData`. Hindari generic env map yang dapat membawa secret.
- `FrontendBootstrapData`: plain DTO session yang diizinkan API serta display locale/timezone bila diperlukan. Bedakan session belum diketahui dari snapshot `ANONYMOUS`.
- `FeatureContainerOptions`: `{ parentContainer: Container }`, hanya dipakai wiring client. Identitas sesi yang diperlukan merupakan opsi domain.
- Root factory mengikat HTTP adapter dan app-session store; child factory mengikat external service dan internal store domain. Singleton store berlaku di scope provider pemiliknya; root tidak mengikat semua learning session secara global.
- Mock/real memakai binding external service yang sama. Flag public mocking hanya mengendalikan startup MSW pada development, bukan pilihan class mock dalam domain container.
- Provider menjaga instance stabil. Feature container dibentuk ulang saat identity session berubah; logout/pergantian user membuang state user, request, dan subscription. Cleanup effect yang memakai ulang instance harus membolehkan load berikutnya dan tetap menolak hasil request sebelumnya.

## Axios dan general exceptions

HTTP contract tidak mengekspos tipe Axios. Request memiliki method, path relatif, query typed, body, headers bila diperlukan, dan `AbortSignal`. Response transport mempertahankan HTTP status dan body `unknown`; external service memvalidasi envelope `status`/`data`/`metadata` dan DTO endpoint. Generic TypeScript saja tidak memvalidasi JSON.

Gunakan instance `axios.create` per root container dengan base path `/api/v1`, session cookie, dan timeout terbatas yang dikonfigurasi. Request/response adalah variabel lokal method agar request paralel tidak berbagi mutable state. Browser tidak menerima API secret atau membaca cookie HttpOnly. POST same-origin membiarkan browser mengirim `Origin`. Server guard/API tetap memegang otorisasi.

| Exception FE                           | Semantik                                                                                                   |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `BaseException`                        | Dasar error dengan pesan aman dan `cause: unknown` untuk diagnosis lokal                                   |
| `ApiException`                         | Response HTTP gagal, termasuk `4xx`; menyimpan `httpStatus`, application `code`, `traceId`, `errorDetails` |
| `ServerException extends ApiException` | Response HTTP `5xx`, mempertahankan metadata yang sama                                                     |
| `ClientException`                      | Network, timeout, cancelled, konfigurasi, atau response tidak sesuai kontrak; bukan sinonim HTTP `4xx`     |

Normalisasi error dilakukan sekali: adapter memetakan transport/HTTP; external service memvalidasi body sukses dan memetakan DTO. Exception yang sudah ternormalisasi diteruskan. Cancellation saat cleanup/query diganti tidak ditampilkan sebagai kegagalan. Pesan tidak dikenal/non-JSON memakai fallback English yang aman; raw response/stack/config request tidak dirender. Shared presenter menghasilkan plain `StoreError`, mempertahankan code/traceId/detail tanpa menyimpan AxiosError pada observable atau bootstrap props.

`normalizeHttpError` dimiliki `shared/adapters/http-client/helpers` karena mengenali Axios dan envelope HTTP. `presentError` dimiliki `shared/helpers` karena memetakan exception FE menjadi UI model tanpa dependency transport. Folder `shared/exceptions` hanya memuat class exception dan tipe pendukung. Export kedua fungsi melalui `index.ts` folder helper masing-masing; consumer tidak mengimpornya dari barrel exception.

External service menggunakan shared `readHttpResponse(response, schema, expectedHttpStatus = 200)` dari `shared/adapters/http-client/helpers` untuk memeriksa status HTTP dan memvalidasi body dengan schema Zod. Helper mengembalikan hasil parse penuh agar metadata pagination tetap tersedia; schema envelope dan pemetaan DTO tetap ditentukan service endpoint. Status yang tidak sesuai atau body invalid menghasilkan `ClientException('contract')` dengan pesan aman. Kegagalan transport/HTTP dari adapter tetap diteruskan tanpa normalisasi ulang.

`422` dipetakan hanya ke field form yang dikenal; detail lintas field masuk inline summary. `401` memicu revalidasi melalui pemilik session flow; `403` diperiksa berdasarkan code/authorization snapshot, tidak selalu onboarding. Adapter tidak redirect/logout/toast. Google start/callback memakai browser navigation/form POST karena endpoint mengembalikan redirect OAuth.

API code sembilan digit adalah identifier terpisah dari HTTP status; success tidak selalu `120000000`. Koleksi diambil dari key endpoint, misalnya `data.progressEvents`, dan metadata tetap tersedia. Success tanpa `data` seperti sign-out tidak dibuatkan payload fiktif. Retry mutation mengikuti kontrak idempotency, terutama jawaban dan direct quiz.

Rincian: [Axios dan exceptions](../../.agents/skills/kotoba-frontend-foundations/references/http-and-exceptions.md). Penggunaan instance, error, dan cancellation mengacu pada [Axios instance](https://axios-http.com/docs/instance), [error handling](https://axios-http.com/docs/handling_errors), dan [AbortController](https://axios-http.com/docs/cancellation).

## General layout components

`shared/components/layouts` memiliki `AppHeader`, `AppSidebar`, `AppBottomNav`, `AppFooter`, dan komposisi `AppShell` sebagai padanan fungsi wrapper `AppHOC`. Utamakan composition `children`/slots dan satu wrapper. Route/layout server memilih shell public, onboarding, regular app, atau focus session. Provider DI/MSW bukan tanggung jawab visual shell.

Ikuti [responsive rules](../system-design/responsive-layout-rules.md): topbar + bottom nav pada `0–1023px`, sidebar + topbar mulai `1024px`, onboarding tanpa navigasi belajar penuh, dan focus mode yang tetap menyediakan exit. `AppFooter` opsional bila ada konten berguna. Sidebar dan bottom nav memakai konfigurasi typed yang sama; Settings adalah tujuan sekunder.

Shell memegang chrome, slot judul/breadcrumb/action, dan landmark aksesibilitas. Soal, assessment, feedback, mastery, dan session controls dimiliki fitur. Auth guard berlangsung server-side dan di API; wrapper client hanya menyelaraskan tampilan session. Rincian: [shell dan helpers](../../.agents/skills/kotoba-frontend-foundations/references/shell-and-helpers.md).

## General helpers

Gunakan fungsi murni bernama dengan input/output typed. `cn` yang sudah ada dipertahankan. Formatter menerima locale/timezone eksplisit agar SSR/hydration konsisten; English adalah default bahasa UI. Jangan menebak timezone learner dari environment build.

Prioritas MVP: `formatDate`, `formatDateTime`, `formatNumber`, `formatPercent`, dan `formatDuration` bila ada consumer. Date-only `YYYY-MM-DD` adalah tanggal kalender tanpa pergeseran zona waktu; timestamp mengikuti offset/UTC kontrak dan timezone display eksplisit. Nilai invalid/missing memakai fallback konsisten; angka `0` tetap valid. Unit persen/durasi jelas pada signature. Helper tidak menghitung mastery, completion, atau normalisasi jawaban.

String helper harus aman untuk teks Jepang; jangan menghapus non-ASCII atau mengubah jawaban user demi tampilan. Gunakan CSS untuk truncation visual. Currency belum diperlukan MVP; tambahkan `formatCurrency(value, { locale, currency })` hanya bila ada consumer nyata, dengan ISO currency eksplisit tanpa default IDR. Contoh: [shell dan helpers](../../.agents/skills/kotoba-frontend-foundations/references/shell-and-helpers.md).
