# KotobaFlow Architecture Foundation

## Scope
- Dokumen ini mengunci hasil task `ARCH-01` dan `ARCH-02`.
- Fokusnya adalah dua hal: bounded context final untuk modular monolith `KotobaFlow`, dan struktur folder final yang cocok untuk Next.js App Router.
- Keputusan di dokumen ini menggantikan usulan struktur yang masih kasar di `mvp-plan.md`.

## Decision Summary
- KotobaFlow tetap dibuat sebagai satu aplikasi Next.js fullstack, bukan monorepo.
- App Router tetap tinggal di `src/app` sebagai lapisan routing, layout, dan transport adapter tipis.
- Backend dipisahkan ke `src/backend` dengan struktur per bounded context dan layering `domain -> application -> interface -> infrastructure`.
- Frontend dipisahkan ke `src/frontend` dengan folder `shared` yang sejajar langsung dengan folder domain-specific.
- Cross-cutting code tidak ditaruh di satu folder umum besar; gunakan `src/backend/shared` untuk common kernel backend dan `src/frontend/shared` untuk shared UI/application client concerns.

## ARCH-01 Final Bounded Contexts

### Final Context List
1. `auth`
2. `users`
3. `syllabus`
4. `flashcards`
5. `practice`
6. `progress`
7. `personalization`
8. `shared`

### Context Responsibilities

| Context | Tanggung jawab utama | Data / aggregate yang dimiliki |
| --- | --- | --- |
| `auth` | Login Google, session, account linking, auth guard integration | `accounts`, `sessions`, auth metadata |
| `users` | User profile, learner profile persistence, settings, preference dasar user | `users`, `learner_profiles` |
| `syllabus` | Kurikulum `track -> unit -> lesson -> skill`, mapping skill antar level | `tracks`, `units`, `lessons`, `skills`, `unit_skill_mappings` |
| `flashcards` | Deck, card session, Leitner bucket, answer evaluation yang deterministik | `flashcard_decks`, `flashcard_items`, flashcard sessions |
| `practice` | Session random questions, komposisi soal, grading orchestration, feedback | `practice_sessions`, `practice_questions`, `practice_answers` |
| `progress` | Event belajar, mastery snapshot, overview/timeline progress | `progress_events`, `skill_mastery_snapshots` |
| `personalization` | Onboarding assessment, AI normalization, recommendation policy, learner adaptation rules | assessment models, recommendation policy, optional assessment logs |
| `shared` | Shared kernel dan technical abstractions lintas module | base error/result, ids, time abstractions, pagination, observability contracts |

### Boundary Rules
- `auth` hanya mengurus authentication dan session lifecycle. Ia boleh memicu provisioning user, tetapi tidak memiliki rule bisnis learner profile.
- `users` adalah pemilik data profile. `personalization` boleh menghitung rekomendasi atau normalized assessment, tetapi penyimpanan profile final tetap lewat use case di `users`.
- `syllabus` adalah source of truth untuk struktur `track -> unit -> lesson -> skill`. Module lain hanya membaca katalog ini, bukan mengubahnya langsung.
- `flashcards` dan `practice` adalah producer aktivitas belajar. Keduanya tidak boleh menyimpan mastery langsung ke tabel milik `progress`; mereka menulis lewat port/use case `progress`.
- `progress` adalah source of truth untuk state perkembangan belajar. Ia menerima event dari `flashcards` dan `practice`, lalu menghasilkan snapshot yang dibaca modul lain.
- `personalization` membaca `users`, `syllabus`, dan `progress` untuk menyesuaikan rekomendasi, tetapi tidak boleh mengambil alih ownership data dari ketiga context itu.
- `shared` diperlakukan sebagai common kernel, bukan dumping ground. Jika logic hanya relevan untuk satu context, logic itu harus tetap tinggal di context tersebut.

### Allowed Dependency Direction
- `auth -> users -> shared`
- `syllabus -> shared`
- `progress -> syllabus, users, shared`
- `flashcards -> syllabus, progress, shared`
- `practice -> syllabus, progress, personalization, shared`
- `personalization -> users, syllabus, progress, shared`

### Implementation Rules For Cross-Module Calls
- Akses lintas module harus lewat `application` port/facade atau domain event, bukan import langsung ke repository implementation module lain.
- Tidak ada module yang boleh mengakses tabel module lain secara langsung dari adapter persistence-nya.
- Jika butuh read model lintas context, sediakan query port atau dedicated read service di module pemilik data.
- Relasi utama `syllabus -> progress -> personalization -> practice` dikunci sebagai arah bisnis utama dan akan dirinci lagi di task `ARCH-03`.

## ARCH-02 Final Folder Structure

### Design Principles
- Ikuti konvensi Next.js App Router dengan tetap menjaga pemisahan concern yang tegas.
- Jangan menaruh business logic di `page.tsx`, `layout.tsx`, `route.ts`, atau server action file.
- Struktur folder harus feature-first, bukan layer-first di level teratas.
- Atomic design tidak dipaksakan ke semua area. `atoms/molecules/organisms` dipakai hanya untuk shared UI atau domain UI yang memang besar.

