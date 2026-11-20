# VOC-03 Batch-02 Part-02 Independent Review

**Verdict: READY_FOR_INTEGRATION — only for the 194 explicitly enumerated part-02 items below.**

Review date: November 20, 2026, Asia/Jakarta.

This is editorial acceptance of an unpublished subset, not approval of the entire batch, publication, import, or database execution. The seven existing batch-level source-identity holds remain unresolved.

## Scope And Coverage

Reviewed artifacts under `content/flashcards/drafts/voc-03-batch-02/`:

- `part-02/assignment.json`
- `part-02/curation.json`
- `part-02/content.json`
- Corresponding item updates, localization updates, and 40 groups in `integration-candidate.json`

| Measure | Result |
|---|---:|
| Assigned items | 194 |
| Curated items | 194 |
| Authored bilingual items | 194 |
| English/Indonesian packages | 388 |
| Reviewed groups | 40 |
| Reviewed option sets | 1,164 |
| Accepted assigned items | 194 |
| Held assigned items | 0 |
| Assigned items with blocking findings | 0 |
| Existing batch-level source holds retained | 7 |

All assigned items appear exactly once in the reviewed group membership. All candidate publication flags remain false.

## Findings

**No blocking content, identity, source-restriction, bilingual-equivalence, or option-ambiguity finding was established for this assigned subset.**

Two nonblocking editorial observations follow.

### 1. P3 — Consider making the 早い spelling distinction clearer

- Identity: entSeq `1404975`, itemId `4c9de509-9734-545b-923e-e4566ca67bfa`.
- Paths: `part-02/curation.json → $.items[133].senseEvidence`; `part-02/content.json → $.items[133].japanese.acceptedAnswers`; corresponding `integration-candidate.json → $.canonicalUpdates[?(@.itemId=="4c9de509-9734-545b-923e-e4566ca67bfa")]`.
- Evidence: selected JMdict sense 1 supports “fast/quick” and notes `esp. 速い`; sense 2 restricts “early” to `早い`. The actual N5 CSV contains both `早い,early` and `速い,quick`.
- Assessment: `esp. 速い` is a usage preference, not an exclusive `stagk` restriction. The reviewed `早い / fast / cepat` bank therefore does not establish an invalid answer, particularly against the three unrelated writing-supply peers.
- Optional improvement: add a short bilingual spelling distinction, or separately review admitting `速い` as a selected-sense answer. Do not silently replace the existing item identity or primary display.

### 2. P3 — The ground-movement objective could explicitly include running

- Identity: entSeq `1402540`, itemId `00218572-5b24-56a2-b32b-bf13f1642a1c` is **not asserted here**; use the entSeq selector to resolve the authoritative itemId.
- Paths: `part-02/curation.json → $.groups[26].localizations.{en,id}.objective`; corresponding candidate group with code `n5_vocab_b02p02_ground_movement`.
- Evidence: the group includes `走る / run / berlari`, but its objective lists stopping, climbing, and crossing.
- Assessment: the item fits the broader ground-movement theme; this is an incomplete enumeration, not a false lexical assignment.
- Optional correction: change the English objective to “Recognize the Japanese words for running, stopping, climbing and crossing,” with equivalent Indonesian wording, and mirror it into the candidate group description.

Neither observation changes the accepted subset.

## Source And Semantic Review

I independently opened the pinned gzip and ZIP, parsed actual JMdict XML entries, and inspected actual CSV rows—not merely copied curation evidence.

### Assigned entries

- All **194 assigned JMdict entries** were inspected.
- Every assigned item selects **sense ordinal 1** in this pinned snapshot.
- All **198 matching N5 CSV rows** were inspected and checked against recorded row numbers, raw row text, and parsed values.
- The exact assigned entry identities are the 194 entSeq values enumerated in the accepted-subset section.

For every assigned entry, checks covered:

