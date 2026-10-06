---
name: kotoba-unit-integration-tests
description: Create focused KotobaHub Jest, React Testing Library, and API integration tests for documented learning rules and critical UI flows.
---

# Unit, component, and integration tests

Use for `TEST-01`–`TEST-10` and tests needed by an implementation slice.

- Start from the behavior in [task breakdown](../../../docs/task-breakdown.md), [PRD](../../../PRD.md), relevant ERD/sequence, and the actual API contract. Assert externally observable outcomes, not a copied implementation formula.
- Unit-test mastery windows/thresholds, Leitner transitions, deterministic answer acceptance, lesson understanding `0..10`, AI schema parsing, and onboarding normalization/confirmation with edge cases that could change results.
- Component-test onboarding, flashcard, and practice states using accessible roles/labels and user interactions. Test feedback, script lock, retry, and completion behavior where critical. Follow [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).
- For FE stores, follow [ARCHITECTURE.md](../../../ARCHITECTURE.md): create fresh Inversify containers and MobX stores per test, bind the actual API service implementation, and intercept its HTTP requests with MSW. Verify loading/error/result transitions plus session reset. Use `setupServer` before the suite, reset handlers and mutable fixture state after each test, and close after the suite; keep unhandled application API requests visible as test errors. Do not create mock external service classes.
- Integration-test the critical answer endpoints and progress overview against isolated test data. Verify persisted event, correct owner/skill attribution, snapshot update, response shape, and auth guard; mock external OAuth and AI, not domain use cases being tested.
- Use the configured Jest setup from `IMP-01`. Keep fixtures small, independent, and deterministic. Run targeted tests for touched behavior, then the relevant required gate. See [Jest docs](https://jestjs.io/docs/getting-started).
- The old unversioned endpoint examples in `TEST-09` must be reconciled with the canonical `/api/v1` OpenAPI paths before naming integration tests.
