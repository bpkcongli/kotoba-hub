# Independent Review: VOC-03 Batch-02 Part-01

**Verdict: NEEDS_CHANGES for the current part-01 integration proposal.**

**READY_FOR_INTEGRATION, editorial item-content scope only: the 175 entSeq identities explicitly enumerated below.** Eighteen authored items require spelling-presentation changes; the existing peony/button source-identity hold remains. This is not approval of the whole batch or permission to publish/import.

Review performed read-only. No project files, reports, configuration, database records, or publication state were changed. No subagents or external provider were invoked.

## Coverage

| Scope | Count |
|---|---:|
| Assigned existing item IDs | 194 |
| Curated/authored bilingual items | 193 |
| Proposed groups reviewed | 59 |
| Authored item/locale/script-pair option sets inspected | 1,158 |
| Editorially accepted items | 175 |
| Authored items held for spelling presentation | 18 |
| Existing source-identity hold retained | 1 |
| Total held assigned items | 19 |

All 193 authored items select **sense 1** of their respective pinned JMdict entries.

I inspected the actual raw entries for all 194 assigned identities and the three writing-supply anchors: **197 distinct JMdict entries**. Actual pinned N5 CSV evidence comprised **197 authored-item rows, one existing-held-item row, and three anchor rows**.

## Findings

### 1. Medium — Rare/search-only spellings remain the sole Japanese answers in 18 unqualified N5 packages

This is a bounded editorial presentation finding, **not a claim that the dictionary identities or translations are incorrect**.

The actual pinned JMdict DTD defines:

- `rK`: “rarely used kanji form”
- `sK`: “search-only kanji form”
- `uk`: “word usually written using kana alone”

The affected packages preserve baseline display forms but also make those marked forms the **only** `JAPANESE` answers. The ordinary kana spellings—or a regular dictionary spelling for chicken meat—are not offered as Japanese answers. Neither locale supplies an explanation qualifying the marked spelling.

Preserving existing item IDs does not require teaching the existing representative spelling as the sole normal N5 written answer. The batch documentation explicitly makes these canonical changes proposals requiring editorial review.

**Affected paths**

For each index `i` in the table:

- Curation: `part-01/curation.json`, `/items/i/senseEvidence/spellingForms/j/ke_inf`
- Authored package: `part-01/content.json`, `/items/i/japanese/surfaceFormText` and `/items/i/japanese/acceptedAnswers/JAPANESE`
- Options: `/items/i/optionChecks/{en,id}` for `JAPANESE→MEANING` and `MEANING→JAPANESE`
- Candidate: `integration-candidate.json`, `/canonicalUpdates/i/canonicalAnswers/JAPANESE`
- Candidate localization display: `/localizationUpdates/<itemId>/surfaceFormText`

Here `j = 0`, except `1253020`, where `j = 2`.

| entSeq | `i` | Current sole Japanese answer | Raw spelling tag | Concrete correction to review |
|---|---:|---|---|---|
| 1004500 | 14 | 此方 | `rK` | Use こっち for this package’s selected display reading; consider こちら separately as a valid reading/form alternative. |
| 1006730 | 18 | 而して | `rK` | Use そして as the ordinary written form. |
| 1006780 | 19 | 其方 | `rK` | Use そちら as the ordinary written form. |
| 1006980 | 20 | 其れから | `sK` | Use それから. |
| 1008630 | 24 | 迚も | `rK` | Use とても. |
| 1008910 | 25 | 如何 | `rK` | Use どう. |
| 1012980 | 30 | 遣る | `rK` | Use やる; retain the colloquial-register meaning qualification. |
| 1039140 | 37 | 咖哩 | `sK` | Use カレー. |
| 1042620 | 40 | 瓩 | `rK` | Use キログラム. |
| 1042650 | 41 | 粁 | `rK` | Use キロメートル. |
| 1046810 | 44 | 瓦 | `rK` | Use グラム. |
| 1074260 | 55 | 洋袴 | `rK` | Use ズボン. |
| 1132570 | 83 | 米 | `ateji`, `rK` | Use メートル; avoid an unqualified 米 prompt for the metric-unit package. |
| 1157170 | 95 | 為る | `rK` | Use する. |
| 1163940 | 100 | 一寸 | `rK` | Use ちょっと. |
| 1188760 | 120 | 何時 | `rK` | Use いつ for the selected “when” package. |
| 1189360 | 121 | 何方 | `rK` | Use どちら for the selected polite direction question. |
| 1253020 | 183 | とり肉 | `sK` | Prefer ordinary 鶏肉 for the canonical display; retain とりにく as the reading and review valid spelling aliases explicitly. |

