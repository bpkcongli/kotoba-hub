---
name: kotoba-flashcard-bilingual-authoring
description: Author equivalent English and Indonesian vocabulary flashcard meaning packages and candidate options from curated Japanese senses.
---

# Bilingual vocabulary flashcards

Read the [task breakdown](../../../docs/task-breakdown.md), [vocabulary guide](../../../docs/syllabus/flashcards/vocabulary-authoring-guide.md) and [BIL-05 contract](../../../docs/syllabus/bilingual/bilingual-flashcards-implementation.md). Use the guide's content draft format and [copy guidance](../kotoba-anti-slop-copy/SKILL.md).

- Consume the exact assigned curation path/hash. Retain item IDs, source provenance, selected senses and proposed group membership. Report unsupported curation assumptions to the parent; do not silently edit the curator's artifact or active canonical answers.
- Write clear English/Indonesian meanings, aliases and useful nullable explanations for the same Japanese sense. Keep spelling, reading and Japanese examples equivalent across locales. Mark original examples as original; do not invent source citations or claim dictionary-derived Indonesian text.
- Accept only Japanese spelling/reading aliases valid for the selected sense and restrictions. If these differ from baseline answers, include the proposed canonical correction in the handoff without applying it to active artifacts.
- Evaluate JAPANESE to MEANING, MEANING to JAPANESE and MEANING to KANA for both locales. Candidate distractors must reference real verified items. Exclude correct aliases, overlapping meanings and identical prompts/readings after NFKC/case/whitespace normalization; check ambiguity in both directions.
- Use optionChecks READY only when the reviewed options have exactly one valid answer and at least one distinct valid distractor. Use HELD with reasons when not enough options exist; never fill a bank with false meanings or quietly omit a supported pair. This is editorial option readiness, not runtime acceptance.
- Keep candidate item/localization flags false and revision proposals consistent with their baseline. New owner revisions begin positive. Existing baseline changes follow BIL-05 revision rules. Complete both languages or report affected items held; fallback is not an authoring substitute.

Return only assigned content drafts plus actual coverage, source evidence, revision/canonical proposals and checks to the parent for independent review. Do not publish, import, overwrite active overlays or declare your own output reviewed.
