# VOC-03 Batch-02 Part-03 Independent Review

**Overall verdict: NEEDS_CHANGES.**  
**READY_FOR_INTEGRATION applies only to the 185 explicitly enumerated items below.**

Review completed on **November 20, 2026**, using actual filesystem tools and pinned raw sources. All 193 assigned identities were examined. Two authored items require isolated corrections; the six existing source-identity holds remain held. This is not approval of the entire batch or permission to publish/import the candidate unchanged.

## Findings

### F1 — P2: English “paper” creates an ambiguous option for 文章

**Identity:** `1505470` / `2fad0fbb-2d78-5b0c-8699-c58a2717ca6b`

**Locations:**
- `content/flashcards/drafts/voc-03-batch-02/part-03/content.json:13970`
- JSON paths: `$.items[40].localizations.en.distractorCandidates[0]` and `$.items[40].optionChecks.en[0].distractorCandidates[0]`
- Candidate path: `$.canonicalUpdates[427].reviewedDistractorPoolItemIds`

The English JAPANESE→MEANING prompt is `文章`. Its options include both the keyed answer **“a piece of writing”** and **“paper.”** The inspected JMdict sense 1 includes writing, composition, essay, article, passage, prose, and writing style. Unqualified English “paper” can itself denote an essay or written article, making it a defensible alternative in this context.

This is an ambiguity **inside the strict allowlist**, not a demand to evaluate unrelated global-pool targets. Indonesian `karangan` versus `kertas` does not have the same collision. No corresponding defect was identified in this item’s other five option sets.

**Concrete correction:** Replace the 紙 peer for this target with the existing reviewed 鉛筆 peer:

- Item ID: `0d5bab28-12d4-5428-b233-0378dce40357`
- `鉛筆` / `えんぴつ` / `pencil` / `pensil`
- JMdict `1178590`, sense 1; actual Yomitan N5 CSV row 93.

I inspected that replacement’s raw entry, CSV row, and batch-01 authoring record. Update the affected item’s peer declarations, six option checks, and candidate allowlist consistently, then re-review its options and recompute affected hashes. Do not merely relabel this target’s 紙 distractor while leaving the referenced peer’s actual localization unchanged.

**Disposition:** Hold this item only. Its Japanese identity and bilingual meaning package are otherwise acceptable.

### F2 — P2: 未だ’s selected continuation sense does not meet its group objective

**Identity:** `1527110` / `f5c34ad3-289d-5dac-b354-1d29bd8cd2c9`

**Locations:**
- `content/flashcards/drafts/voc-03-batch-02/part-03/curation.json:1274`
- `content/flashcards/drafts/voc-03-batch-02/part-03/curation.json:9534`
- `content/flashcards/drafts/voc-03-batch-02/part-03/content.json:22357`
- Curation paths: `$.groups[35].itemIds[4]`, `$.groups[35].localizations`, `$.items[64].proposedSkillCode`
- Candidate paths: `$.groups[134]`, `$.canonicalUpdates[451]`

The selected JMdict sense 1 supports **“still” / “masih”**: continuation of a state. The proposed group promises **“Recurring times and repeated actions” / “Waktu berulang dan tindakan berulang.”** Continuation does not establish recurrence or repetition.

The translation is correct, and all six option sets are distinguishable from the writing-supply peers. The blocker is the proposed learning objective and membership.

**Concrete correction:** Either assign this item to a continuation-focused group or explicitly revise both localized group titles/objectives to include continuation, for example:

- English: “Recurring times, repetition and continuation”
- Indonesian: “Waktu berulang, pengulangan, dan keberlanjutan”

Synchronize curation and candidate descriptions/membership and re-review the revised group objective. Do not change the valid `still` / `masih` meaning to manufacture a fit.

**Disposition:** Hold this item’s current integration mapping only. The other seven members are not rejected.

## Existing Source Holds

These are pre-existing source problems, independently corroborated—not newly introduced translation regressions.

| entSeq | Item ID | Raw evidence and retained reason |
|---|---|---|
| `2216120` | `740f0018-2f61-570a-8e1f-a1fe5411302c` | Raw entry is an attention-getting interjection; CSV row 254 says `This`. Not the demonstrative identity. |
| `2216210` | `ca3cf376-b0f2-57bf-b3ad-21c69a5c62e0` | Raw senses are attention/action interjections; sense 1 restricts reading to `それ`. CSV row 348 says `that`. |
| `2546180` | `4d47d291-c9fd-524f-aaa2-7ff3a469b697` | Raw entry is Izumo-dialect “thank you”; CSV row 375 says `gradually`. |
| `2784220` | `c6dc96d7-9ce0-5396-bee2-383b700687ca` | Raw senses concern a contest and matching. CSV row 592 supplies only ambiguous `match`; it does not resolve the intended ignition-match identity. |
| `2846389` | `4799b76c-8c17-5aa9-bbb7-c96f734634b3` | Raw entry is slang/rare “cop, police officer”; CSV row 246 says `a glass`. |
| `2847612` | `2ecdf560-9943-5db0-9c4d-39c2a0e72f70` | Raw entry contains interjections, including restricted feminine “help!” variants—not the demonstrative. CSV row 42 says `that`. |

