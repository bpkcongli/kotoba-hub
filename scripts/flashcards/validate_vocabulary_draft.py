#!/usr/bin/env python3
"""Check source/identity integrity of VOC-03 drafts without importing or publishing."""

import csv
import gzip
import hashlib
import io
import json
import re
import unicodedata
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
BATCH = ROOT / "content/flashcards/drafts/voc-03-batch-02"


def read(path):
    return json.loads(Path(path).read_text())


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def integrated_artifact(path, checksum):
    current = ROOT / path

    if sha(current) == checksum:
        return read(current)

    # Later reviewed batches retain the exact raw text of this integration.
    archive = ROOT / "content/flashcards/drafts/voc-03-batch-03/baseline.json.gz"
    assignment = read(archive.parent / "assignment.json")

    require(any(entry["path"] == path and entry["sha256"] == checksum
                for entry in assignment["baselines"]), "Unbound historical artifact.")

    snapshots = json.loads(gzip.decompress(archive.read_bytes()))
    raw = snapshots[Path(path).name]

    require(hashlib.sha256(raw.encode()).hexdigest() == checksum,
            f"Historical integrated artifact drift: {path}")

    return json.loads(raw)


def normalize(value):
    return " ".join(unicodedata.normalize("NFKC", value).lower().split())


def baseline_path(baseline):
    snapshot = BATCH / "baseline" / Path(baseline["path"]).name

    return snapshot if snapshot.exists() else ROOT / baseline["path"]