### Final High-Level Structure

```text
src/
  app/
    (public)/
    (auth)/
    (app)/
      dashboard/
      syllabus/
      flashcards/
      practice/
      progress/
      settings/
    api/
      auth/
      syllabus/
      flashcards/
      practice/
      progress/
      personalization/
    layout.tsx
    globals.css

  backend/
    shared/
      domain/
      application/
      interface/
      infrastructure/
    auth/
    users/
    syllabus/
    flashcards/
    practice/
    progress/
    personalization/

  frontend/
    shared/
      adapters/
      components/
      helpers/
      hooks/
      interfaces/
      providers/
      services/
    auth/
    onboarding/
    dashboard/
    syllabus/
    flashcards/
    practice/
    progress/
    settings/

  content/
    syllabus/
    flashcards/

tests/
  unit/
  integration/
  component/
```

### Backend Module Template

```text
src/backend/<module>/
  domain/
    aggregates/
    entities/
    value-objects/
    exceptions/
    repositories/        # interface only
    services/
    events/
  application/
    commands/
    queries/
    ports/
    services/
      requests/
      responses/
  interface/
    primary/
      rest/
      graphql/
      jobs/
    secondary/
      persistence/
      ai/
      events/
  infrastructure/
    config/
    database/
    di/
    logging/
```

### Backend Notes
- `domain` memuat pure business rules dan tidak tahu detail framework.
- `application` memuat use case orchestration. Tambahan folder `queries/` sengaja ditambahkan karena KotobaFlow punya read-heavy flow seperti syllabus map dan progress overview.
- `interface/primary/rest` berisi controller/handler/mapping request-response. File `src/app/api/**/route.ts` hanya menjadi adapter Next.js yang mendelegasikan kerja ke lapisan ini.
- `interface/secondary` berisi implementasi port keluar seperti repository database, AI provider adapter, event publisher, atau cache adapter.
- `infrastructure` memuat detail teknis yang spesifik ke runtime/project seperti DI container, database bootstrap, logging config, dan module wiring.

### Frontend Module Template

```text
src/frontend/<domain>/
  components/
    atoms/
    molecules/
    organisms/
  features/
  helpers/
  hooks/
  interfaces/
    entities/
      enums/
    requests/
    responses/
  services/
    api/
    state/
```

### Frontend Shared Template

```text
src/frontend/shared/
  adapters/
    cookie-manager/
    http-client/
      impl/
        AxiosHttpClient/
          index.ts
      HttpClient.ts
  components/
    atoms/
    molecules/
    organisms/
    layouts/
  helpers/
  hooks/
  interfaces/
  providers/
  services/
```

### Frontend Notes
- Pola repo referensi tetap dipakai idenya: domain UI dipisah dari shared/general layer. Untuk KotobaFlow, nama `shared` dipilih agar lebih umum dan mudah dibedakan dari `backend/shared`.
- Folder seperti `frontend/auth`, `frontend/onboarding`, `frontend/syllabus`, dan seterusnya dipakai untuk kode yang dekat dengan fitur produk, misalnya onboarding wizard, flashcard flow, progress chart, dan syllabus map.
- `frontend/shared` dipakai untuk UI primitives, app shell, provider global, reusable hooks, adapter HTTP, dan util lintas domain.
- Struktur `atoms/molecules/organisms` tidak wajib diisi semua. Jika satu domain kecil, cukup gunakan `components/` biasa atau hanya `features/`.
- Folder `services/api` dipakai untuk wrapper pemanggilan endpoint dari browser/client component. Folder `services/state` dipakai untuk store internal atau cache orchestration bila nanti dibutuhkan.

### How App Router Maps To Modules
- `src/app/**/page.tsx` merender screen dan melakukan composition, tetapi business rule tetap di `src/frontend` atau `src/backend`.
- `src/app/api/**/route.ts` adalah transport adapter tipis untuk HTTP. Validasi request boleh dilakukan di sini atau di controller, tetapi use case tetap dipanggil dari `src/backend`.
- Server component boleh memanggil query/use case backend langsung bila aman dijalankan di server.
- Client component tidak boleh import repository atau service backend secara langsung; gunakan props dari server component, server action, atau wrapper API di `frontend/*/services/api`.

### Example Placement
- Syllabus page container: `src/app/(app)/syllabus/page.tsx`
- Syllabus feature UI: `src/frontend/syllabus/features/SyllabusOverview.tsx`
- Syllabus query use case: `src/backend/syllabus/application/queries/get-syllabus-overview.ts`
- Syllabus controller for HTTP API: `src/backend/syllabus/interface/primary/rest/get-syllabus.controller.ts`
- Syllabus route handler: `src/app/api/syllabus/route.ts`

## Result
- `ARCH-01` dianggap selesai dengan daftar bounded context dan boundary rule di dokumen ini.
- `ARCH-02` dianggap selesai dengan struktur folder final yang menyesuaikan Next.js App Router sekaligus mengikuti semangat proposal `backend/` dan `frontend/`.
- Task implementasi berikutnya bisa memakai dokumen ini sebagai baseline untuk bootstrap project di `IMP-01`.
