# Anti-slop skill integration

KotobaHub adapts the MIT-licensed [anti-slop](https://github.com/miqdadbadjuber/anti-slop) agent-skill package by Miqdad Badjuber, version `3.2.20`, reviewed at commit [`388cbe3b6c37d5175b9f460015bb092ef9e34894`](https://github.com/miqdadbadjuber/anti-slop/commit/388cbe3b6c37d5175b9f460015bb092ef9e34894). See the [upstream license](https://github.com/miqdadbadjuber/anti-slop/blob/388cbe3b6c37d5175b9f460015bb092ef9e34894/LICENSE). The `contrast-check.py` next to `kotoba-anti-slop-ui/SKILL.md` is copied from the upstream `antislop-human` skill under that license; the KotobaHub skill text is project-specific.

| Upstream concern | KotobaHub integration |
| --- | --- |
| Core purpose and evidence filter, UI, accessibility, mobile | `kotoba-anti-slop-ui` |
| Product copy and unsupported claims | `kotoba-anti-slop-copy` |
| Comment quality | `kotoba-anti-slop-comments` |

`AGENTS.md`, task-linked `docs/`, `ARCHITECTURE.md`, and `DESIGN_SYSTEM.md` remain authoritative. In particular, the design direction and responsive patterns are already decided here; the anti-slop skills filter generic output and ask for evidence, without replacing those decisions. These are agent instructions and a small development checker, not an npm runtime dependency. Upstream's installer, session-mode prompt, automatic audit reports, and mandatory confirmation steps are not part of this project integration. Normal task authorization and review flow continue to apply.