These correspond respectively to `curation.json` paths `$.heldItems[0]` through `$.heldItems[5]`. All six are correctly absent from the candidate canonical/localization updates.

**Required resolution:** Separately review corrected lexical identity/sense and inventory/history implications. Do not silently replace an existing item’s entSeq, merge IDs, or supply the overlay’s intended meaning against the wrong raw entry.

## Coverage And Disposition

| Measure | Count |
|---|---:|
| Assigned existing IDs | 193 |
| Authored bilingual packages reviewed | 187 |
| Existing source-held IDs | 6 |
| Additional authored integration holds | 2 |
| Explicitly accepted integration subset | **185** |
| Total held identities | **8** |
| Proposed groups reviewed | 47 |
| Locale/script-pair option sets reviewed | 1,122 |
| Option sets belonging to accepted items | 1,110 |

Of the 1,122 sets, one has the English ambiguity described in F1. The grouping hold in F2 is not an option-key failure.

All 47 groups were reviewed. Forty-five can retain their current membership. The writing/post group and frequency/repetition group require either the stated fixes or accepted-only membership compilation before integration. Their unrelated accepted members remain accepted; these unpublished groups have not yet acquired immutable imported membership.

## Explicit Accepted Subset

The following **185 entSeq values**, each identifying its existing assigned item ID, are **READY_FOR_INTEGRATION editorially** under the inspected strict-peer approach:

```text
1457440, 1457560, 1459870, 1460850, 1462900, 1463480, 1463520, 1464900, 1465610, 1466940, 1467640, 1467720, 1468060, 1472740, 1473740
1473950, 1474900, 1474910, 1475480, 1476410, 1476920, 1476960, 1478750, 1479890, 1481920, 1482110, 1482290, 1483185, 1483740, 1485470
1486720, 1488000, 1490220, 1490230, 1495000, 1495770, 1499720, 1500100, 1500940, 1502390, 1505990, 1508380, 1508390, 1508590, 1512070
1512130, 1513065, 1514320, 1516925, 1516930, 1519170, 1519210, 1519290, 1520670, 1522980, 1523060, 1523940, 1524590, 1524690, 1524700
1524730, 1524930, 1526360, 1529530, 1531710, 1532350, 1532870, 1533580, 1534520, 1534890, 1536010, 1536350, 1537370, 1538160, 1542160
1542430, 1542640, 1542790, 1546020, 1546590, 1546640, 1547330, 1547450, 1547900, 1548220, 1548370, 1549140, 1551790, 1552750, 1553170
1554310, 1554370, 1555300, 1555830, 1556730, 1557110, 1557630, 1559160, 1560670, 1561470, 1562350, 1576050, 1576060, 1576260, 1576630
1576760, 1577100, 1577120, 1577200, 1577280, 1577670, 1577980, 1578010, 1579100, 1579130, 1579630, 1579840, 1580340, 1580480, 1580600
1581930, 1582300, 1582310, 1582820, 1582920, 1583090, 1583095, 1583250, 1583720, 1584350, 1584360, 1584460, 1584640, 1584800, 1584910
1584930, 1585310, 1585315, 1585650, 1586270, 1586330, 1586420, 1587040, 1587610, 1587850, 1588120, 1589500, 1589600, 1589730, 1592250
1592340, 1592970, 1595020, 1597150, 1597530, 1597890, 1598550, 1600430, 1600790, 1600850, 1600900, 1601340, 1602340, 1602710, 1603990
1604230, 1604890, 1605820, 1605870, 1606560, 1607260, 1612860, 1920240, 2005860, 2013900, 2136180, 2147990, 2220600, 2225040, 2261490
2261500, 2839962, 2842390, 2845606, 2846738
```

## Source And Baseline Examination

- Inspected actual raw JMdict entries for **all 193 assigned entSeq values**: all spelling/reading forms and their metadata, every authored selected sense, POS/inheritance, `stagk`, `stagr`, `re_restr`, `re_nokanji`, register, usage notes, fields, dialects, and cross-references.
- All 187 authored items select sense 1 except **肉 `1463520`, sense 2**. Inspected all senses of the six source-held entries to verify their unresolved identities.
- Matched **198 actual N5 CSV rows** covering the 193 assigned entries, including repeated overlay representations—not just one sampled row per entry.
- Independently inspected peer raw entries and actual CSV rows: 紙 `1311530` sense 1 / row 164; 切手 `1385070` sense 1, with its unrelated second sense distinguished / row 186; 封筒 `1499690` sense 1 / row 540.
- Additionally inspected 鉛筆 `1178590` for the concrete F1 correction. Total distinct raw entries inspected: **197**.
- Compared all assignment records with the current canonical baseline and all 193 stable codes/forms with the pending registry. Checked the complete 749-item inventory for matching source identities and mapped-form overlap.
- Confirmed the documented pre-existing mapped duplicates for 半分 `1479890` and 然し `1505990`. Curation records both IDs correctly. This proposal preserves existing identities; the review does not authorize merging or remapping them.
- Audited all proposed canonical narrowing against the baseline first: **97 JAPANESE arrays and 71 KANA arrays change across the 187 authored proposals**. Retained primary spelling/reading pairs satisfy their selected raw restrictions. Approval does not claim excluded, otherwise valid alternate forms are linguistically incorrect.
- Checked both locales independently and comparatively. Empty examples, null explanations, and empty aliases are intentional—not missing deliverables.

