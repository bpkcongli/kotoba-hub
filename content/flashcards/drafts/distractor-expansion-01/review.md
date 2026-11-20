# TD-006 independent distractor review — READY_FOR_INTEGRATION

Verdict: `READY_FOR_INTEGRATION` for all 746 active vocabulary items and all
4,476 reviewed peer references in the exact artifacts listed below. This is
editorial approval of the draft pools; it does not publish content, replace the
canonical seed, import a database, or activate the 110 items outside the current
published catalog.

Independent reviewers:

- `/root/td006_full_review`: full-batch review and post-correction delta review.
- `/root/td006_review_a`: independent review of proposal indices `0..372`.
- `/root/td006_review_b`: independent review of proposal indices `373..745`.

The integration coordinator `/root` saved this report from the reviewers'
read-only results. The reviewers did not edit files or write a database.

## Artifact binding

| Artifact | SHA-256 |
| --- | --- |
| `assignment.json` | `469b4a6ed616f1cc9400690f89458ef977bd296aceee21a3f020de5ec76e1986` |
| `baseline.json.gz` | `7750813347f53e9a5074e5fc8a73e04c8edd970329c1fa7a9beb189759940f90` |
| `exclusions.json` | `7908337820d3ada5e1d78bb099c585acc4b5536e51902ec2777fd0f36c85a7df` |
| `curation.json` | `208b6551747c1d66fcb1d96419835a3823905062f0dd6302b9dc98225e8554af` |
| `proposals.json` | `edb699d1b220fc3f5aad32b2fea67800a2235a9bf0984ebaec585c338196a6fa` |
| `JMdict_e.gz` | `cb94bc83370f4adee89c8d5921c213c061bab0c6b0a018ec9edc5655bd03e4bb` |

The baseline archive still contains the canonical vocabulary artifact, bilingual
overlay, pending registry, and vocabulary-group manifest at the hashes pinned in
`assignment.json`. Target revisions remain `contentRevision: 5` and
`translationRevision: 5`.

## Findings and corrections

The initial full and split reviews rejected ten additional semantic pairs beyond
the two sample exclusions already present. The rejected pairs were:

- 黒い / 汚い
- 玄関 / ドア
- テープレコーダー / ラジカセ
- 次に / そうして
- 言う / 話す
- 其れに / そうして
- 其れに / そして
- ゆっくり / だんだん
- 背広 / 服
- 広い / 大きな

Each pair is now recorded bidirectionally in `exclusions.json` with its source
and reason. Regeneration changed exactly 15 target pools and replaced 16 rejected
references with 16 reviewed peers. The reviewers rechecked all 90 references in
those pools and confirmed that the other 731 pools remained unchanged. No
reviewed exclusion remains in the proposal.

## Review coverage

- Reviewed 746 targets, six peers per target, and 4,476 target-to-peer references.
- Solved all required legacy, English-localized, and Indonesian-localized option
  directions: 6,324 target/locale/script combinations in total.
- Covered 616 targets with Indonesian packages and 130 targets using the existing
  whole-package English fallback.
- Checked raw JMdict senses, cross-references, spelling and reading restrictions,
  POS/register notes, Japanese/kana aliases, English meanings, and Indonesian
  meanings. All 722 stored source excerpts matched the pinned raw snapshot.
- Checked both answer directions for synonym/sense overlap, homographs, valid
  alternate readings, translated equivalents, duplicate values, and answer-alias
  leakage.
- Preserved item/deck IDs, lexical content, ownership, membership, canonical
  answers, translations, publication flags, progress identity, and Leitner keys.

The split reviewers independently approved 373 targets each after the correction.
The full reviewer approved the combined 746-item artifact and confirmed zero held
items and zero remaining blocking pairs.

## Checks run by reviewers

- `python3 scripts/flashcards/validate_distractor_expansion.py`
- `bun scripts/flashcards/audit_distractor_expansion.ts`
- `bun scripts/flashcards/audit_distractor_expansion.ts --all-active`
- Independent comparisons of the old and regenerated proposal to isolate the 15
  changed targets and inspect every replacement.

The mechanical validators reported 746 items, 4,476 peer references, 606 distinct
peers, maximum peer frequency 17, and no undersized bank. Those checks support but
do not replace the editorial review recorded here.

## Database validation

Disposable MySQL validation completed on `2026-11-20` with MySQL `8.4.13`.
The focused smoke test established a revision `4/4` baseline, imported the
reviewed revision `5/5` plan twice, and left 636 runtime-eligible vocabulary rows
active and mapped at revision 5. It preserved IDs, group ownership, custom deck
membership, Leitner state, progress/history, frozen options, and old-answer replay.
New deterministic sessions selected different triples from the six-peer pools,
while same-revision drift and revision rollback failed without partial writes.
Full evidence is recorded in `database-validation.md`.

## Boundary

Editorial review, disposable database validation, and canonical seed promotion
are complete. The reviewed revision `5/5` artifact pair was copied byte-for-byte
to `content/flashcards/system-decks/`. No production database was written;
release rollout remains under BIL-08/DEP-05.
