---
name: kotoba-frontend-foundations
description: Define or implement KotobaHub shared frontend store contracts, Axios HTTP adapter, exceptions, app shell, and formatting helpers. Use for IMP-11 foundations and features consuming these patterns.
---

# Frontend foundations

Read `docs/task-breakdown.md` and the task references first. [ARCHITECTURE.md](../../../ARCHITECTURE.md) owns placement, MobX, Inversify, and MSW; [frontend patterns](../../../docs/frontend/frontend-foundation-patterns.md) defines the shared contracts and decisions. These patterns guide `IMP-11`–`IMP-17`; they do not mark implementation tasks complete.

- Before choosing a shared store interface, identify the feature's state and lifecycle. Implement only contracts with meaningful members for that feature; do not add dummy CRUD modes, pagination, modal state, or empty lifecycle methods. Small local interactions can use React state.
- For forms, paginated lists, dialogs, hydration, or disposal, read [store contracts and examples](references/store-patterns.md). Extend a shared interface in the domain store interface, then explicitly implement that domain interface in its class. Adapt example projections to the endpoint's full DTO.
- For HTTP services and failure handling, read [Axios and exceptions](references/http-and-exceptions.md). Keep Axios and `normalizeHttpError` inside `shared/adapters/http-client` (normalization in `helpers/`); place the transport-independent `presentError` in `shared/helpers`. `shared/exceptions` exports exception classes and supporting types only. Normalize failures once, preserve API codes/trace IDs/field errors, and use the same external implementation with MSW. OAuth stays a browser/server redirect flow.
- For layout composition or formatting, read [shell and helpers](references/shell-and-helpers.md). Use `shared/components/layouts` for app chrome and pure `shared/helpers` for cross-feature presentation; learning semantics stay domain-local. Pair rendered UI work with `kotoba-anti-slop-ui`, `kotoba-shadcn-ui`, and `kotoba-anti-slop-copy`; apply `kotoba-anti-slop-comments` when writing comments.
- Preserve local `./...` module paths in FE code and foundation tests, including imports such as `./providers` and sibling barrel re-exports. Replace parent-folder `../...` references with aliases: `@/` targets `src/`, and `@tests/` targets `tests/` for fixtures/helpers. Apply the same distinction to dynamic imports while preserving separate server/client entry points. Keep TypeScript and Jest mappings aligned.
- Root setup uses typed `FrontendContainerOptions` and serializable `FrontendBootstrapData`; feature setup receives a parent container. Resolve through provider-scoped hooks with explicit constructor injection. Never pass a container over RSC or keep mutable user state in a server module singleton.

Add only shared artifacts consumed by the current implementation task, maintain public exports, and update the pattern document if a contract changes. Verify meaningful behavior: failed submission retains input, stale reads cannot overwrite newer results, disposal prevents late writes, and API failures retain actionable details. A documentation-only change does not require app E2E.
