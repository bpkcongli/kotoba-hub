---
name: kotoba-flashcard-content-review
description: Independently review KotobaHub vocabulary groups and bilingual flashcard drafts for source accuracy, option ambiguity and integration boundaries.
---

# Review vocabulary flashcard drafts

Review without editing files. Read the [task breakdown](../../../docs/task-breakdown.md), task references and [vocabulary guide](../../../docs/syllabus/flashcards/vocabulary-authoring-guide.md). Use source [curation](../kotoba-vocabulary-source-curation/SKILL.md), [mapping](../kotoba-vocabulary-curriculum-mapping/SKILL.md) and [authoring](../kotoba-flashcard-bilingual-authoring/SKILL.md) criteria for the assigned scope.

- Independently inspect the actual raw dictionary/overlay entries and exact curation/content baselines. Verify snapshot hashes, selected senses, spelling/reading restrictions, POS/register and provenance; a source list is not evidence that its entries were checked. Missing evidence means REVIEW_INCOMPLETE for that scope.
- Read each language separately, then compare selected meaning, help, examples and alias strength. Solve every supported item/locale option pair from prompt and options before checking the maker's answer. Check correct-alias leakage, translated synonym collisions, homographs and reading ambiguity in both directions.
- Verify item IDs and distinct lexical identities, group membership/objectives, accepted/held coverage, candidate flags and revisions. Preserve actual official runtime ownership. Flag claims that grouped drafts, lesson-less skills or unpublished lessons already receive official mastery.
- Check only what the supplied artifacts permit. JSON parsing does not validate Japanese or cross-file consistency. Do not award a complete-batch ready verdict to a partial excerpt or a batch with unresolved held items.
- Return the guide's NEEDS_CHANGES, REVIEW_INCOMPLETE or READY_FOR_INTEGRATION verdict with exact scope, artifact hashes, ordered findings (severity, path, impact, evidence, correction), inspected sources and checks actually run. Distinguish baseline defects from new regressions. READY_FOR_INTEGRATION is editorial readiness only; it does not publish/import content or activate VOC-02.

Send the report to the parent for storage and writer coordination. Do not patch drafts or alter seed, migrations, manifests, database or publication flags.
