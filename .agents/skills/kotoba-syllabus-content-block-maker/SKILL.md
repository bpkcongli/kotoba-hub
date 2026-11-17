---
name: kotoba-syllabus-content-block-maker
description: Create or revise English/Indonesian lesson.contentBlocks for existing KotobaHub N5/N4 lessons using their Bunpro scope and relevant Tae Kim explanations.
---

# Bilingual lesson blocks

Read the [task breakdown](../../../docs/task-breakdown.md), task references and [authoring guide](../../../docs/syllabus/authoring/syllabus-authoring-guide.md) first. Use its source, draft/overlay, style and revision rules. The [v2 contract](../../../docs/syllabus/bilingual/bilingual-content-contract.md) and [schema](../../../docs/syllabus/schema/track-seed.v2.schema.json) decide the payload shape; the [JSON example](../../../docs/syllabus/examples/lesson-content-authoring.v2.example.json) demonstrates all three block types.

1. Read the assigned lesson's existing title, objective, atomic skills, prerequisites and source references. Map each objective to an explanation and a usable example before drafting. Keep the existing curriculum order; Tae Kim is a secondary explanation source, not a replacement inventory.
2. Extract only relevant Bunpro text and Tae Kim PDF pages. Record the actual section/page and write an original explanation. If the title, sources and skill ownership disagree, report the mismatch and continue only with independent supported content.
3. Start with what the learner can say or understand. Explain one manageable idea at a time, then show it in an everyday Japanese example. Define necessary terms on first use. Include a useful limitation or contrast when omitting it would teach a false rule. Adapt didactic reduction by reducing incidental complexity, not removing required lesson objectives.
4. Use PARAGRAPH for explanation, GRAMMAR_STRUCTURE for an actual grammar skill's forms, and EXAMPLE_SENTENCE for contextual Japanese plus translations. Choose the sequence and number of blocks to fit the lesson. Kana, kanji, vocabulary and reading lessons do not need artificial grammar blocks.
5. Keep PARAGRAPH.content empty; put title/body in each localization. Keep Japanese examples canonical and put translation in each localization. A grammar block's content.skillCode must resolve to the exact grammar skill in that lesson; put ALL/STANDARD/POLITE in each localization with at least one useful non-null field. Never point a combined explanation at an unrelated atomic skill.
6. Complete both en and id, including revision/provenance metadata. Translate the teaching meaning, register and caution faithfully rather than word for word. Use [kotoba-anti-slop-copy](../kotoba-anti-slop-copy/SKILL.md) for both languages; keep Japanese examples identical across packages.

Validate the fragment or assigned overlay using the guide. Hand off objective coverage, source sections, exact owner IDs, checks and unresolved issues. Stop at the assigned arrays; do not silently edit lesson metadata, skills or publish flags. For full lesson completion, pair this skill with [post-study question maker](../kotoba-syllabus-post-study-question-maker/SKILL.md).

Adaptation sources and notices: [authoring skill sources](../../../docs/syllabus/authoring/syllabus-authoring-skill-sources.md).
