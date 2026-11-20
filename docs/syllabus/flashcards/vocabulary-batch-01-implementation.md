# VOC-03: N5 letter-writing vocabulary batch

## Scope and result

Batch `voc-03-batch-01-n5-letter-writing` assigns six existing pending vocabulary
items. Five are integrated through the explicit VOC-02 manifest; one is held.
This is a reviewed subset, not a claim that the remaining pending bank or all
Indonesian vocabulary content is complete. No production database was changed.

| Item | English / Indonesian meaning | Integration |
| --- | --- | --- |
| 鉛筆 | pencil / pensil | Accepted |
| 紙 | paper / kertas | Accepted |
| 切手 | postage stamp / prangko | Accepted |
| 手紙 | letter (written message) / surat | Accepted |
| 封筒 | envelope / amplop | Accepted |
| ボールペン | ball-point pen / bolpoin | Held: global English distractor `pen` is also valid |

The five-member group is `n5_vocab_letter_writing_supplies`, ID
`f4bce066-e07c-58b0-8b7e-1097b7515f08`, owned directly by `jlpt-n5-foundation`.
It creates no lesson, unit, lesson completion or understanding snapshot.
Membership is immutable after import. The held item cannot later be appended
without a separately designed group/migration decision.

## Sources, delegation and independent review

- `vocabulary-curator` inspected complete pinned JMdict entries and Yomitan N5
  CSV rows, then wrote [curation.json](../../../content/flashcards/drafts/voc-03-batch-01/curation.json).
- `flashcard-maker` consumed its exact checksum and wrote equivalent English and
  Indonesian [content.json](../../../content/flashcards/drafts/voc-03-batch-01/content.json),
  including all 36 named peer option checks. Examples are empty and explanations
  null; integration does not discard unsupported authored fields.
- `flashcard-reviewer` independently inspected raw sources, both drafts, actual
  compiled global banks and final integration hashes. The parent recorded the
  verdict, findings and exact scope in [review.md](../../../content/flashcards/drafts/voc-03-batch-01/review.md).
- The parent owns runtime compilation, active artifact changes, coverage,
  packaging and verification. `sdet` owns the focused real-content MySQL smoke.

The reviewer role's stale lesson-only ownership instruction was aligned with
the VOC-02 contract. Lesson-owned skills still require a published lesson;
standalone drafts still require explicit reviewed integration.

JMdict supplies lexical evidence, not JLPT labels. Yomitan N5 is a heuristic level
signal. Indonesian meanings are editorial translations of the selected senses.
All authoring draft flags remain false; only the separate reviewed runtime
manifest is published for explicit import.

The review found an existing 切手 alias from unrelated sense 2,
`merchandise certificate`. Integration removes only that canonical English alias;
the postage sense retains `stamp (postage)` and `postage stamp`. 鉛筆 still displays
えんぴつ; existing search-only エンピツ answer acceptance is documented, not taught
as the preferred reading. No item/deck IDs, registry entries, Japanese answers or
deck memberships changed. The v1 generator was not run.

## Runtime integration and revisions

The [runtime manifest](../../../content/flashcards/vocabulary-groups/manifest.v2.json)
contains exactly the five accepted existing item IDs and pending skill codes.
The [localization overlay](../../../content/flashcards/system-decks/localizations.v2.json)
adds only those five bilingual meaning entries. It does not add a package for
held ボールペン or claim its existing English option problem is fixed.

Global flashcard content/translation revisions increase from `1/1` to `2/2`
because the canonical alias, provenance and option pools changed. Existing
overlay entries remain intact. The newly created group separately starts at
content revision `1`, with current en/id source/translation revisions `1/1`.
Old sessions retain frozen options, localization and pending attribution;
only newly created sessions use the explicit promotion.

The ops allowlist includes only the runtime manifest in the new directory.
Authoring drafts and raw sources stay excluded. Runtime source references are
audit references to the repository and do not require bundling those sources.

## Coverage and fallback

[coverage.json](../../../content/flashcards/drafts/voc-03-batch-01/coverage.json)
records assigned/accepted/held IDs, reviewed runtime bank fingerprints and release
artifact hashes. The current published bilingual 16-lesson N5 catalog produces:

| Metric | Result |
| --- | --- |
| Assigned / editorially accepted | 6 / 6 |
| Runtime accepted / held | 5 / 1 |
| Named peer option sets / accepted runtime pairs | 36 / 30 |
| Eligible system decks / items / memberships | 66 / 639 / 639 |
| Mapped / pending after explicit promotion | 58 / 581 |
| English packages | 66 decks / 639 items |
| Indonesian packages | 66 decks / 35 items |
| Items using English fallback when Indonesian is requested | 604 |
| Canonical Indonesian vocabulary overlay | 43 of 749 vocabulary IDs |

The canonical overlay previously covered 38 vocabulary IDs; this batch adds five.
Eight of the resulting 43 remain outside this particular published catalog, so
the eligible Indonesian count is 35. Of the original 586 pending IDs, 580 were
outside the assigned six-item scope; these were not reviewed. The original
pending registry is preserved as identity evidence even after explicit promotion.
Counts depend on catalog publication and must not be presented as production data.

## Verification

- `bun run test:ci`: 72 suites / 817 tests passed. The seven real-content tests
  recompute reviewed option-bank fingerprints and exercise all three localized
  script pairs in both languages for each accepted item.
- Lint, TypeScript, Prettier, whitespace checks and four offline release checks
  passed. The new smoke script also passed TypeScript and Bun syntax checks.
- Offline group CLI dry run: one group, five items, `imported: false`.
- MySQL 8.4 smoke passed on a new empty database named `kotoba_voc03_content_test`
  in a local disposable test container, separate from application data. Applied
  migrations, seeded v1, merged bilingual v2, imported the actual group twice
  and imported promoted flashcards twice. Existing item state, custom membership,
  pending session/answer rows and answer replay remained identical. Another old
  pending turn still produced no official progress after promotion.
- Six newly created locale/script-pair sessions contained the five exact IDs,
  group ownership and current `2/2` localization without fallback. Completing
  the Indonesian Japanese-to-meaning session produced five idempotent group
  events, null lesson/unit attribution and no lesson understanding/completion.
  The held pen retained its pending owner and English fallback.
- The public flashcard seed CLI dry run against that database returned exactly
  the recorded 66/639/58/581 counts and Indonesian coverage of 35 items.
- Docker context/app/ops verification passed, including a production app build,
  checksums, excluded credentials/raw sources/drafts, and the packaged runtime
  manifest dry run under `--network none`. Default build networking stalled at
  dependency installation; a temporary build-only host-network wrapper allowed
  the same verifier and Dockerfile to complete with the frozen lockfile.

The DB preservation smoke covers sessions created before group promotion using
the current translation artifacts. It does not reconstruct and test every
historical revision-1 session payload. Existing frozen-session/revision tests
also ran in the full suite. No production migration, seed or deployment ran.

## Operations and remaining work

Follow the [VOC-03 seed runbook](../../../drizzle/README.md#voc-03-reviewed-vocabulary-batch):
validate and import the runtime group manifest, then seed flashcards with the same
complete manifest. Both operations are repeatable. Later reseeds must retain all
previously promoted groups; omitting them would attempt a rejected demotion.
Do not pass authoring drafts to either importer.

Production migration/seed/deployment remains a separate rollout. Resolving the
held pen requires reviewed semantic distractor control; adding more words to
this immutable five-member group is not a shortcut. Other pending vocabulary and
Indonesian fallback coverage require further assigned batches.
