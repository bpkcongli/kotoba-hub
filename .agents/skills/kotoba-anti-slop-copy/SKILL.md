---
name: kotoba-anti-slop-copy
description: Write or review KotobaHub learner-facing English/Indonesian copy so explanations, learning instructions, CTAs, status labels, and claims stay specific and truthful.
---

# Product copy filter

Use when writing or reviewing learner-facing text. This adapts [anti-slop copywriting](../../../docs/anti-slop-integration.md) to KotobaHub's documented language and learning rules.

- Read the [task breakdown](../../../docs/task-breakdown.md) and relevant product, design, and API documents first. Follow [DESIGN_SYSTEM.md](../../../DESIGN_SYSTEM.md) for concise English UI copy and [PRD.md](../../../PRD.md) for what the product actually does.
- For bilingual syllabus content, follow the [bilingual contract](../../../docs/syllabus/bilingual/bilingual-content-contract.md) and [authoring guide](../../../docs/syllabus/authoring/syllabus-authoring-guide.md). Write natural English and Indonesian with equivalent meaning and amount of help. Use direct, friendly language, explain necessary grammar terms, and show a concrete Japanese example. Keep Japanese prompts, keys, skill ownership and revision rules intact during localization edits.
- Give each heading, CTA, helper, empty state, and error message a clear job. Prefer a concrete action such as “Review lesson” or “Start post-study quiz” over a generic “Explore” or “Get started” when the destination is known.
- Never invent learner counts, ratings, testimonials, success rates, AI capability, availability, or security claims. A mock fixture may illustrate a state in development; do not present it as a live production fact. Label genuinely unavailable features or missing data honestly.
- Use the contract's meaning for `Not started`, `Reading`, `Quiz required`, `Completed`, mastery, and understanding `0–10`; do not make completion sound like mastery. Explain what a learner can do next after an incorrect answer or failed request.
- Avoid repeated marketing templates, empty superlatives, and filler. Preserve useful technical terms and Japanese examples. Keep English UI copy in English; bilingual lesson content uses its explicitly selected localization package.
- Read the final copy in its screen context. Check that labels, accessibility text, and feedback tell the same story and that any factual statement has a source.