- Primary spelling and display reading.
- All recorded spelling/reading forms and usage information.
- Selected-sense glosses and effective POS.
- `stagk`, `stagr`, `re_restr`, and `re_nokanji`.
- Register, usage notes, fields, dialects, and cross-references.
- Existing canonical answers before judging proposed narrowing.
- English and Indonesian meanings independently, followed by equivalence comparison.

Additional nonselected senses were examined where relevant to orthography, polysemy, or baseline narrowing, including `厚い`, `写真`, `早い`, `着る`, `同じ`, and `道`.

### Writing-supply peers

All three peer identities were checked against baseline artifacts, their actual raw dictionary entries, and actual N5 CSV rows:

| entSeq | itemId | Japanese / reading | English / Indonesian |
|---|---|---|---|
| `1311530` | `e0eea2d8-307b-5d95-882c-bf42f6169801` | 紙 / かみ | paper / kertas |
| `1385070` | `4cf91acd-62fa-52d3-8b05-e540af15b45d` | 切手 / きって | postage stamp / prangko |
| `1499690` | `5f6d6fb4-bd88-5e08-a561-aeaa6bc93e14` | 封筒 / ふうとう | envelope / amplop |

These identities are among the five baseline manifest promotions.

For each target, the reviewed English and Indonesian banks cover:

1. `JAPANESE → MEANING`
2. `MEANING → JAPANESE`
3. `MEANING → KANA`

Lexical solutions were assessed from the Japanese/meaning prompts and the bounded peer choices before the maker-key comparison. All 1,164 sets have one valid answer among the supplied options. No target meaning, spelling, or reading was found to make a writing-supply peer an additional correct answer.

Target-to-target synonym pairs—such as the two dictionary words—are not distractors for each other. No global-pool requirement was imposed on the strict allowlist.

## Baseline, Mapping, And Canonical Changes

The baseline inventory contains **749 items**, including **163 `SYLLABUS_MAPPED` items**. All 194 assignments match their baseline item records and pending registry entries.

Seven assigned lexemes also have existing mapped identities:

| entSeq | Existing mapped skillCode |
|---|---|
| `1323560` | `n4_social_viewpoint_vocab_kariru` |
| `1348870` | `n4_quantity_vocab_bundle_sukoshi` |
| `1353320` | `n4_capability_context_vocab_jouzu` |
| `1396130` | `n4_quantity_vocab_bundle_zenbu` |
| `1407980` | `n4_maybe_context_vocab_tabun` |
| `1411160` | `n4_social_viewpoint_vocab_kasu` |
| `1415870` | `n4_quantity_vocab_bundle_takusan` |

These are existing baseline duplicates, explicitly surfaced by curation—not newly created identities. The reviewed proposals retain the assigned pending IDs and do not overwrite or remap the mapped owners.

**182 of 194 proposed canonical payloads differ from baseline.** I reviewed these as explicit selected-sense/primary-form proposals, not as claims that every removed baseline form is linguistically invalid. Source restrictions support exclusions such as `門` for the selected `戸` sense and `永い` for the selected physical-length `長い` sense.

The narrower proposed answer sets remain unambiguous within the reviewed multiple-choice banks. Revision targets are `3/3`; new candidate groups use revision `1`. Existing frozen sessions and existing owner identities must remain untouched during integration.

Empty examples, empty aliases, and null explanations were treated as intentional, not missing authored content.

## Accepted Subset — Explicit Enumeration

**READY_FOR_INTEGRATION applies to exactly these 194 entSeq values:**

