# VOC-03 Batch-02 Part-03 — Final Independent Follow-up

**Verdict: READY_FOR_INTEGRATION for the 187 authored part-03 items enumerated below.** The two findings in the initial review are resolved. Six part-03 source-identity holds remain excluded. This is editorial approval of this subset against the exact artifacts below—not approval of all 581 batch items, publication, import, or runtime readiness. The shared candidate remains unpublished and marked `REVIEW_INCOMPLETE`.

## Resolution and checks

- **文章 (`1505470`):** The ambiguous 紙/“paper” peer is replaced by the already reviewed 鉛筆 (`1178590`) peer. I revisited its JMdict sense 1, N5 CSV row 93 and batch-01 package, then solved all six updated en/id option sets. Their prompts, answers, peer values and strict candidate pool IDs agree; none has the former “paper” ambiguity.
- **未だ (`1527110`):** JMdict sense 1 supports “still”/“masih,” not repetition. Both localized frequency-group titles and objectives now explicitly include continuation. Its eight members retain their identities and membership.
- **Displays and groups:** All nine part-03 preferred forms—and all 29 batch-level display changes visible in the shared candidate—were checked against their raw JMdict entries. Each is a same-entry unmarked spelling or ordinary kana preference, not a new identity. The candidate’s item IDs, KANA and English answers, peer pools, and localized meanings remain unchanged for those 29 changes; the authored part-03 displays, Japanese answers, option prompts/keys and overlays agree. The ground-movement objective now includes running in both languages; its five members’ raw entries and CSV rows were revisited.
- **Artifact chain:** The *entire* archived-to-current curation and content trees were compared field by field. The differences are exactly `corrections.json`: 31 curation and 104 content field changes, with `null` before-values denoting nine added `canonicalProposal` fields. Assignment and active baseline identities remain stable. All 187 authored items occur once in 47 groups; all 1,122 current en/id option sets were resolved against the actual batch-01 peer packages and checked for key, value, normalized collision and projection consistency. All 187 scoped candidate canonical updates, localized overlays and strict pool IDs match the current authoring.
- **Source scope:** The initial report’s exhaustive examination of all 193 assigned identities is retained because the complete original/current diff is accounted for. This follow-up **directly reinspected the corrected entries, affected group members, cited finding/hold entries and replacement peers**, including their relevant raw dictionary and CSV evidence; it did not repeat every initial raw-source inspection. The read-only draft validator also passed. No project file, seed, DB or publication state was changed. As authorized, the reviewed material was available to the existing Mampu Orbit inference provider; this is **not** a claim that no material was sent to it.

## Exact SHA-256

| Artifact | SHA-256 |
|---|---|
| Current `part-03/assignment.json` | `16ef8c75433a5883173ee9634c85547610c3b45b7277acc1383346dd06c1f98d` |
| Current `part-03/curation.json` | `211ce823200ebabab244a69aac8d6b5db74848a152110865132ab1b72345c85c` |
| Current `part-03/content.json` | `e48cfe03e04233dfd36a22a7b9d4a36d66b8f9e5523cfb917042cd4d5f018c47` |
| Current batch `integration-candidate.json` | `8cc59ac5f145562d559f541269b596252bb7f6bfe87970b7bc2d6732f892594e` |
| Archived `part-03/revision-01/curation.json` | `ca116850ecab0d72d5e2b007a4b2d583411e41ffb210bb9db15a52f858591721` |
| Archived `part-03/revision-01/content.json` | `d67cf30306d4030579095a9ade88b6d7f09f6930d88a925be139fea7f698fd7b` |
| Archived batch `baseline/integration-candidate.json` | `76dc03ecb6bb854cf0df4c40c00284f89d09d9118ff5ff579b33c36f84dc91a3` |
| Initial `part-03/review-initial.md` | `e3b2a2f392dbb2f554fec70531395af85cf95bc26a7cf0c535cf91e6ad7f7476` |
| Raw `JMdict_e.gz` | `cb94bc83370f4adee89c8d5921c213c061bab0c6b0a018ec9edc5655bd03e4bb` |
| Raw Yomitan `source-main.zip` | `bc8b547ff23bcefddb03904327b499c327ea914867a66f60fd2e694328c44560` |