**Baseline versus proposal:** These marked representative spellings already exist in the baseline. The finding is not that the maker invented them. The unresolved issue is carrying them into the reviewed N5 proposal as unqualified sole Japanese answers.

**Required action:** Curator/maker should submit explicit display/canonical corrections, synchronize prompts and candidate localization displays, and rerun the six option checks for these identities. Preserve item IDs, official ownership, and frozen-session behavior. If retaining a marked spelling deliberately, provide a specific register/orthography rationale rather than treating primary-baseline status as sufficient justification.

The bounded banks still have one semantically valid choice each. This finding concerns what those banks teach as the normal written answer, not a target-to-target distractor collision.

### 2. High, existing hold — `1182880` is peony, not the overlay’s button

- Item ID: `e007da8f-ebfc-5d41-9b8a-11373171bbd3`
- Curation path: `part-01/curation.json`, `/heldItems/0`
- Actual JMdict entry `1182880`, sense 1: **tree peony (Paeonia suffruticosa); moutan**
- Actual entry also contains a second, reading-restricted wild-boar-meat sense.
- Actual N5 CSV line **571**: `1182880,ボタン,,button`

**Disposition:** Retain the existing hold. The item is correctly absent from the candidate canonical and localization updates.

**Required correction:** Resolve the lexical-entry identity and historical-ID implications separately. Do not author “button” against this peony entry or silently redirect its existing UUID.

## Accepted Subset

The following **175 entSeq identities** pass this review’s bilingual meaning, selected-sense, identity, current-form, grouping-fit, and bounded-option criteria. Each identifies its corresponding existing assigned item ID; no replacement identity is authorized.

```text
1000430, 1001140, 1001710, 1001820, 1001830, 1001990, 1002100,
1002120, 1002320, 1002330, 1002430, 1002590, 1002610, 1002650,
1004880, 1005110, 1005900, 1008190, 1008450, 1008460, 1009000,
1010080, 1012480, 1012620, 1013050, 1013190, 1017760, 1030630,
1037670, 1038350, 1039220, 1042610, 1042820, 1044070, 1049000,
1049180, 1050590, 1061520, 1061820, 1067470, 1070790, 1072590,
1073210, 1073900, 1074270, 1076190, 1078630, 1078750, 1078810,
1079760, 1080510, 1083590, 1084810, 1087820, 1089890, 1091500,
1092820, 1096420, 1098620, 1100760, 1103090, 1109380, 1110110,
1115150, 1119650, 1120410, 1120990, 1122650, 1123590, 1124970,
1125150, 1138860, 1138900, 1138960, 1144940, 1145310, 1148640,
1151260, 1153520, 1154330, 1156800, 1157000, 1158880, 1159980,
1162130, 1163400, 1165970, 1169250, 1171010, 1171900, 1173720,
1173750, 1174340, 1174420, 1177800, 1178940, 1179330, 1180470,
1180570, 1182030, 1183300, 1183720, 1184140, 1184270, 1185200,
1189370, 1191320, 1191420, 1192150, 1192280, 1193060, 1193180,
1194500, 1194870, 1195430, 1198180, 1198550, 1201190, 1201940,
1202150, 1202170, 1202270, 1202450, 1203090, 1203250, 1203260,
1203620, 1203650, 1206050, 1206110, 1207240, 1207590, 1207610,
1210360, 1213170, 1213400, 1218380, 1219960, 1219980, 1223640,
1226440, 1227500, 1227560, 1228260, 1231580, 1231590, 1231690,
1236070, 1236900, 1237410, 1237680, 1239730, 1240825, 1242130,
1242160, 1243320, 1243490, 1243600, 1243850, 1245290, 1246700,
1246740, 1249900, 1249960, 1252330, 1252560, 1254760, 1254790,
1257240, 1257540, 1258330, 1259210, 1260490, 1263400, 1264540
```

**Held authored identities:** `1004500`, `1006730`, `1006780`, `1006980`, `1008630`, `1008910`, `1012980`, `1039140`, `1042620`, `1042650`, `1046810`, `1074260`, `1132570`, `1157170`, `1163940`, `1188760`, `1189360`, `1253020`.

**Additional existing held identity:** `1182880`.

## Grouping and Integration Boundaries

All 59 group objectives and their English/Indonesian equivalents were reviewed against their selected member senses. No additional blocking grouping finding was identified.

