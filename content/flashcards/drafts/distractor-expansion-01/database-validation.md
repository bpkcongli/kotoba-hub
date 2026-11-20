# TD-006 disposable MySQL validation — PASS

Validated on `2026-11-20` with MySQL `8.4.13` in the isolated
`kotoba_td006_test` database. The database name ended in `_test`, differed from
the regular `DATABASE_URL`, and was backed by a disposable container using
temporary storage.

Command:

```sh
bun run test:distractor-expansion --allow-test-db-write
```

The smoke test in `scripts/smoke/smoke-distractor-expansion.ts` has SHA-256
`b32c4b51f4c5d66a083196d88cc095f596df586c3a4777bca1d852dfed6370d5`.

## Result

- Applied all Drizzle migrations to an empty database and imported the bilingual
  syllabus plus the complete 151-group VOC-03 manifest.
- Established the active revision `4/4` baseline, including a custom deck, frozen
  localized session, recorded answer, Leitner state, and progress history.
- Prepared the reviewed revision `5/5` plan without replacing active canonical
  files. The plan contained 636 runtime-eligible vocabulary items, all mapped,
  with zero pending items.
- Verified every runtime-eligible legacy and localized bank had at least six
  distinct distractors after planner filtering. The reviewed ledger still covers
  all 746 active canonical vocabulary items; 110 remain outside the currently
  published runtime catalog.
- Imported revision 5 twice successfully. The resulting database contained 636
  active mapped vocabulary rows, all at `content_revision = 5`.
- Preserved item IDs, skill ownership, custom deck membership, Leitner state,
  frozen session/options, the recorded answer, and progress history across the
  reseed.
- Replayed the old answer idempotently and answered another frozen revision-4
  turn after the reseed without changing its option snapshot or localization
  revisions.
- Created new revision-5 sessions with deterministic opposite selections and
  observed different three-distractor combinations, each drawn from the reviewed
  six-peer pool with exactly one correct answer.
- Rejected same-revision content drift and revision-4 rollback, and verified the
  failed imports left all flashcard item rows unchanged.

Final database evidence:

```text
MySQL version: 8.4.13
Vocabulary rows by content revision: 5 = 636
Vocabulary rows / mapped / active: 636 / 636 / 636
Custom decks: 1
Frozen and new sessions: 3
Recorded answers: 2
Progress events: 2
```

This validation made the reviewed artifact pair ready for canonical seed
promotion and database integration. At validation time it did not replace the
active canonical files or perform production rollout.

## Canonical promotion

On `2026-11-20`, the reviewed artifact pair was promoted byte-for-byte to:

- `content/flashcards/system-decks/vocabulary-foundation.json`
- `content/flashcards/system-decks/localizations.v2.json`

The resulting canonical SHA-256 values are respectively
`6ff3689eb435e0e9d96778ce152cac804c711b9fa7209d2055b966507bf7ebc3` and
`7341ef7527a2c6eac3c41fa10b77c679bc5d0cdac8aed11a99eaf2b22c2c0496`.
The focused MySQL smoke was then rerun with revision 4 loaded from the archived
baseline and revision 5 loaded directly from the canonical paths; it passed all
preservation, variation, repeatability, and rollback checks again.

The standard seeder entrypoints also read the promoted canonical files
successfully:

```text
dry-run/import decks: 66
dry-run/import items: 636
dry-run/import memberships: 636
mapped/pending: 636 / 0
English localization coverage: 66 decks / 636 items
Indonesian localization coverage: 66 decks / 608 items
database vocabulary revision after import: 5 = 636 rows
```

Production database import and application rollout remain under the
BIL-08/DEP-05 release boundary.