## Independently Recomputed SHA-256

Hashes below were recomputed from actual bytes and rechecked at completion. The scoped artifacts and six declared baselines remained unchanged during the review.

| Artifact | SHA-256 |
|---|---|
| `part-03/assignment.json` | `16ef8c75433a5883173ee9634c85547610c3b45b7277acc1383346dd06c1f98d` |
| `part-03/curation.json` | `ca116850ecab0d72d5e2b007a4b2d583411e41ffb210bb9db15a52f858591721` |
| `part-03/content.json` | `d67cf30306d4030579095a9ade88b6d7f09f6930d88a925be139fea7f698fd7b` |
| Batch-02 `integration-candidate.json` | `76dc03ecb6bb854cf0df4c40c00284f89d09d9118ff5ff579b33c36f84dc91a3` |
| `content/flashcards/system-decks/vocabulary-foundation.json` | `120f15b6c9244caf27bd45b1542dc175e855e04b45a9ad9e43033d22d1172c58` |
| `content/flashcards/system-decks/vocabulary-foundation-pending-n5-skill-codes.json` | `0514ee860f6689047a414c4474d827d4fe04fba95f3c837b3066e63c1a5448c4` |
| `content/flashcards/system-decks/localizations.v2.json` | `19701499a5e780a134ea7adb7fbabff5d31000f900d13f8081e5169082c4fd2c` |
| `content/flashcards/vocabulary-groups/manifest.v2.json` | `6e5f29e60464b64b436365cba08519b7b574622671c0abf0bc06d86174032a42` |
| `content/syllabus/sources/jmdict/raw/2026-05-16/JMdict_e.gz` | `cb94bc83370f4adee89c8d5921c213c061bab0c6b0a018ec9edc5655bd03e4bb` |
| `content/syllabus/sources/yomitan-jlpt-vocab/raw/2026-05-16/source-main.zip` | `bc8b547ff23bcefddb03904327b499c327ea914867a66f60fd2e694328c44560` |

The first three paths are relative to `content/flashcards/drafts/voc-03-batch-02/`; the candidate is in that directory directly.

## Commands And Checks Actually Executed

- Read guidance with `sed -n`, `cat`, and `wc -l`: `AGENTS.md`, task breakdown, all four required flashcard references, and the five requested skills.
- Used `rg --files`, `rg -n`, and `command -v python3` for scoped artifact discovery, exact finding locations, and interpreter discovery.
- Executed in-memory `python3 - <<'PY'` inspections using `gzip`, `re`, `xml.etree.ElementTree`, `zipfile`, `csv`, `json`, `hashlib`, and Unicode normalization. Assigned semantic-table selections covered indices `[0:35]`, `[35:65]`, `[65:85]`, `[85:105]`, `[105:125]`, `[125:145]`, `[145:165]`, `[165:185]`, and `[185:193]`; targeted follow-ups recovered truncated output and examined relevant polysemy and holds.
- Ran independent scoped cross-file checks for coverage, stable identity, duplicate evidence, source metadata, physical CSV rows, group ownership/membership, publication flags, revisions, source references, canonical updates, localization updates, and strict peer IDs/values.
- Evaluated every item’s three directions in both locales against the reviewed meanings/forms and actual peer options, then compared the derived answers with the maker keys. All **1,122** sets pass mechanical identity/key/normalization checks; F1 is the editorial ambiguity those checks do not detect.
- Executed `PYTHONDONTWRITEBYTECODE=1 python3 scripts/flashcards/validate_vocabulary_draft.py`. It passed and reported 581 assigned, 574 authored, seven source-held, 146 groups, 3,444 mechanical option checks, zero promotions, and existing overall `REVIEW_INCOMPLETE`. That broader mechanical run is **not** independent editorial approval of parts 01/02.
- Resolved exploratory checker issues: unavailable `python` was replaced by `python3`; an incorrect inspection field name was corrected; a uniqueness assertion exposed the two documented existing mapped duplicates; XML empty-element `None` versus serialized `""` was normalized. Rechecking all reading metadata—including **13 `re_nokanji` markers**—produced no discrepancies.

## Remaining Limits And Integration Boundary

No assigned item remains uninspected. Remaining blockers are the two exact editorial findings and six retained source holds—not missing filesystem evidence.

JLPT placement remains heuristic, not proof that the overlay attests each selected sense. This review does not verify generated runtime banks after compilation, importer execution, database preservation, deployment, or production rollout. Parent integration must bind the accepted subset to these hashes, exclude held identities, preserve the five existing promoted items, and perform the supported runtime validations.

No project file was edited, including `review.md`; no subagents were spawned; no seed/import/database/publication operation was performed. No credentials, `.env` files, private keys, or authentication configuration were read, and no provider call was made.