The 18 spelling holds affect eight groups:

```text
n5_vocab_b02p01_clothing
n5_vocab_b02p01_degree_rank
n5_vocab_b02p01_discourse_links
n5_vocab_b02p01_do_actions
n5_vocab_b02p01_meal_ingredients
n5_vocab_b02p01_metric_units
n5_vocab_b02p01_question_words
n5_vocab_b02p01_routes_directions
```

Consequently, **51 groups have no member held by this review; eight current group proposals cannot be integrated unchanged**. Acceptance of the 175 item packages is not approval of silently modified membership. If the parent integrates a smaller subset before corrections, it must explicitly compile the resulting membership and align group descriptions; imported membership must not subsequently be treated as freely mutable.

All reviewed draft groups remain unpublished, with null draft skill/lesson attribution. Candidate group revisions are `1/1`; proposed item content/translation revisions are `3/3`, against active overlay `2/2`.

### Existing mapped-inventory overlaps

The 749-item canonical inventory, including 163 `SYLLABUS_MAPPED` items, contains three same-entry mapped/pending pairs:

| entSeq | Existing mapped item | Assigned pending item |
|---|---|---|
| 1008460 | `871f9b1a-7c4d-5997-aa9e-7cd33780ed14` | `bf026ee8-a0b4-55b7-bbb6-49f09b78929f` |
| 1163940 | `8e9e9dfd-bcb4-567f-92b6-8994042192ff` | `92d52bef-2313-5bc2-82b4-e4724caf3053` |
| 1236900 | `7a934ed9-90ab-5316-8abf-58a5b83ccd6c` | `eb12fca8-95c8-56d8-beab-5b3a75ea3282` |

Curation’s `duplicateCheck.sameEntryItemIds` correctly reports these overlaps. They are baseline identities, not new items created by this proposal. Do not merge, delete, or remap their existing official owners as part of this review. `1163940` remains held for the separate spelling issue.

## Option Review and Source Results

I considered the Japanese and English/Indonesian meanings before comparing the declared option keys. For each item and locale, the three supported directions were checked:

- `JAPANESE→MEANING`
- `MEANING→JAPANESE`
- `MEANING→KANA`

Every authored bank contains the target and the same three verified, distinct peer identities:

| entSeq | Item ID | Japanese / reading | English / Indonesian |
|---|---|---|---|
| 1311530 | `e0eea2d8-307b-5d95-882c-bf42f6169801` | 紙 / かみ | paper / kertas |
| 1385070 | `4cf91acd-62fa-52d3-8b05-e540af15b45d` | 切手 / きって | postage stamp / prangko |
| 1499690 | `5f6d6fb4-bd88-5e08-a561-aeaa6bc93e14` | 封筒 / ふうとう | envelope / amplop |

Their raw selected senses, actual CSV lines **164, 186, and 540**, active canonical answers, active bilingual overlay values, and membership in the existing five-item reviewed manifest were checked.

**No semantic distractor collision was found in the 1,158 explicit banks.** Target-to-target synonyms are not distractors here. In particular, the old global-pool `pen` collision does not block `1123590` under this strict three-peer allowlist.

All banks passed exact peer/value correspondence and NFKC/case/whitespace uniqueness checks. The 175 accepted packages account for 1,050 sets. The other 108 sets belong to spelling-held packages; the spelling-specific concern affects their Japanese-prompt/Japanese-answer presentation, not their kana-answer identity.

Raw-source checks verified selected glosses, POS, register, usage notes, fields, dialects, cross-references, spelling forms, reading forms, `stagk`, `stagr`, `re_restr`, and `re_nokanji`. XML empty-element text required normalization from Python `None` to the draft’s empty string; after that representation normalization, all reading metadata matched.

Baseline comparison counted proposed removal of **98 Japanese, 88 kana, and 441 English answer strings** across the authored subset. Those counts are not all errors: selected-sense narrowing legitimately excludes other senses, restricted readings, and search forms. The spelling holds identify the bounded cases where the remaining sole Japanese presentation still needs revision.

Empty examples and null explanations were treated as intentional, not missing deliverables.

## Independently Recomputed SHA256

Paths below are relative to the repository root. All six pinned baseline hashes matched their declarations.

