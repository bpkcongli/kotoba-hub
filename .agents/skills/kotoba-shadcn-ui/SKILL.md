---
name: kotoba-shadcn-ui
description: Implement and theme shadcn/ui primitives and KotobaHub learning components from the finalized design tokens and component inventory.
---

# shadcn/ui implementation

Use for `IMP-11`–`IMP-16` when adding or changing shared UI primitives, wrappers, or feature compositions.

- Read [DESIGN_SYSTEM.md](../../../DESIGN_SYSTEM.md), [ARCHITECTURE.md](../../../ARCHITECTURE.md), [token foundation](../../../docs/system-design/design-token-foundation.md), and [component inventory](../../../docs/system-design/shadcn-component-inventory.md) before styling.
- Configure `components.json`, import aliases, and the project's Tailwind/CSS token layer for the actual `src/` layout. Follow the current [shadcn Next.js setup](https://ui.shadcn.com/docs/installation/next) and [theming](https://ui.shadcn.com/docs/theming) docs when bootstrapping.
- Keep generated primitives as a small accessibility baseline; add KotobaHub variants/wrappers in `src/frontend/shared` and business compositions in the owning feature. Avoid per-screen copies of Button, Field, Dialog, or Progress behavior.
- Map semantic color, typography, spacing, focus, and motion tokens. Validate real foreground/background contrast, visible keyboard focus, error labels, 44px touch targets, and reduced-motion behavior on the rendered component.
- Ensure session feedback is inline near answers. Onboarding draft, lesson completion, script-pair lock, mastery delta, and weak-skill action are domain states, not cosmetic shadcn variants.