```text
1265070, 1266440, 1266970, 1268070, 1268570, 1268990, 1269060, 1269320, 1269410, 1270590, 1272500, 1273270
1275320, 1275640, 1277140, 1277450, 1278410, 1280770, 1282790, 1287410, 1287420, 1288850, 1289100, 1289470
1289590, 1290800, 1291330, 1291600, 1293660, 1295510, 1296400, 1296970, 1297210, 1297960, 1298790, 1299400
1299685, 1301330, 1301940, 1302680, 1303620, 1304970, 1305990, 1307040, 1307320, 1307500, 1307630, 1307850
1310620, 1310730, 1313000, 1315140, 1315720, 1316140, 1316380, 1317170, 1318400, 1318610, 1318970, 1319210
1319220, 1320760, 1321900, 1323560, 1324300, 1324520, 1326980, 1327190, 1329015, 1330290, 1332650, 1333070
1334040, 1335000, 1335640, 1335750, 1337270, 1338180, 1338850, 1340450, 1341000, 1342540, 1342550, 1343100
1343460, 1344930, 1344970, 1348870, 1348910, 1350040, 1350110, 1352130, 1352570, 1353320, 1355120, 1357600
1358340, 1358550, 1360010, 1361490, 1362360, 1365850, 1370760, 1371260, 1372190, 1375610, 1376460, 1376470
1378690, 1379380, 1380440, 1380840, 1381380, 1381390, 1382590, 1383240, 1384830, 1385170, 1386500, 1387210
1387500, 1387870, 1388740, 1390020, 1390930, 1390980, 1392580, 1396130, 1399790, 1401400, 1402540, 1403830
1404630, 1404975, 1406050, 1406820, 1407460, 1407980, 1408180, 1409140, 1411160, 1412890, 1413240, 1413660
1413890, 1414150, 1414170, 1414220, 1414340, 1415000, 1415870, 1416400, 1416840, 1418620, 1419110, 1419370
1419990, 1420010, 1420470, 1420900, 1421290, 1421700, 1421850, 1421970, 1422720, 1422970, 1423000, 1423310
1426250, 1427340, 1427900, 1428280, 1429700, 1429750, 1430250, 1430620, 1432680, 1434180, 1436130, 1436560
1436570, 1438690, 1443000, 1443840, 1444610, 1444680, 1445590, 1446070, 1447440, 1449540, 1451150, 1451470
1451750, 1454080
```

## Existing Holds — Remain Held

The following are outside part-02. I additionally inspected their actual raw entries and CSV rows and confirmed that they are absent from the candidate canonical/localization updates.

| entSeq | itemId | Retained reason |
|---|---|---|
| `1182880` | `e007da8f-ebfc-5d41-9b8a-11373171bbd3` | Raw entry is peony; CSV says button. |
| `2216120` | `740f0018-2f61-570a-8e1f-a1fe5411302c` | Raw entry is an attention-getting interjection; CSV says “This.” |
| `2216210` | `ca3cf376-b0f2-57bf-b3ad-21c69a5c62e0` | Raw entry is an interjection; CSV says “that.” |
| `2546180` | `4d47d291-c9fd-524f-aaa2-7ff3a469b697` | Raw entry means “thank you,” with an Izumo-dialect note; CSV says gradually. |
| `2784220` | `c6dc96d7-9ce0-5396-bee2-383b700687ca` | Raw entry concerns a contest/matching. The documented lighting-match identity remains unresolved; CSV “match” alone does not disambiguate it. |
| `2846389` | `4799b76c-8c17-5aa9-bbb7-c96f734634b3` | Raw entry is rare/slang “cop”; CSV says a glass. |
| `2847612` | `2ecdf560-9943-5db0-9c4d-39c2a0e72f70` | Raw entry is an interjection of surprise/suspicion; CSV says “that.” |

Resolution requires a separate reviewed identity decision preserving ID/history implications. This report does not authorize substituting another entry or promoting any of these seven.

## Independently Recomputed SHA256

Paths in the first four rows are relative to `content/flashcards/drafts/voc-03-batch-02/`.