The archived curation, content and candidate hashes match those cited in the initial review. The four active artifact hashes cited there—canonical vocabulary `120f15b6…d1172c58`, pending registry `0514ee86…2d1172c4`, localizations `19701499…2c4fd2c`, and manifest `6e5f29e6…74032a42`—were recomputed and match both their assignment declarations and archived baseline copies.

## Accepted identities

These **187 entSeqs**, each retaining its assigned existing item ID, comprise the complete part-03 authored subset approved editorially:

```text
1457440, 1457560, 1459870, 1460850, 1462900, 1463480, 1463520, 1464900, 1465610, 1466940, 1467640, 1467720, 1468060, 1472740, 1473740
1473950, 1474900, 1474910, 1475480, 1476410, 1476920, 1476960, 1478750, 1479890, 1481920, 1482110, 1482290, 1483185, 1483740, 1485470
1486720, 1488000, 1490220, 1490230, 1495000, 1495770, 1499720, 1500100, 1500940, 1502390, 1505470, 1505990, 1508380, 1508390, 1508590
1512070, 1512130, 1513065, 1514320, 1516925, 1516930, 1519170, 1519210, 1519290, 1520670, 1522980, 1523060, 1523940, 1524590, 1524690
1524700, 1524730, 1524930, 1526360, 1527110, 1529530, 1531710, 1532350, 1532870, 1533580, 1534520, 1534890, 1536010, 1536350, 1537370
1538160, 1542160, 1542430, 1542640, 1542790, 1546020, 1546590, 1546640, 1547330, 1547450, 1547900, 1548220, 1548370, 1549140, 1551790
1552750, 1553170, 1554310, 1554370, 1555300, 1555830, 1556730, 1557110, 1557630, 1559160, 1560670, 1561470, 1562350, 1576050, 1576060
1576260, 1576630, 1576760, 1577100, 1577120, 1577200, 1577280, 1577670, 1577980, 1578010, 1579100, 1579130, 1579630, 1579840, 1580340
1580480, 1580600, 1581930, 1582300, 1582310, 1582820, 1582920, 1583090, 1583095, 1583250, 1583720, 1584350, 1584360, 1584460, 1584640
1584800, 1584910, 1584930, 1585310, 1585315, 1585650, 1586270, 1586330, 1586420, 1587040, 1587610, 1587850, 1588120, 1589500, 1589600
1589730, 1592250, 1592340, 1592970, 1595020, 1597150, 1597530, 1597890, 1598550, 1600430, 1600790, 1600850, 1600900, 1601340, 1602340
1602710, 1603990, 1604230, 1604890, 1605820, 1605870, 1606560, 1607260, 1612860, 1920240, 2005860, 2013900, 2136180, 2147990, 2220600
2225040, 2261490, 2261500, 2839962, 2842390, 2845606, 2846738
```

## Source-held identities

The seven **batch-level** source-identity holds remain excluded; none is made ready by this part-03 verdict:

| Part | entSeq | Existing item ID | Unresolved identity |
|---|---|---|---|
| 01 | `1182880` | `e007da8f-ebfc-5d41-9b8a-11373171bbd3` | Raw 牡丹/peony versus overlay ボタン/button |
| 03 | `2216120` | `740f0018-2f61-570a-8e1f-a1fe5411302c` | Attention-getting interjection versus demonstrative |
| 03 | `2216210` | `ca3cf376-b0f2-57bf-b3ad-21c69a5c62e0` | Interjection versus demonstrative |
| 03 | `2546180` | `4d47d291-c9fd-524f-aaa2-7ff3a469b697` | Izumo “thank you” versus “gradually” |
| 03 | `2784220` | `c6dc96d7-9ce0-5396-bee2-383b700687ca` | Contest/matching versus unresolved ignition-match identity |
| 03 | `2846389` | `4799b76c-8c17-5aa9-bbb7-c96f734634b3` | Slang “cop” versus drinking vessel |
| 03 | `2847612` | `2ecdf560-9943-5db0-9c4d-39c2a0e72f70` | Interjection versus demonstrative |

The parent must bind integration to the reviewed hashes and accepted IDs. Importer, dry-run, database preservation, runtime-bank and rollout verification remain the parent’s responsibility.