| Artifact | SHA256 |
|---|---|
| `content/flashcards/drafts/voc-03-batch-02/part-01/assignment.json` | `9a98fe46d7734989d11d1dc0b5c0e364d7c42a3710d477f3d19a1a305bfef959` |
| `content/flashcards/drafts/voc-03-batch-02/part-01/curation.json` | `24e7d41f7c59c17985be23a022a498c9cc094b7aa4190e17273978e9b4865e39` |
| `content/flashcards/drafts/voc-03-batch-02/part-01/content.json` | `2dc343723b1ca25a97518654eb2a3729da31023a720552f9a9dbc7fdfd9ac7e5` |
| `content/flashcards/drafts/voc-03-batch-02/integration-candidate.json` | `76dc03ecb6bb854cf0df4c40c00284f89d09d9118ff5ff579b33c36f84dc91a3` |
| `content/flashcards/system-decks/vocabulary-foundation.json` | `120f15b6c9244caf27bd45b1542dc175e855e04b45a9ad9e43033d22d1172c58` |
| `content/flashcards/system-decks/vocabulary-foundation-pending-n5-skill-codes.json` | `0514ee860f6689047a414c4474d827d4fe04fba95f3c837b3066e63c1a5448c4` |
| `content/flashcards/system-decks/localizations.v2.json` | `19701499a5e780a134ea7adb7fbabff5d31000f900d13f8081e5169082c4fd2c` |
| `content/flashcards/vocabulary-groups/manifest.v2.json` | `6e5f29e60464b64b436365cba08519b7b574622671c0abf0bc06d86174032a42` |
| `content/syllabus/sources/jmdict/raw/2026-05-16/JMdict_e.gz` | `cb94bc83370f4adee89c8d5921c213c061bab0c6b0a018ec9edc5655bd03e4bb` |
| `content/syllabus/sources/yomitan-jlpt-vocab/raw/2026-05-16/source-main.zip` | `bc8b547ff23bcefddb03904327b499c327ea914867a66f60fd2e694328c44560` |

Additional anchor-artifact hashes:

| Artifact under `content/flashcards/drafts/voc-03-batch-01/` | SHA256 |
|---|---|
| `curation.json` | `6b8d884be18d85a4d249217e23c43782595227a48dcb6a4f10f29a698188f38d` |
| `content.json` | `308978cd5e804b52e9fdbb9a7232240adb2461f6d669f4903ca90c2129934675` |
| `review.md` | `07c988e10b84519c3d3592533c7e46f02425d17f07224db033cbb6e8d01d77a6` |

## Commands and Verification Scope

Actual shell work consisted of:

- `pwd`, `sed -n ...`, `cat`, and scoped `rg` commands to read project guidance, the five requested skills, VOC-03 references, relevant bilingual contract material, validator implementation, and anchor review.
- Read-only `python3 - <<'PY' ... PY` programs using `json` and `pathlib` to select semantic tables rather than dump huge baseline JSON files.
- Read-only Python programs using `gzip`, `re`, and `xml.etree.ElementTree` to extract actual assigned JMdict entries, selected senses, forms/restrictions, and DTD tag definitions.
- Read-only Python programs using `zipfile`, `csv`, and `io` to inspect and compare actual pinned `original_data/n5.csv` rows.
- `hashlib.sha256` computations for the four review artifacts, six baselines/sources, and three anchor artifacts.
- Scoped assertions covering assignment equality to baseline records, registry presence, coverage, group ownership/membership, candidate projection, revisions, publication flags, raw evidence, duplicate-entry reporting, and all 1,158 option sets.

The first `python` invocation failed because no default pyenv Python was selected; subsequent commands used `python3`. Two exploratory assertions were corrected after inspecting the actual schemas/evidence: candidate groups use `code`, and the inventory contains the three explicitly recorded mapped/pending overlaps. Empty XML tags also required the representation normalization described above. These were review-script assumptions, not concealed draft defects.

I read `validate_vocabulary_draft.py` but **did not run its whole-batch `main()`**, which traverses all three partitions. Equivalent scoped checks were run directly for part-01 and its corresponding candidate entries.

## Remaining Boundaries

- Parts 02 and 03 are not reviewed or approved by this report; their existing holds remain unaffected.
- The shared candidate hash identifies the complete file, but substantive approval is limited to the corresponding part-01 entries.
- N5 placement remains an editorial/overlay heuristic, not a JMdict-certified level.
- No application tests, seed dry-run, MySQL smoke test, migration, import, deployment, or live-session preservation test was performed.
- The parent must store this report, coordinate the 18 corrections, and compile only the explicitly accepted subset through the supported integration path.
- No whole-batch readiness verdict is justified while source holds or these bounded presentation holds remain.