# KotobaHub Architecture

## Status dan otoritas

Dokumen ini adalah acuan final untuk **struktur folder BE/FE, frontend store, frontend dependency injection, dan mock API FE**. Dokumen ini menyelaraskan `ARCH-02` dengan penggunaan **MobX dan Inversify** untuk FE serta **MSW** untuk intersepsi HTTP pada development/testing. Struktur di sini menggantikan definisi folder sebelumnya pada [architecture foundation](docs/architecture-foundation.md); dokumen tersebut tetap menjadi acuan bounded context, ownership data, dan alur bisnis.

Sebelum implementasi, baca [task breakdown](docs/task-breakdown.md) dan referensi task terkait. Kontrak HTTP mengikuti [API contract](docs/api-contract/), persistence mengikuti [ERD](docs/erd/), dan UI mengikuti [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md). Tree berikut adalah target implementasi; folder dibuat saat ada kebutuhan konkret pada task terkait.

## 1. Struktur proyek

KotobaHub adalah satu aplikasi Next.js fullstack dengan App Router. Routing, backend, frontend, dan seed content memiliki batas terpisah.

```text
kotoba-hub/
  src/
    app/
      (public)/
      (auth)/
      (app)/
      api/v1/
      layout.tsx
      providers.tsx
      globals.css
    backend/
      shared/
      auth/
      users/
      syllabus/
      flashcards/
      practice/
      progress/
      personalization/
    frontend/
      shared/
      auth/
      onboarding/
      dashboard/
      syllabus/
      flashcards/
      practice/
      progress/
      settings/
    mocks/
      api/
      fixtures/
      states/
      main.ts
      msw.router.ts
      msw.browser.ts
      msw.node.ts
  public/
    mockServiceWorker.js    # worker MSW hasil generate saat bootstrap
  content/
    syllabus/
    flashcards/
  drizzle/
  scripts/
  tests/
    unit/
    component/
    integration/
    e2e/
    fixtures/
  docs/
  ARCHITECTURE.md
  PRD.md
  DESIGN_SYSTEM.md
  AGENTS.md
```

| Area | Tanggung jawab |
| --- | --- |
| `src/app` | Route, layout, metadata, loading/error boundary, serta transport HTTP tipis. |
| `src/backend` | Business rules, use case, persistence adapter, auth dan AI integration. |
| `src/frontend` | Feature UI, MobX store, API service, DI, hooks, dan komponen. |
| `src/mocks` | Handler HTTP MSW, fixture, state skenario, serta bootstrap browser dan Node untuk development/testing. |
| `content` | Seed syllabus/deck canonical yang sudah ada di repo; importer server membaca artefak ini. |
| `drizzle` | SQL migration dan metadata yang dihasilkan workflow Drizzle. |
| `tests` | Pengujian unit, component, integration, E2E dan fixture terisolasi. |

Seed canonical tetap di root `content/`. Kode loader/importer berada di backend; hindari katalog seed kedua di `src/content` yang dapat menyimpang dari artefak canonical.

## 2. Backend

### Module template

Setiap bounded context memiliki struktur berikut. `shared` memuat common kernel dan technical contracts lintas context.

```text
src/backend/<context>/
  domain/
    aggregates/
    entities/
    value-objects/
    exceptions/
    repositories/          # interface repository
    services/              # aturan domain
    events/
  application/
    commands/
    queries/
    ports/                 # kontrak dependency keluar/lintas context
    services/
      requests/
      responses/
  interface/
    primary/
      rest/                # controller, DTO validation, response mapper
      jobs/                # dibuat bila task background membutuhkannya
    secondary/
      persistence/         # implementasi repository dengan Drizzle
      ai/                  # implementasi AI provider port
      events/
  infrastructure/
    config/
    database/              # schema milik context
    di/
      index.ts             # composition/wiring use case dan adapter
    logging/
```

### Layer dan ownership

