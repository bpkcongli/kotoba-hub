---
name: kotoba-code-review
description: Review KotobaHub changes for requirement, contract, security, learning-rule, and test regressions with evidence-backed findings.
---

# Code review

Use for a requested review or as the independent review stage of an implementation task.

1. Identify touched task IDs and read linked [task breakdown](../../../docs/task-breakdown.md) references, [ARCHITECTURE.md](../../../ARCHITECTURE.md), [PRD](../../../PRD.md), and [design system](../../../DESIGN_SYSTEM.md) for UI work.
2. Trace the changed execution path from page/API adapter through domain use case, persistence, and response. Compare behavior with the feature OpenAPI and ERD rather than reviewing the diff in isolation.
3. Focus on user-visible bugs, auth/session leakage, cross-context data access, invalid seed assumptions, deterministic grading/mastery mistakes, stale progress, inaccessible UI states, and missing tests for high-risk behavior.
4. Report only actionable findings. Include severity, file/line, failing scenario, and expected behavior. Put open questions separately and say explicitly when no findings were found.

For backend contracts, check the repository naming/placement rules in [backend boundaries](../kotoba-backend-boundaries/SKILL.md): persistence interfaces use `<Entity>Repository` in `domain/repositories`, Drizzle implementations use `Drizzle<Entity>Repository`, and application `Port` contracts expose services/facades or non-persistence dependencies. Context crossings must not bypass the owning application service to access its repository.

For MobX/Inversify FE work, check stable provider instances, per-session store scope, async action updates, observer boundaries, plain DTO hydration, and user-state isolation during server rendering/sign out against `ARCHITECTURE.md`.

For FE API mocking, check MSW handlers against `/api/v1` contracts, unchanged real-service DI bindings, awaited browser startup, and per-test handler/fixture reset. Mock external service classes conflict with the architecture. Persistence integration/E2E must reach the real test backend.

For UI diffs, apply [kotoba-anti-slop-ui](../kotoba-anti-slop-ui/SKILL.md) and [kotoba-anti-slop-copy](../kotoba-anti-slop-copy/SKILL.md) to the changed screens and copy. Report unsupported metrics or claims, dead controls, missing interaction states, or demonstrable responsive/accessibility failures with file and scenario evidence. For changed code comments, use [kotoba-anti-slop-comments](../kotoba-anti-slop-comments/SKILL.md) when a comment hides or misstates a material rule; avoid subjective style findings.

Known audit points: published lesson bank coverage; custom `/api/v1/auth/...` contract versus Auth.js handler conventions; backend-before-UI order in [task breakdown](../../../docs/task-breakdown.md). Do not treat an existing documented gap as a new defect unless the change relies on it incorrectly.
