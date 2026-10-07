---
name: kotoba-learning-engines
description: Implement KotobaHub syllabus ingestion, flashcard/Leitner, lesson quiz, random practice, and write-through progress rules.
---

# Learning engines

Use for `IMP-05`–`IMP-07`, `IMP-09`, or integration of their learning state.

- Read the applicable [seed schema](../../../docs/syllabus/seed-content-schema.md), [deck mapping](../../../docs/syllabus/flashcard-deck-mapping.md), [learning activity ERD](../../../docs/erd/learning-activity.md), and feature contracts in [API docs](../../../docs/api-contract/).
- Import only published syllabus tracks for learner-facing catalog. Validate the `track -> unit -> lesson -> skill` attribution before any progress event. Use canonical skill IDs from syllabus.
- Flashcards use session-locked script pairs, multiple-choice options snapshotted at session creation, deterministic evaluation, and `NEW`/`LEARNING`/`MASTERED` item states. Item results with no official skill mapping do not update official mastery.
- A lesson post-study attempt selects one canonical `SHORT_FREE_RESPONSE` question at `min(current_understanding_level + 1, 10)` from its ten-question bank. It does not create a `practice_session`. A correct answer advances at most one level, and level `>=1` means lesson completed.
- Random practice defaults to five questions and the documented `WEAK`/`REINFORCEMENT`/`STRETCH` mix. Objective grading stays deterministic; AI is reserved for supported generation/grading cases.
- Producers write through the progress use case after each answer. Recompute skill mastery from at most the latest 20 relevant attempts and make the updated snapshot available to the next recommendation.
- Check the published seed gap recorded in [PRD](../../../PRD.md) before assuming every lesson has a complete question bank. Prefer a documented content/publish fix over inventing questions during a request.
- Follow the DDD class and port conventions in [backend boundaries](../kotoba-backend-boundaries/SKILL.md) for activity aggregates, progress entities, scheduling value objects, services, and repository implementations.
- Use the request/response DTO mapping in [backend boundaries](../kotoba-backend-boundaries/SKILL.md) for learning endpoints, especially answer submissions and progress snapshots.