def main():
    assignments = [read(path) for path in sorted(BATCH.glob("part-*/assignment.json"))]

    require(len(assignments) == 3, "Expected three assigned partitions.")

    baselines = assignments[0]["baselines"]

    for baseline in baselines:
        require(sha(baseline_path(baseline)) == baseline["sha256"],
                f"Baseline drift: {baseline['path']}")

    inventory = read(baseline_path(baselines[0]))["items"]
    inventory_by_id = {item["id"]: item for item in inventory}
    raw = gzip.open(ROOT / baselines[4]["path"], "rt").read()
    entries = {}

    for block in re.findall(r"<entry>.*?</entry>", raw, re.S):
        sequence = re.search(r"<ent_seq>(\d+)</ent_seq>", block).group(1)
        entries[sequence] = block

    with zipfile.ZipFile(ROOT / baselines[5]["path"]) as archive:
        csv_lines = archive.read(
            "yomitan-jlpt-vocab-main/original_data/n5.csv"
        ).decode().splitlines()

    existing = read(baseline_path(baselines[3]))
    promoted = {item["itemId"] for group in existing["groups"] for item in group["items"]}
    expected = {item["id"] for item in inventory
                if item["mappingStatus"] == "PENDING_LESSON_MAPPING" and item["id"] not in promoted}
    anchors = read(ROOT / "content/flashcards/drafts/voc-03-batch-01/content.json")["items"]
    anchors = {item["itemId"]: item for item in anchors}
    assigned_all, authored_all, held_all, group_codes = [], [], [], []
    authored_records = {}
    group_members = {}
    reports = []
    editorial_accepted = []

    for directory in sorted(BATCH.glob("part-*")):
        assignment = read(directory / "assignment.json")
        curation = read(directory / "curation.json")
        content = read(directory / "content.json")

        require(assignment["baselines"] == baselines == curation["baselines"], "Baseline mismatch.")
        require(curation["isPublished"] is False and content["isPublished"] is False,
                "Authoring drafts must remain unpublished.")
        require(content["curation"]["sha256"] == sha(ROOT / content["curation"]["path"]),
                "Maker handoff hash mismatch.")

        assigned = assignment["assignedItemIds"]
        curated = {item["itemId"]: item for item in curation["items"]}
        authored = {item["itemId"]: item for item in content["items"]}
        held = curation["heldItems"]
        covered = list(curated) + [item["itemId"] for item in held]

        require(len(curated) == len(curation["items"]), "Duplicate curated ID.")
        require(len(covered) == len(set(covered)) and set(covered) == set(assigned), "Coverage gap.")
        require(set(authored) == set(curated), "Authored scope differs from curated scope.")

        membership = {}

        for group in curation["groups"]:
            require(group["isPublished"] is False and group["skillId"] is None
                    and group["lessonSlug"] is None, "Draft group claims official ownership.")
            require(group["ownerType"] == "FLASHCARD_VOCABULARY_GROUP", "Wrong owner type.")

            for locale in ["en", "id"]:
                require(group["localizations"][locale]["isPublished"] is False, "Published draft locale.")

            group_codes.append(group["proposedSkillCode"])

            group_members[group["proposedSkillCode"]] = set(group["itemIds"])

            for item_id in group["itemIds"]:
                require(item_id not in membership, "Duplicate group member.")

                membership[item_id] = group["proposedSkillCode"]

        require(set(membership) == set(curated), "Group coverage differs from curated scope.")

        for item_id, item in curated.items():
            baseline = inventory_by_id[item_id]
            surface = item["surfaceFormText"]
            kana = item["kanaDisplayText"]
            proposal = item.get("canonicalProposal")

            if proposal:
                require(proposal["changeType"] == "PREFERRED_ORTHOGRAPHY_SAME_ENTRY" and
                        proposal["from"] == baseline["surfaceFormText"] and proposal["to"] == surface,
                        "Invalid orthography proposal.")
            else:
                require(surface == baseline["surfaceFormText"], "Unproposed display change.")

            require(kana == baseline["kanaDisplayText"], "Unreviewed reading change.")
            require(item["isPublished"] is False and item["runtimeMapping"] == {
                "mappingStatus": "PENDING_LESSON_MAPPING", "skillId": None,
                "unitSlug": None, "lessonSlug": None,
            }, "Draft changed runtime attribution.")
            require(item["proposedSkillCode"] == membership[item_id], "Group mismatch.")

            block = re.sub(r"&([\w-]+);", lambda match: match.group(0)
                           if match[1] in ["amp", "lt", "gt", "quot", "apos"] else match[1],
                           entries[item["entSeq"]])
            entry = ET.fromstring(block)
            evidence = item["senseEvidence"]
            spellings = [node.findtext("keb") for node in entry.findall("k_ele")]

            require(surface in spellings or surface == kana,
                    "Primary spelling is absent from the selected entry.")
            require(evidence["sourceSha256"] == baselines[4]["sha256"], "Source hash mismatch.")

            ordinal, = evidence["senseOrdinals"]
            sense = entry.findall("sense")[ordinal - 1]

            require(evidence["selectedGlossesEn"] == [gloss.text for gloss in sense.findall("gloss")],
                    f"Selected gloss drift: {item['entSeq']}")
            require(evidence["registerTags"] == [node.text for node in sense.findall("misc")],
                    "Register evidence drift.")
            require(evidence["senseNotes"] == [node.text for node in sense.findall("s_inf")],
                    "Usage-note evidence drift.")

            effective_pos = [node.text for node in sense.findall("pos")]

            if not effective_pos:
                for previous in reversed(entry.findall("sense")[:ordinal - 1]):
                    effective_pos = [node.text for node in previous.findall("pos")]

                    if effective_pos:
                        break

            require(effective_pos == [value["code"] for value in evidence["partsOfSpeech"]],
                    "Effective POS evidence drift.")

            for tag in ["stagk", "stagr"]:
                values = [node.text for node in sense.findall(tag)]

                require(values == evidence["restrictions"][tag], "Sense restrictions drift.")

                display = (baseline["surfaceFormText"] if surface == kana else surface) if tag == "stagk" else kana

                require(not values or display in values, "Primary form violates selected sense.")

            reading = next(node for node in entry.findall("r_ele")
                           if node.findtext("reb") == baseline["kanaDisplayText"])
            restrictions = [node.text for node in reading.findall("re_restr")]

            require(restrictions == evidence["restrictions"]["re_restr"], "Reading restrictions drift.")
            require(not restrictions or (baseline["surfaceFormText"] if surface == kana else surface)
                    in restrictions, "Invalid reading/spelling pair.")
            require(item["jlptEvidence"]["rows"], "Missing N5 evidence.")

            for row in item["jlptEvidence"]["rows"]:
                require(csv_lines[row["lineNumberOneBased"] - 1] == row["rawCsvRow"], "CSV row drift.")
                require(next(csv.reader(io.StringIO(row["rawCsvRow"])))[0] == item["entSeq"], "Wrong CSV entry.")

            authored_item = authored[item_id]
            japanese = authored_item["japanese"]

            require(authored_item["isPublished"] is False and authored_item["proposedSkillCode"] == membership[item_id],
                    "Authored ownership/publication mismatch.")
            require(japanese["acceptedAnswers"] == {
                "JAPANESE": [surface], "KANA": [kana],
            }, "Unreviewed canonical form.")
            require(japanese["surfaceFormText"] == surface and japanese["kanaDisplayText"] == kana,
                    "Authored display differs from curation.")

            for locale in ["en", "id"]:
                package = authored_item["localizations"][locale]

                require(package["isPublished"] is False and package["meaning"].strip(), "Invalid draft locale.")
                require(package["sourceRevision"] == package["translationRevision"] == 3, "Revision mismatch.")

                checks = authored_item["optionChecks"][locale]

                require({(check["fromScript"], check["toScript"]) for check in checks} == {
                    ("JAPANESE", "MEANING"), ("MEANING", "JAPANESE"), ("MEANING", "KANA"),
                } and len(checks) == 3, "Missing option pairs.")

                for check in checks:
                    answer = package["meaning"] if check["toScript"] == "MEANING" else japanese["acceptedAnswers"][check["toScript"]][0]

                    require(check["correctAnswer"] == answer, "Wrong declared answer.")

                    values = [normalize(answer)]

                    for peer in check["distractorCandidates"]:
                        anchor = anchors[peer["itemId"]]
                        expected_value = anchor["localizations"][locale]["meaning"] if check["toScript"] == "MEANING" else anchor["japanese"]["acceptedAnswers"][check["toScript"]][0]

                        require(peer["value"] == expected_value, "Peer identity/value mismatch.")

                        values.append(normalize(peer["value"]))

                    require(len(values) == 4 and len(set(values)) == 4, "Ambiguous/short explicit bank.")

        assigned_all.extend(assigned)
        authored_all.extend(authored)
        authored_records.update(authored)
        held_all.extend(held)

        review_path = directory / "review-result.json"
        review = read(review_path) if review_path.exists() else None

        if review:
            require(review["verdict"] == "READY_FOR_INTEGRATION", "Editorial review is not ready.")

            for filename, checksum in review["artifactSha256"].items():
                require(sha(directory / filename) == checksum, f"Reviewed artifact drift: {filename}")

            require(set(review["acceptedItemIds"]) == set(authored), "Reviewed subset differs from authored scope.")
            require(set(review["heldItemIds"]) == {item["itemId"] for item in held}, "Reviewed holds differ.")

            editorial_accepted.extend(review["acceptedItemIds"])

        reports.append({"part": directory.name, "assigned": len(assigned), "authored": len(authored),
                        "held": len(held), "curationSha256": sha(directory / "curation.json"),
                        "contentSha256": sha(directory / "content.json"),
                        "reviewSha256": sha(directory / "review.md"),
                        "reviewStatus": review["verdict"] if review else "REVIEW_INCOMPLETE"})

    require(len(assigned_all) == len(set(assigned_all)) and set(assigned_all) == expected, "Assigned bank drift.")
    require(len(group_codes) == len(set(group_codes)), "Duplicate proposed group code.")

    candidate_path = BATCH / "integration-candidate.json"
    candidate = read(candidate_path)

    require(candidate["isPublished"] is False and candidate["reviewStatus"] in
            ["REVIEW_INCOMPLETE", "READY_FOR_INTEGRATION"], "Invalid candidate review/publication status.")

    if candidate["reviewStatus"] == "READY_FOR_INTEGRATION":
        require(set(editorial_accepted) == set(authored_all), "Candidate includes unreviewed items.")

    require(candidate["baselineManifestSha256"] == sha(baseline_path(baselines[3])),
            "Candidate manifest baseline drift.")
    require(len(candidate["canonicalUpdates"]) == len(authored_all)
            and {item["itemId"] for item in candidate["canonicalUpdates"]} == set(authored_all),
            "Candidate canonical scope drift.")
    require(set(candidate["localizationUpdates"]) == set(authored_all), "Candidate overlay scope drift.")

    for update in candidate["canonicalUpdates"]:
        authored = authored_records[update["itemId"]]

        require(update["canonicalAnswers"] == {
            **authored["japanese"]["acceptedAnswers"],
            "ENGLISH": [authored["localizations"]["en"]["meaning"]],
        }, "Candidate answer drift.")
        require(update.get("surfaceFormText", inventory_by_id[update["itemId"]]["surfaceFormText"])
                == authored["japanese"]["surfaceFormText"], "Candidate display drift.")
        require(update["reviewedDistractorPoolItemIds"] == [item["itemId"]
                for item in authored["localizations"]["en"]["distractorCandidates"]],
                "Candidate reviewed peer drift.")
        require(candidate["localizationUpdates"][update["itemId"]] == {
            "surfaceFormText": authored["japanese"]["surfaceFormText"],
            "en": authored["localizations"]["en"]["meaning"],
            "id": authored["localizations"]["id"]["meaning"],
        }, "Candidate localized meaning drift.")

    require(len(candidate["groups"]) == len(group_codes), "Candidate group count drift.")

    for group in candidate["groups"]:
        require(group["isPublished"] is False, "Published candidate group.")
        require({item["itemId"] for item in group["items"]} == group_members[group["code"]],
                "Candidate group membership drift.")

    integration_path = BATCH / "integration.json"
    promoted_count = 0

    if integration_path.exists():
        integration = read(integration_path)

        require(candidate["reviewStatus"] == "READY_FOR_INTEGRATION", "Integrated candidate lacks review.")
        require(set(integration["acceptedItemIds"]) == set(editorial_accepted), "Integration scope drift.")

        artifacts = {path: integrated_artifact(path, checksum)
                     for path, checksum in integration["artifactSha256"].items()}
        active_manifest = artifacts[baselines[3]["path"]]

        require(active_manifest["groups"][:len(existing["groups"])] == existing["groups"],
                "Previously imported groups changed.")

        active_members = [item["itemId"] for group in active_manifest["groups"] for item in group["items"]]

        require(len(active_members) == len(set(active_members)) and
                set(active_members) == promoted | set(editorial_accepted), "Active promotion scope drift.")

        active_inventory = artifacts[baselines[0]["path"]]
        original_inventory = read(baseline_path(baselines[0]))

        require(active_inventory["decks"] == original_inventory["decks"] and
                active_inventory["deckItems"] == original_inventory["deckItems"], "Deck identity/membership changed.")

        updates = {item["itemId"]: item for item in candidate["canonicalUpdates"]}

        for before, after in zip(inventory, active_inventory["items"], strict=True):
            require(before["id"] == after["id"], "Canonical item identity/order changed.")

            if before["id"] not in editorial_accepted:
                require(before == after, "Unaccepted canonical item changed.")

                continue

            update = updates[before["id"]]

            require(after["englishMeaning"] == update["englishMeaning"] and
                    after["surfaceFormText"] == update.get("surfaceFormText", before["surfaceFormText"]) and
                    after["answerOptionPayload"]["canonicalAnswers"] == update["canonicalAnswers"] and
                    after["answerOptionPayload"]["reviewedDistractorPoolItemIds"] ==
                    update["reviewedDistractorPoolItemIds"], "Integrated canonical answers/pool drift.")

            stable = {**after, "englishMeaning": before["englishMeaning"], "surfaceFormText": before["surfaceFormText"], "sourceRefs": before["sourceRefs"],
                      "answerOptionPayload": before["answerOptionPayload"]}

            require(stable == before, "Canonical fields changed outside reviewed answers/provenance.")

        overlay = artifacts[baselines[2]["path"]]
        old_overlay = read(baseline_path(baselines[2]))

        require(overlay["contentRevision"] == candidate["targetContentRevision"] and
                overlay["translationRevision"] == candidate["targetTranslationRevision"], "Active revision drift.")
        require(overlay["items"] == {**old_overlay["items"], **candidate["localizationUpdates"]},
                "Active overlay adds/removes unreviewed packages.")

        promoted_count = len(editorial_accepted)

    print(json.dumps({"taskId": "VOC-03", "batchId": "voc-03-batch-02", "assigned": len(assigned_all),
                      "authored": len(authored_all), "sourceHeld": len(held_all), "promoted": promoted_count,
                      "acceptedItemIds": editorial_accepted,
                      "pendingAfter": len(expected) - promoted_count, "proposedGroups": len(group_codes),
                      "editorialOptionSets": len(authored_all) * 6, "reviewStatus": candidate["reviewStatus"],
                      "parts": reports, "heldItems": held_all,
                      "integrationCandidateSha256": sha(candidate_path),
                      "verificationScope": "Mechanical source/identity/options integrity; editorial acceptance is bound to independent reviewer reports and exact artifact hashes."},
                     ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