- `domain` menjaga aturan bisnis murni. Domain bergantung pada interface dan value object, serta dapat diuji tanpa Next.js, MySQL, atau provider AI.
- Custom exception milik suatu context beserta tipe detailnya berada di `domain/exceptions`. Use case dan transport adapter mengimpor definisi exception dari domain pemiliknya.
- Model DDD yang memiliki identitas atau invariant memakai class untuk entity, aggregate, dan value object. Domain service, application service, serta implementasi repository juga memakai class; repository contract dan application port tetap berupa interface. DTO HTTP, schema Drizzle, dan data serializable lintas batas server/client tetap plain type/object.
- Kontrak persistence bernama `<Entity>Repository` dan berada di `domain/repositories/<entity>.repository.ts`, tanpa suffix `Port`. Implementasi Drizzle bernama `Drizzle<Entity>Repository` dan berada di `interface/secondary/persistence/drizzle-<entity>.repository.ts`. Suffix `Port` digunakan untuk kontrak application service, akses lintas context, atau dependency non-persistence di `application/ports`; repository diakses lintas context melalui application service/facade milik context pemilik data.
- Endpoint API dengan payload body, path/query/header yang perlu dipetakan, atau data response harus memiliki request/response DTO yang eksplisit pada `interface/primary/rest`. Validasi input dilakukan sebelum nilai masuk ke use case; mapper response hanya mengeluarkan field yang dijanjikan OpenAPI. Redirect dan response tanpa `data` tidak memerlukan DTO payload kosong. Request/response internal use case ditempatkan di `application/services/requests` atau `responses` bila diperlukan, terpisah dari DTO HTTP.
- `application` mengorkestrasi use case dan memanggil port. `interface/primary/rest` memetakan HTTP ke use case; `interface/secondary` menyediakan implementasi port.
- `infrastructure` merangkai dependency dan konfigurasi runtime. Shared connection/env bootstrap berada di `src/backend/shared/infrastructure`; schema domain tetap di context pemiliknya dan dihimpun untuk workflow migration.
- Setiap context memiliki satu file composition di `infrastructure/di/index.ts` yang merangkai seluruh service dan adapter context tersebut. Consumer mengimpor wiring dari `infrastructure/di`.
- `auth` memiliki session lifecycle; `users` memiliki learner profile; `syllabus` memiliki katalog dan canonical question bank; `flashcards`/`practice` memiliki aktivitas; `progress` memiliki event/snapshot; `personalization` memiliki recommendation policy.
- Akses lintas context melalui application port/facade. Producer aktivitas memanggil use case progress. Adapter persistence suatu context mengakses tabel yang dimiliki context itu.

Contoh penempatan:

| Artefak | Path |
| --- | --- |
| Progress domain rule | `src/backend/progress/domain/services/mastery-calculator.ts` |
| Syllabus query | `src/backend/syllabus/application/queries/get-lesson.ts` |
| Flashcard answer controller | `src/backend/flashcards/interface/primary/rest/submit-answer.controller.ts` |
| Progress repository contract | `src/backend/progress/domain/repositories/progress.repository.ts` |
| Progress repository adapter | `src/backend/progress/interface/secondary/persistence/drizzle-progress.repository.ts` |
| API route | `src/app/api/v1/flashcards/sessions/[sessionId]/answer/route.ts` |

Stack BE: MySQL, Drizzle, `mysql2`, Zod, Auth.js Google provider, dan provider abstraction AI sesuai [MVP plan](docs/mvp-plan.md). MobX digunakan di FE; state authoritative seperti mastery dan lesson understanding dihitung serta disimpan oleh BE.

## 3. Frontend

### Domain module template

```text
src/frontend/<domain>/
  interfaces/
    entities/
      enums/
    requests/
    responses/
  services/
    types.ts               # symbol/token DI domain
    container.ts           # factory container domain/feature
    external/
      I<Domain>Service.ts
      impl/
        <Domain>Service.ts
      index.ts
    internal/
      I<Feature>Store.ts
      impl/
        <Feature>Store.ts
      index.ts
  hooks/
    use<Feature>Store.ts
    index.ts
  providers/
    <Domain>ContainerProvider.tsx
  features/
    <Feature>/
      index.tsx
  components/
    atoms/
    molecules/
    organisms/
  helpers/
```

