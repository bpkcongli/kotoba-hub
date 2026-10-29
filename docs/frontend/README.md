# Dokumentasi frontend

Panduan frontend untuk fondasi shared dan implementasi fitur KotobaHub. Urutan task tetap mengikuti [task breakdown](../task-breakdown.md); struktur folder, MobX, dan Inversify mengikuti [ARCHITECTURE.md](../../ARCHITECTURE.md).

## Panduan dan implementasi

| Dokumen | Cakupan |
| --- | --- |
| [Frontend foundation patterns](frontend-foundation-patterns.md) | Kontrak store, scope container, adapter Axios, exception, shell, dan helper untuk `IMP-11`–`IMP-17`. |
| [Implementasi fondasi FE](frontend-foundation-implementation.md) | Hasil `IMP-11`: shared layout, session bootstrap, DI, HTTP adapter, MSW, serta verifikasi dan batas cakupan. |
| [Auth dan onboarding UI](frontend-auth-onboarding-implementation.md) | Hasil `IMP-12` dan `TEST-06`: login, route guard, assessment, review draft, konfirmasi, dan verifikasi. |
| [Flashcards UI](frontend-flashcards-implementation.md) | Hasil `IMP-14`: katalog dan setup, sesi pilihan ganda, feedback, summary, retry, dan batas resume. |

## Referensi pendukung

- [Design system](../../DESIGN_SYSTEM.md), [design tokens](../system-design/design-token-foundation.md), dan [component inventory](../system-design/shadcn-component-inventory.md).
- [Responsive layout](../system-design/responsive-layout-rules.md), [page inventory](../system-design/information-architecture-and-page-inventory.md), dan [high-fidelity handoff](../system-design/high-fidelity-system-design.md).
- [API contract](../api-contract/README.md) untuk bentuk request/response dan aturan akses.
- [Skill frontend foundations](../../.agents/skills/kotoba-frontend-foundations/SKILL.md) untuk panduan agent dan contoh pattern.
