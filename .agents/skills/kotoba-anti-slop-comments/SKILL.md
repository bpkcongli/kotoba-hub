---
name: kotoba-anti-slop-comments
description: Keep KotobaHub code comments useful when writing, changing, or reviewing comments and docstrings in frontend or backend modules.
---

# Comment hygiene

Use when comments or docstrings are part of the change. This adapts [anti-slop-code](../../../docs/anti-slop-integration.md) for the KotobaHub modular monolith.

- Keep a comment when it explains a business rule, authorization boundary, database constraint, protocol, non-obvious tradeoff, workaround, or edge case that the code alone does not reveal.
- Remove decorative banners, step-by-step narration, signature echoes, vague TODOs, and comments that only restate the next statement. Prefer a short explanation of *why* the rule exists. Do not impose a mechanical one-line limit when a precise explanation needs more space.
- When reviewing comments, check them against the documented behavior in [ARCHITECTURE.md](../../../ARCHITECTURE.md), the relevant ERD/OpenAPI, and source code. Correct a misleading comment rather than deleting valuable context.
- If the task is only comment cleanup, keep executable code, identifiers, and formatting outside comments unchanged. In a feature task, update comments together with the behavior they describe.