### Shared module template

```text
src/frontend/shared/
  adapters/
    http-client/
      HttpClient.ts
      impl/
  components/
    atoms/
    molecules/
    organisms/
    layouts/
  interfaces/
    FrontendContainerOptions.ts
    FrontendBootstrapData.ts
  services/
    types.ts
    container.ts           # createFrontendContainer
    external/
      impl/
    internal/
      IAppSessionStore.ts
      impl/
        AppSessionStore.ts
  providers/
    FrontendContainerProvider.tsx
    MockProvider.tsx
  hooks/
    useFrontendContainer.ts
    useAppSessionStore.ts
  helpers/
```

### Aturan penempatan

- `interfaces/entities`, `requests`, dan `responses` mendefinisikan data FE berdasarkan kontrak API. Service API tidak mengimpor domain entity atau repository BE ke client bundle.
- `services/external` memiliki interface dan implementasi API yang menggunakan shared HTTP adapter serta memetakan envelope/error API. Container Inversify mengikat implementasi API yang sama pada mode nyata maupun mock; MSW menyediakan response pada layer HTTP. Tidak ada class service mock atau folder `services/external/mocks`.
- `services/internal` memiliki interface serta implementasi store dan service internal. Store menerima external service melalui constructor injection.
- `services/types.ts` memiliki token unik untuk interface runtime; `services/container.ts` memiliki binding dan factory container. Komponen mengakses store melalui hook domain yang resolve dari provider.
- `features` memuat screen/flow yang dirender route. `components` memuat unit UI reusable, `providers` memberi scope dependency, dan `helpers` memuat fungsi lokal murni.
- `frontend/shared` memiliki concern lintas fitur. Komponen dengan semantic lesson, flashcard, practice, atau progress tetap berada di domain terkait. Pembagian atom/molecule/organism dibuat saat diperlukan.
- Export publik di `index.ts`/`index.tsx` dijaga sesuai perubahan; dependency antar module menggunakan entry point yang jelas. Dependency server/client menggunakan entry point terpisah agar barrel tidak menarik kode server ke client.

### Mock API dengan MSW

Package **`msw`** menjadi dependency development/test. Store dan service API tetap menjalankan jalur HTTP yang sama; handler MSW menyediakan response sesuai [kontrak API KotobaHub](docs/api-contract/README.md).

```text
src/mocks/
  main.ts                  # entry bootstrap mock browser
  msw.router.ts            # menghimpun handler per domain
  msw.browser.ts           # setupWorker dari msw/browser
  msw.node.ts              # setupServer dari msw/node
  api/
    <domain>/
      <domain>.routes.ts   # http.get/post/... dan HttpResponse
      <domain>.collection.ts  # data skenario typed bila diperlukan
      <domain>.types.ts    # tipe skenario tambahan bila diperlukan
  fixtures/                # fixture reusable yang mengikuti kontrak
  states/                  # state sesi/skenario dan fungsi reset
```

