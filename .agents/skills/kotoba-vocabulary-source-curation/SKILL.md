---
name: kotoba-vocabulary-source-curation
description: Curate KotobaHub vocabulary candidates from JMdict and JLPT overlays with sense-level evidence and stable lexical identity.
---

# Vocabulary source curation

Read the [task breakdown](../../../docs/task-breakdown.md), relevant task references and [vocabulary guide](../../../docs/syllabus/flashcards/vocabulary-authoring-guide.md). Use its curation handoff format; it is not an importer schema.

- Start from the assigned item IDs and baseline hashes. Inspect the raw JMdict entry, not only generated flat glosses. Record ent_seq, snapshot/checksum, selected one-based sense ordinals, English glosses, POS and relevant spelling/reading restrictions. Sense ordinals identify a location in that snapshot, not a permanent dictionary sense ID.
- Resolve primary spelling and reading for the selected meaning. Account for sense stagk/stagr and reading re_restr, register/usage tags and inherited POS. A shared dictionary entry does not make every alternate form interchangeable.
- Use the Yomitan overlay as a heuristic JLPT signal. Record its actual source row/entry reference and distinguish source evidence from internal placement decisions. Do not attribute Indonesian editorial translations to the English JMdict snapshot.
- Match against existing pending and mapped inventory by entry and sense/form context, preserving item IDs. Surface suspected duplicates or source disagreements instead of changing official ownership or deleting an existing item.
- Write only the assigned curation draft. Preserve runtimeMapping and keep candidate groups unpublished. Assign unsupported candidates to heldItems with evidence needed. Report exact checked entries/sources, accepted/held coverage, baseline hashes and actual checks; JSON parsing alone is not content review.

For grouped objectives, use [curriculum mapping](../kotoba-vocabulary-curriculum-mapping/SKILL.md). No generator execution or seed import is required to curate sources.
