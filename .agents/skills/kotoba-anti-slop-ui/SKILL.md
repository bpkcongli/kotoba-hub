---
name: kotoba-anti-slop-ui
description: Review or build KotobaHub UI for purposeful visual decisions, honest data, usable interactions, accessibility, and responsive learning flows.
---

# UI quality filter

Use for KotobaHub screens, shared UI components, responsive changes, or UI review. This adapts the [anti-slop UI, human, and mobile skills](../../../docs/anti-slop-integration.md); it does not replace project requirements.

- Read [task breakdown](../../../docs/task-breakdown.md) and the task's references first. Use [DESIGN_SYSTEM.md](../../../DESIGN_SYSTEM.md), [ARCHITECTURE.md](../../../ARCHITECTURE.md), the [design direction](../../../docs/system-design/design-direction-board.md), and [responsive rules](../../../docs/system-design/responsive-layout-rules.md) for product decisions.
- Check each visual device against a learning purpose. A badge, card, chart, icon, accent, illustration, or animation should help a learner understand content, state, or next action. Avoid generic hero/card grids, fake terminals, arbitrary metrics, or decoration simply to fill space. Established design tokens take precedence over anti-slop examples.
- Render only data supported by the contract, canonical content, or an explicitly identified mock scenario. Do not make up mastery, streaks, testimonials, user counts, or progress. Links and controls must lead to a real destination or action; unfinished features may be clearly labeled as unavailable.
- For data and interactive views, inspect loading, empty, error, disabled, and success/feedback states that apply. Keep lesson completion distinct from skill mastery; present answer feedback near the answer.
- Verify mobile, tablet, and desktop reflow using the project's breakpoint rules, including long English and Japanese text. Check horizontal overflow, 200% text zoom, 44px touch targets, safe-area bottom navigation, and whether the on-screen keyboard covers form controls. Verify keyboard order, visible focus, and status labels that do not rely on color alone.
- Calculate real foreground/background contrast for combinations used in the component. Use `python3 .agents/skills/kotoba-anti-slop-ui/contrast-check.py '#1F2340' '#FFFFFF'` for solid colors. Normal text needs 4.5:1; large text and non-text control boundaries need 3:1. For text over images or gradients, check the weakest point.
- Before handoff, inspect the rendered states affected by the change and report any verification limit accurately. Keep the check proportional to the UI touched; do not create a separate approval or reporting workflow.

The upstream checker includes a self-test against this table. Run `python3 .agents/skills/kotoba-anti-slop-ui/contrast-check.py --selftest` if the script or table changes.

| Pairing (text on background) | Ratio | Normal text (4.5) | Large text (3.0) |
|------------------------------|-------|-------------------|------------------|
| Black on white | 21.00 | Pass | Pass |
| White on black | 21.00 | Pass | Pass |
| White on #333333 | 12.63 | Pass | Pass |
| White on #666666 | 5.74 | Pass | Pass |
| #777777 on white | 4.48 | Fail | Pass |
| White on #888888 | 3.54 | Fail | Pass |
| White on #999999 | 2.85 | Fail | Fail |
| #555555 on black | 2.82 | Fail | Fail |