- Handler dikelompokkan per domain dan dihimpun di `msw.router.ts`, lalu dipakai oleh browser dan Node. Gunakan request/response types FE yang sudah ada; tipe skenario hanya menambah kebutuhan mock yang belum tercakup oleh DTO. Lihat [struktur handler MSW](https://mswjs.io/guides/best-practices/structuring-handlers).
- Response mock mengikuti method/path `/api/v1`, envelope `status`/`data`, metadata pagination, dan error code yang resmi. Handler dapat merepresentasikan success, empty, validation error, unauthorized, latency, atau kegagalan jaringan yang diperlukan flow UI.
- Browser memakai `setupWorker` dan worker script generated `public/mockServiceWorker.js`. `MockProvider` memulai MSW melalui import dinamis ketika flag public `NEXT_PUBLIC_API_MOCKING=true` dan runtime development; production tidak mengaktifkan handler mock. Provider menunggu `worker.start()` sebelum feature melakukan request awal. Jika inisialisasi gagal, tampilkan state setup error yang jelas. Lihat [MSW browser](https://mswjs.io/guides/integrations/browser).
- `main.ts` menjaga inisialisasi browser tetap idempotent. Server-render dan client-render awal memakai readiness state yang konsisten; request store dimulai setelah MockProvider siap.
- Jest/store/component test menggunakan `setupServer` dalam proses test: `listen()` sebelum suite, `resetHandlers()` setelah setiap test, dan `close()` setelah suite. Reset juga state/collection mock karena reset handler saja tidak menghapus data skenario. Lihat [MSW Node](https://mswjs.io/guides/integrations/node).
- Request API aplikasi yang belum punya handler harus terlihat sebagai error pada suite FE yang menggunakan MSW. Request di luar scope mock, seperti asset Next.js, dapat dilewatkan secara eksplisit.
- Worker browser hanya mengintersep request browser. Node interceptor hanya berlaku di proses tempat ia diaktifkan. Backend query/use case yang dipanggil langsung oleh Server Component tidak melewati MSW; bootstrap DTO server pada test diberikan melalui fixture atau backend test yang sesuai.
- Fixture session pada response mock memberi data UI. Protected server route tetap membutuhkan session test yang sah. Integration/E2E yang menguji persistence atau progress write-through memakai backend nyata pada environment test dengan mock API FE dinonaktifkan.

## 4. MobX store dan Inversify

### Dependency dan state

Dependency FE yang dikunci untuk bootstrap adalah **`mobx`, `mobx-react-lite`, dan `inversify`**, selain React, Next.js, Tailwind, dan shadcn/ui; **`msw`** dipasang untuk development/testing. React provider/context menjadi jembatan container Inversify ke hook; library binding React tambahan dapat dipilih kemudian jika benar benar diperlukan.

- Store memakai observable untuk state, computed untuk derived UI state, dan action untuk transisi. Gunakan anotasi eksplisit dengan `makeObservable` atau `makeAutoObservable` sesuai bentuk class; dependency service tidak dijadikan observable.
- Komponen client yang membaca observable memakai `observer` dari `mobx-react-lite`. Primitive UI menerima plain values melalui komponen pemilik yang mengamati store. Lihat [MobX React integration](https://mobx.js.org/react-integration.html).
- Update observable setelah operasi async dilakukan dalam action/`runInAction`; constructor tidak menjalankan fetch atau side effect. Lifecycle feature memulai load dan dispose sesuai kebutuhan. Lihat [MobX actions](https://mobx.js.org/actions.html).
- Store menangani loading/error, form/wizard state, current question, submission, dan snapshot hasil backend. Perhitungan grading, mastery, bucket scheduling, serta completion resmi tetap melalui use case BE.
- State lokal sederhana boleh memakai React hooks. State flow yang dibagi antarkomponen dikelola store domain; setiap flow memiliki pemilik state yang jelas.

### Container dan lifetime

- `shared/services/container.ts` menyediakan factory `createFrontendContainer(options)` untuk HTTP adapter, public client configuration, dan app-session store. Instance root dimiliki provider yang stabil selama app session.
- Domain/feature membuat child container dari parent melalui `services/container.ts`, lalu mengikat service dan store miliknya. Store feature bersifat singleton **di dalam scope provider feature** agar rerender tidak membuat instance baru.
- Container app tidak mengikat store mutable semua sesi sebagai singleton global. Provider sesi flashcard/practice memakai identity session sebagai batas scope; keluar atau mengganti session membersihkan reaction/subscription/request serta mereset state terkait.
- Consumer menggunakan hook seperti `useFlashcardSessionStore()`. Constructor injection tetap eksplisit; factory binding dapat merangkai constructor melalui `container.get(token)` sehingga bootstrap tidak bergantung pada compiler metadata decorator.
- Inversify scope dipilih eksplisit. `inRequestScope` Inversify mengacu pada satu graph resolution; lifetime HTTP request/React route ditentukan oleh factory/provider aplikasi. Lihat [Inversify binding](https://inversify.io/docs/fundamentals/binding/) dan [container hierarchy](https://inversify.io/docs/fundamentals/di-hierarchy/).
- Test membuat container/store baru per test dengan implementasi API service yang sama dan handler MSW terisolasi. Sign out atau pergantian user membersihkan state user dari store, in-flight request, dan container feature.

### Server rendering dan hydration

- FE store/provider/hook yang interaktif berada di batas Client Component. Container yang dibuat saat prerender di server harus terisolasi per render/request; client provider menjaga instance stabil dengan lazy initialization.
- Server Component membaca data melalui backend query/use case dan mengirim **plain serializable DTO** sebagai bootstrap props. Client membuat instance store sendiri dari data tersebut; container, instance store, dan observable tidak dikirim melalui batas RSC.
- Data awal server dan client harus konsisten untuk hydration. Subscription, browser API, dan operasi async dimulai pada lifecycle client dengan cleanup yang sesuai.
- Shared session store memuat ringkasan identity/access untuk UI. Validasi session serta authorization tetap dilaksanakan di server/API. Client hanya menerima public configuration dan data user yang diizinkan.

## 5. Alur implementasi FE

1. Baca kontrak dan tentukan request/response/entity interface.
2. Tambahkan external service interface dan API implementation, lalu handler/fixture MSW untuk endpoint yang diperlukan skenario FE.
3. Definisikan internal store interface, observable/computed/action, serta dependency constructor.
4. Tambahkan token dan binding ke container domain, lalu provider serta hook yang memberi scope sesuai flow.
5. Rangkai feature dan reusable components dengan token design system.
6. Pasang route tipis, data bootstrap server, guard, loading/error, dan metadata.
7. Verifikasi state penting serta backend write-through melalui test yang relevan.

Contoh flashcard: `FlashcardSession` feature memanggil action pada `FlashcardSessionStore`; store memanggil `IFlashcardsService`; implementasi API mengirim answer melalui HTTP adapter; controller/use case BE menilai jawaban dan menulis progress; store menerima response authoritative, lalu UI `observer` menampilkan feedback dan snapshot terbaru.

## 6. App Router dan batas transport

- `(public)` memuat landing, `(auth)` memuat login, dan `(app)` memuat onboarding serta area belajar sesuai [page inventory](docs/system-design/information-architecture-and-page-inventory.md). Guard onboarding memakai session valid; area belajar membutuhkan onboarding selesai. Layout tidak boleh membuat redirect loop untuk route onboarding.
- `src/app/providers.tsx` merangkai client provider global yang diperlukan; provider domain/feature ditempatkan pada subtree flow agar scoping store tetap jelas.
- `page.tsx` merangkai feature dan query server; `route.ts` mendelegasikan request ke controller BE. Endpoint versi aplikasi berada di `src/app/api/v1` sesuai OpenAPI.
- Client mengakses BE melalui external API service. Server Component dapat memanggil query/use case langsung pada server; authorization tetap menjadi bagian akses data.

## 7. Pengujian dan referensi

Unit tests mencakup domain BE serta store FE dengan implementasi API service dan handler MSW. Component tests memakai provider/container test baru serta skenario HTTP MSW untuk memeriksa state yang terlihat user. Integration/E2E memeriksa interaksi aktual ke backend, progress write-through, dan isolasi user/session sesuai `TEST-01`–`TEST-11`.

- Ownership dan alur bisnis: [architecture foundation](docs/architecture-foundation.md).
- Scope produk: [PRD](PRD.md) dan [MVP plan](docs/mvp-plan.md).
- Visual dan komponen: [DESIGN_SYSTEM](DESIGN_SYSTEM.md) dan [component inventory](docs/system-design/shadcn-component-inventory.md).
- Urutan kerja serta dependency: [task breakdown](docs/task-breakdown.md).
