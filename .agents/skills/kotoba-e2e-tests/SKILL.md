---
name: kotoba-e2e-tests
description: Build isolated Playwright E2E smoke tests for KotobaHub login/onboarding, lesson quiz, flashcards, practice, and progress flows when E2E coverage is assigned.
---

# E2E smoke tests

Use for `TEST-11` or other assigned end-to-end coverage. The [MVP plan](../../../docs/mvp-plan.md) recommends Playwright smoke tests; `TEST-01`–`TEST-10` focus on unit, component, and light integration coverage.

- Pick a few product-critical journeys: login stub to onboarding confirmation, lesson reading to first correct post-study quiz and completion, flashcard answer to mastery update, random practice answer to progress refresh.
- Use isolated local/test users and deterministic seeded content. Stub the Google OAuth boundary and AI provider, while keeping app routing, persistence, guards, and progress handoffs real in the test environment. Never depend on a live third-party account or production database.
- Disable FE API mocking when the journey asserts backend persistence/progress. Assigned UI-only browser scenarios may use MSW with deterministic handlers and isolated scenario state; do not treat their mocked responses as evidence of backend write-through.
- Use semantic locators and Playwright's retrying assertions. Keep each test independent; reset its data and avoid fixed sleeps. See [Playwright best practices](https://playwright.dev/docs/best-practices) and [auth setup](https://playwright.dev/docs/auth).
- Assert learner-visible results and one key persisted cross-feature outcome per journey. Keep screenshots/traces for failed runs when the runner supports them, then report the exact failing path.
- Add Playwright config/dependency only when an E2E implementation task is assigned; this skill alone does not change `IMP-01` scope.