| Artifact | SHA256 |
|---|---|
| `part-02/assignment.json` | `ec4fd0fa6217e31d7b0f1b207184d8c3cd8cdb7d6c759ed7d228ab41b5e81a71` |
| `part-02/curation.json` | `97d149281d7a66e76a56734b727d4ec5ba294ef243a8216328db417e8ba3fcbd` |
| `part-02/content.json` | `724c39812b0479a280836e5cf4e0ff12309cb69616c392d7400e577c8013b303` |
| `integration-candidate.json` | `76dc03ecb6bb854cf0df4c40c00284f89d09d9118ff5ff579b33c36f84dc91a3` |
| `baseline/vocabulary-foundation.json` | `120f15b6c9244caf27bd45b1542dc175e855e04b45a9ad9e43033d22d1172c58` |
| `baseline/vocabulary-foundation-pending-n5-skill-codes.json` | `0514ee860f6689047a414c4474d827d4fe04fba95f3c837b3066e63c1a5448c4` |
| `baseline/localizations.v2.json` | `19701499a5e780a134ea7adb7fbabff5d31000f900d13f8081e5169082c4fd2c` |
| `baseline/manifest.v2.json` | `6e5f29e60464b64b436365cba08519b7b574622671c0abf0bc06d86174032a42` |
| `content/syllabus/sources/jmdict/raw/2026-05-16/JMdict_e.gz` | `cb94bc83370f4adee89c8d5921c213c061bab0c6b0a018ec9edc5655bd03e4bb` |
| `content/syllabus/sources/yomitan-jlpt-vocab/raw/2026-05-16/source-main.zip` | `bc8b547ff23bcefddb03904327b499c327ea914867a66f60fd2e694328c44560` |
| ZIP member `yomitan-jlpt-vocab-main/original_data/n5.csv` | `07dc6f197b51cc076c65c3c9f23218d10c2b67f76545f5c1c4d9e3750495533a` |
| `content/flashcards/drafts/voc-03-batch-01/content.json` | `308978cd5e804b52e9fdbb9a7232240adb2461f6d669f4903ca90c2129934675` |

All six declared baseline hashes match independently computed values. The four baseline snapshots also match their corresponding current canonical files. Assignment, curation, content, and candidate hashes were rechecked at the end and remained unchanged.

## Commands And Checks Actually Performed

- Used `sed -n`, `cat`, `wc -l`, and `rg --files` to read the named guidance, skills, source READMEs, and identify relevant artifacts. An initial assignment display was oversized; subsequent JSON inspection used programmatic selection and compact tables.
- Used read-only `python3 - <<'PY'` invocations with `json` and `hashlib` to inspect schemas, recompute hashes, compare baseline records, and validate scoped candidate entries.
- Used Python `gzip`, `re`, and `xml.etree.ElementTree` to extract and inspect actual source entries, including restrictions and usage data.
- Used Python `zipfile` and `csv` to inspect actual N5 CSV rows and verify row references.
- Ran an independent scoped checker producing **12,804 assertions, zero reported errors**, covering lexical evidence, identity, bilingual payloads, option banks, and candidate correspondence.
- Ran additional checks for registry membership, all 40 candidate groups, unique group IDs/slugs, exact 194-item membership, revisions, and preservation of the seven held identities.
- Read `scripts/flashcards/validate_vocabulary_draft.py` for comparison, but **did not execute its full-batch main routine** or claim its mechanical checks constitute editorial review.

One preliminary assertion run stopped because XML empty-element text was represented as `None` while serialized evidence used `""`. After normalizing that representation, the complete independent checker passed. This was not a draft defect.

## Limits And Integration Boundary

- No project files were edited, no subagents spawned, and no publication/import/database operation performed.
- No credentials or environment files were intentionally accessed. No material was sent to Mampu Orbit or another external provider.
- Other authored partitions were not editorially accepted by this report.
- N5 placement remains heuristic; entry-level overlay membership is not an official sense-level JLPT certification.
- Importer dry-run, disposable-MySQL preservation tests, runtime fallback verification, and rollout remain parent-owned integration work.

**Final disposition: accept the enumerated 194 part-02 items and their corresponding 40 candidate groups for editorial integration; retain all seven existing source holds and keep whole-batch approval separate.**