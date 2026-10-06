---
name: kotoba-data-auth
description: Build KotobaHub MySQL/Drizzle persistence, migrations, Google Auth.js sessions, and onboarding authorization from the ERD and auth contracts.
---

# Data and authentication

Use for database foundation, `IMP-02`–`IMP-04`, or auth/persistence changes elsewhere.

- Start from [auth/user ERD](../../../docs/erd/auth-and-user-profile.md), [syllabus ERD](../../../docs/erd/syllabus-domain.md), [learning activity ERD](../../../docs/erd/learning-activity.md), and [auth API](../../../docs/api-contract/auth-and-authorization.md). Add only tables needed by the current implementation slice, preserving keys and ownership.
- Use MySQL, `mysql2`, Drizzle, and versioned migrations as established in [MVP plan](../../../docs/mvp-plan.md). Validate environment variables at startup and keep secrets server side. Review generated SQL and migration effects before applying them.
- Google is the only MVP OAuth provider. Session and onboarding access states are `ANONYMOUS`, `ONBOARDING_REQUIRED`, `APP_READY`. Check both page entry and API authorization; use `401` for no valid session and `403` for a valid session lacking app access.
- `auth` may provision a user, but `users` owns `learner_profiles` and `onboarding_completed`. The assessment draft must not persist as a confirmed profile until the user confirms it.
- Reconcile the documented `/api/v1/auth/...` contract with the selected Auth.js integration before coding route adapters; Auth.js has its own handler conventions. Do not silently replace the published contract. See [Auth.js installation](https://authjs.dev/getting-started/installation) and [Drizzle MySQL](https://orm.drizzle.team/docs/get-started/mysql-new).
