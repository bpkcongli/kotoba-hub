---
name: kotoba-react-composition
description: Structure KotobaHub React features with domain components, MobX stores, Inversify injection, and explicit composition defined in ARCHITECTURE.md.
---

# React composition and frontend structure

Use for reusable components, complex flow UI, or frontend folder decisions.

- Follow [ARCHITECTURE.md](../../../ARCHITECTURE.md) for domain-local `interfaces`, `services/external`, `services/internal`, `features`, `components`, `providers`, and `hooks`, with shared concerns under `src/frontend/shared` and thin routes under `src/app`.
- When adding, renaming, or removing a public FE export, create or update the owning folder's `index.ts` (or `index.tsx` for a JSX entry point) in the same change. Follow `src/frontend/shared/components/organisms/index.ts`: re-export the public symbol from its file, and import it through that folder entry point where appropriate. Apply this to populated component, feature, hook, and service folders; do not add empty indexes or expose internal-only modules. Keep server and client entry points separate so a barrel never pulls server code into a client bundle.
- Define API request/response interfaces at the feature boundary and keep external calls in domain services/adapters. Keep route-facing composition in `features`; extract a component only when it clarifies a real repeated or complex unit. Use shared components for cross-feature behavior, not domain-specific semantics.
- Keep the API service implementation and Inversify binding identical in real and mocked modes. Mock FE HTTP responses through MSW handlers in `src/mocks`; do not add mock external service classes. Follow `ARCHITECTURE.md` for browser startup, Node test lifecycle, and scenario-state reset.
- Prefer explicit component variants and children/slots for flashcard/practice states over many interacting boolean props. Shared flow state belongs to a MobX store with an interface and constructor-injected API service; bind it through domain Inversify tokens/container and consume it through provider-scoped hooks. Simple local state can use React hooks. See [React composition](https://react.dev/learn/passing-props-to-a-component).
- Keep session, grading, mastery, and recommendation decisions on the backend. Frontend state handles display and interaction; submitted or revalidated backend data is authoritative.
- Use `observer` for clients reading store observables and MobX actions for async result updates. Keep the provider's store/container instance stable across rerenders, scope learning-session stores to their session, and dispose side effects on exit. Hydrate from plain server DTOs; server rendering must isolate mutable user state as specified in [ARCHITECTURE.md](../../../ARCHITECTURE.md).
- Follow [design system](../../../DESIGN_SYSTEM.md) and [component inventory](../../../docs/system-design/shadcn-component-inventory.md) for visual hierarchy and ownership.
