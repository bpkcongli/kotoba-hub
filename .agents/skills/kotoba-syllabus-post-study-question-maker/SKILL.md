---
name: kotoba-syllabus-post-study-question-maker
description: Author or review KotobaHub bilingual postStudyQuestions with a shared Japanese single-blank answer bank and the required difficulty ladder 1 through 10.
---

# Deterministic post-study questions

Read the [task breakdown](../../../docs/task-breakdown.md), task references and [authoring guide](../../../docs/syllabus/syllabus-authoring-guide.md). Use the [v2 contract](../../../docs/syllabus/bilingual-content-contract.md), [schema](../../../docs/syllabus/schema/track-seed.v2.schema.json) and [JSON example](../../../docs/syllabus/examples/lesson-content-authoring.v2.example.json). Direct post-study quiz is separate from random practice and its multiple question types.

1. Read the lesson blocks, objective and same-lesson atomic skills. Build a coverage plan for a complete bank of exactly ten questions with each difficultyLevel from 1 to 10 occurring once. Judge difficulty within that lesson: use less scaffolding, a meaningful contrast or more context while keeping vocabulary/prerequisites accessible. Ten paraphrases or arbitrary numbers do not demonstrate a ladder; Bloom categories do not replace the numeric contract.
2. Test actual language use, recognition or reading appropriate to the assigned skill. Use questionType SHORT_FREE_RESPONSE, one Japanese ___ slot, equivalent plain/HTML prompts, JA prompt/answer languages and ROMAJI_TO_KANA. Do not add options, a second bank per locale, multiple blanks or trivia about grammar labels.
3. Solve each item before writing feedback. Supply enough Japanese context to constrain time, register and intended meaning without relying on an optional hint or English/Indonesian wording. If multiple untaught answers remain plausible, revise a new draft question rather than padding its key arbitrarily. Check each accepted answer by inserting it into the sentence.
4. Attribute the blank to the exact skill it tests, owned by that lesson. Do not attribute a whole phrase to a convenient but unrelated word. A missing skill is a blocker, not permission to clone, move or manufacture a skill.
5. Keep at least one kana answer alternative and normalizationProfile kana-strict-v1. Existing curated kanji variants and Japanese comma 、 are preserved. Evaluation uses NFKC and trim; it does not strip punctuation, infer synonyms or accept romaji as canonical keys. During localization work preserve the entire existing accepted-answer array and Japanese prompt; report ambiguity for separate canonical curation.
6. Write both en/id packages: neutral placeholder, hints that guide without spelling the answer, and a short explanation connecting the answer to this sentence. Keep the same amount of help in both languages. null and [] remain valid where appropriate; do not fill them with generic praise. Explanations may name the answer because they are feedback; placeholders/hints must not reveal it.
7. Keep canonical question provenance separate from each localization's editorial/translation provenance. Apply revision rules, [kotoba-anti-slop-copy](../kotoba-anti-slop-copy/SKILL.md), HTML restrictions and unpublished draft handling from the guide.

Validate structure, same-lesson ownership, plain/HTML equivalence and the ladder. Schema checks cannot establish natural Japanese, ambiguity or a genuine progression; record the manual reasoning in the handoff. If requested output is only a snippet, label it partial and never call the lesson complete.

Adaptation sources and notices: [authoring skill sources](../../../docs/syllabus/syllabus-authoring-skill-sources.md).
