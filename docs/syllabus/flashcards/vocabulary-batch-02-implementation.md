# VOC-03 batch 02 reviewed vocabulary integration

## Result

Batch `voc-03-batch-02` reviewed all 581 IDs that remained pending after batch 01.
The three independent reviews accept 574 authored bilingual packages and 146
standalone vocabulary groups. The compiler appends those groups to the preserved
batch-01 manifest, updates selected canonical answers and bilingual overlays, and
keeps the candidate itself unpublished.

| Measure | Result |
| --- | ---: |
| Assigned / accepted / source-held | 581 / 574 / 7 |
| Runtime groups / promoted items | 147 / 579 |
| Eligible mapped / pending items | 632 / 7 |
| Content / translation revision | 3 / 3 |

The accepted scope and artifact hashes are recorded in
[coverage.json](../../../content/flashcards/drafts/voc-03-batch-02/coverage.json)
and [integration.json](../../../content/flashcards/drafts/voc-03-batch-02/integration.json).
The independent reports are stored per part with their original review and
revision artifacts. No production import, migration, seed, or deployment occurs.

## Review corrections

The review retained existing item IDs, selected senses, readings, memberships and
historical session ownership. It prefers ordinary same-entry spellings over
rare/search-only forms for 29 displays. It also replaces the ambiguous English
`paper` peer for 文章 with reviewed 鉛筆/`pencil`/`pensil`, and makes the affected
group objectives include running and continuation for 走る and 未だ.

## Source-held identities (historical batch-02 result)

The seven items below remain pending because their existing JMdict identity does
not support the intended Yomitan overlay meaning: `1182880`, `2216120`, `2216210`,
`2546180`, `2784220`, `2846389`, and `2847612`. Resolve each by a separate
identity/history review; do not silently remap its existing ID or manufacture an
overlay meaning. The full evidence is in `coverage.json` and the part reviews.

## Verification boundary

`python3 scripts/flashcards/validate_vocabulary_draft.py` validates the complete
source, review and integration chain without a database. Targeted unit tests
exercise the compiled manifest, strict reviewed distractor pools and seven held
fallbacks. The MySQL smoke test and any importer dry run use a separate empty
test database. Production rollout remains a separate operation.

## Subsequent resolution

Batch 03 resolves these seven holds through reviewed identity retirement,
deduplication and four new corrected identities. Current runtime and bootstrap
instructions are in [the identity-resolution report](vocabulary-held-identity-resolution.md).
The counts/revisions above describe the historical batch-02 result; its validator
and tests verify the exact archived pre-batch-03 strings in `baseline.json.gz`
against the original integration hashes. Original review files remain unchanged.
