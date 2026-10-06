---
name: kotoba-nextjs-app-router
description: Build KotobaHub Next.js App Router pages and client/server boundaries using its documented frontend and backend module layout.
---

# Next.js App Router

Use for `IMP-01`, `IMP-11`–`IMP-17`, routing, rendering, data access, or performance work.

- Read [ARCHITECTURE.md](../../../ARCHITECTURE.md) for folders/store/DI, [architecture foundation](../../../docs/architecture-foundation.md) for module ownership, [information architecture](../../../docs/system-design/information-architecture-and-page-inventory.md), and [responsive rules](../../../docs/system-design/responsive-layout-rules.md).
- `src/app` owns route files, layouts, loading/error surfaces, and thin composition. Feature UI belongs in `src/frontend/<domain>`; server use cases and persistence remain in `src/backend`.
- Prefer Server Components for server-safe reads and initial page data. Use Client Components only for session interactions, browser APIs, and local state; keep the client boundary as low as practical. A server component can call a backend query/use case directly rather than making an HTTP request to its own route handler.
- Keep protected route checks on the server, and enforce authorization again at every backend/API boundary. Do not pass secrets, repositories, or privileged objects into client props.
- Bootstrap `mobx`, `mobx-react-lite`, and `inversify` as required FE dependencies. Server-to-client props carry serializable DTOs; instantiate store/container through a stable client provider with isolated server-render scope. Keep mutable user state out of module-level server singletons.
- Add `msw` for development/testing and use MockProvider to await browser interception before initial FE API requests in mocked mode. Browser MSW does not intercept direct server queries; keep server bootstrap/test fixtures and Node interception scoped to their actual runtime as defined in `ARCHITECTURE.md`.
- Use explicit loading and error states for syllabus, session setup, answer submission, and progress refresh. Revalidate after write-through responses so optimistic UI converges on persisted state.
- Before relying on a Next.js caching or auth behavior, check the current [Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components), [Fetching Data](https://nextjs.org/docs/app/getting-started/fetching-data), and [Data Security](https://nextjs.org/docs/app/guides/data-security) docs.
