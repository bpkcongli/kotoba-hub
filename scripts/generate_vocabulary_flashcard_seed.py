#!/usr/bin/env python3
from __future__ import annotations

import copy
import csv
import gzip
import io
import json
import uuid
import xml.etree.ElementTree as ET
import zipfile
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import jsonschema


ROOT = Path(__file__).resolve().parents[1]
SYLLABUS_CONTENT_DIR = ROOT / "content" / "syllabus"
OUTPUT_DIR = ROOT / "content" / "flashcards" / "system-decks"
OUTPUT_PATH = OUTPUT_DIR / "vocabulary-foundation.json"
PENDING_REGISTRY_OUTPUT_PATH = OUTPUT_DIR / "vocabulary-foundation-pending-n5-skill-codes.json"
DOCS_SCHEMA_DIR = ROOT / "docs" / "syllabus" / "schema"

SCHEMA_VERSION = "1.0.0"
GENERATED_AT = date.today().isoformat()
SUPPORTED_TRACK_SLUGS = (
    "jlpt-n5-foundation",
    "jlpt-n4-expansion",
)
TRACK_SORT_ORDER = {
    "jlpt-n5-foundation": 1,
    "jlpt-n4-expansion": 2,
}
TRACK_LEVEL_LABEL = {
    "jlpt-n5-foundation": "N5",
    "jlpt-n4-expansion": "N4",
}
DECK_SEGMENT_SIZE = 10
PENDING_N5_SOURCE_HANDLE = "n5_pending_yomitan_jmdict_candidates"
UUID_NAMESPACE = uuid.uuid5(
    uuid.NAMESPACE_URL,
    "https://kotobahub.local/content/flashcards/system-decks/vocabulary-foundation",
)
JMDICT_SOURCE_PATH = (
    ROOT / "content" / "syllabus" / "sources" / "jmdict" / "raw" / "2026-05-16" / "JMdict_e.gz"
)
YOMITAN_SOURCE_PATH = (
    ROOT
    / "content"
    / "syllabus"
    / "sources"
    / "yomitan-jlpt-vocab"
    / "raw"
    / "2026-05-16"
    / "source-main.zip"
)
YOMITAN_N5_CSV_PATH = "yomitan-jlpt-vocab-main/original_data/n5.csv"


@dataclass(frozen=True)
class PendingCandidateRow:
    ent_seq: str
    kana: str
    kanji: str
    waller_definition: str
    row_index: int


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def make_uuid(*parts: str) -> str:
    return str(uuid.uuid5(UUID_NAMESPACE, "/".join(parts)))


def unique_non_empty(values: list[str | None]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        if value is None:
            continue
        normalized = value.strip()
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        result.append(normalized)
    return result


def infer_commonness_bucket(priority_tags: list[str]) -> str | None:
    if not priority_tags:
        return None
    if any(tag in {"news1", "ichi1", "spec1", "gai1"} for tag in priority_tags):
        return "VERY_COMMON"
    if any(tag.startswith("nf") for tag in priority_tags):
        return "COMMON"
    return "KNOWN"


def validate_inputs() -> dict[str, dict[str, Any]]:
    manifest_schema = load_json(DOCS_SCHEMA_DIR / "seed-manifest.schema.json")
    manifest = load_json(SYLLABUS_CONTENT_DIR / "manifest.json")
    jsonschema.validate(manifest, manifest_schema)

    published_supported = [
        track
        for track in sorted(manifest["tracks"], key=lambda item: item["sortOrder"])
        if track["isPublished"] and track["slug"] in SUPPORTED_TRACK_SLUGS
    ]
    if not published_supported:
        raise ValueError("No published supported tracks found in content/syllabus/manifest.json.")

    track_payloads: dict[str, dict[str, Any]] = {}
    for manifest_track in published_supported:
        track_path = SYLLABUS_CONTENT_DIR / manifest_track["file"]
        payload = load_json(track_path)
        ensure_track_payload_shape(payload, track_path)

        track = payload["track"]
        if track["slug"] != manifest_track["slug"]:
            raise ValueError(
                f"Track slug mismatch for {track_path}: manifest={manifest_track['slug']} payload={track['slug']}."
            )
        if track["curriculumLevel"] != manifest_track["curriculumLevel"]:
            raise ValueError(
                f"Curriculum level mismatch for {track_path}: "
                f"manifest={manifest_track['curriculumLevel']} payload={track['curriculumLevel']}."
            )
        if not track["isPublished"]:
            raise ValueError(f"Supported track {track['slug']} must remain published in its payload.")

        track_payloads[track["slug"]] = payload

    return track_payloads


def ensure_track_payload_shape(payload: dict[str, Any], track_path: Path) -> None:
    track = payload.get("track")
    if not isinstance(track, dict):
        raise ValueError(f"{track_path} must expose a top-level 'track' object.")

    required_track_keys = ("slug", "curriculumLevel", "isPublished", "units")
    for key in required_track_keys:
        if key not in track:
            raise ValueError(f"{track_path} is missing required track key '{key}'.")

    if not isinstance(track["units"], list):
        raise ValueError(f"{track_path} must expose track.units as a list.")

    for unit in track["units"]:
        if not isinstance(unit, dict):
            raise ValueError(f"{track_path} contains a non-object unit entry.")
        for key in ("slug", "title", "sortOrder", "lessons"):
            if key not in unit:
                raise ValueError(f"{track_path} unit is missing required key '{key}'.")
        if not isinstance(unit["lessons"], list):
            raise ValueError(f"{track_path} unit '{unit['slug']}' must expose lessons as a list.")

        for lesson in unit["lessons"]:
            if not isinstance(lesson, dict):
                raise ValueError(f"{track_path} contains a non-object lesson entry.")
            for key in ("slug", "title", "sortOrder", "skills"):
                if key not in lesson:
                    raise ValueError(
                        f"{track_path} lesson in unit '{unit['slug']}' is missing required key '{key}'."
                    )
            if not isinstance(lesson["skills"], list):
                raise ValueError(
                    f"{track_path} lesson '{lesson['slug']}' must expose skills as a list."
                )

            for skill in lesson["skills"]:
                if not isinstance(skill, dict):
                    raise ValueError(f"{track_path} contains a non-object skill entry.")
                for key in ("id", "code", "skillType", "isPublished", "supportsFlashcards"):
                    if key not in skill:
                        raise ValueError(
                            f"{track_path} skill in lesson '{lesson['slug']}' is missing required key '{key}'."
                        )


def build_existing_item(
    track: dict[str, Any],
    unit: dict[str, Any],
    lesson: dict[str, Any],
    skill: dict[str, Any],
) -> dict[str, Any]:
    vocabulary = skill.get("content", {}).get("vocabulary")
    if not isinstance(vocabulary, dict):
        raise ValueError(f"Vocabulary skill '{skill['code']}' is missing content.vocabulary.")

    primary_spelling = vocabulary.get("primarySpelling")
    readings = unique_non_empty(list(vocabulary.get("readings", [])))
    alternate_spellings = unique_non_empty(list(vocabulary.get("alternateSpellings", [])))
    glosses_en = unique_non_empty(list(vocabulary.get("glossesEn", [])))

    surface_form_text_candidates = unique_non_empty([primary_spelling, *readings])
    if not surface_form_text_candidates:
        raise ValueError(
            f"Vocabulary skill '{skill['code']}' must have a primary spelling or reading fallback."
        )
    surface_form_text = surface_form_text_candidates[0]
    kana_display_text = readings[0] if readings else surface_form_text
    english_meaning = glosses_en[0] if glosses_en else None

    if not english_meaning:
        raise ValueError(f"Vocabulary skill '{skill['code']}' must expose at least one English gloss.")

    canonical_answers = {
        "JAPANESE": unique_non_empty([surface_form_text, *alternate_spellings]),
        "KANA": unique_non_empty([kana_display_text, *readings]),
        "ENGLISH": unique_non_empty([english_meaning, *glosses_en]),
    }
    if not canonical_answers["JAPANESE"] or not canonical_answers["KANA"] or not canonical_answers["ENGLISH"]:
        raise ValueError(f"Vocabulary skill '{skill['code']}' produced incomplete canonical answers.")

    return {
        "id": make_uuid("flashcard-item", "vocabulary", skill["code"]),
        "skillId": skill["id"],
        "skillCode": skill["code"],
        "trackSlug": track["slug"],
        "unitSlug": unit["slug"],
        "lessonSlug": lesson["slug"],
        "itemType": "VOCABULARY",
        "surfaceFormText": surface_form_text,
        "kanaDisplayText": kana_display_text,
        "romajiText": None,
        "englishMeaning": english_meaning,
        "alternateSpellings": alternate_spellings,
        "readings": readings,
        "glossesEn": glosses_en,
        "partsOfSpeech": unique_non_empty(list(vocabulary.get("partsOfSpeech", []))),
        "priorityTags": unique_non_empty(list(vocabulary.get("priorityTags", []))),
        "fields": unique_non_empty(list(vocabulary.get("fields", []))),
        "commonnessRankBucket": vocabulary.get("commonnessRankBucket"),
        "curriculumSignals": copy.deepcopy(skill.get("curriculumSignals", {})),
        "sourceRefs": copy.deepcopy(skill.get("sourceRefs", [])),
        "answerOptionPayload": {
            "schemaVersion": 1,
            "canonicalAnswers": canonical_answers,
            "distractorPoolItemIds": [],
        },
        "mappingStatus": "SYLLABUS_MAPPED",
        "explanationText": None,
        "isActive": bool(skill["isPublished"]),
    }


def load_pending_n5_rows() -> list[PendingCandidateRow]:
    rows: list[PendingCandidateRow] = []
    with zipfile.ZipFile(YOMITAN_SOURCE_PATH) as archive:
        with archive.open(YOMITAN_N5_CSV_PATH) as raw_handle:
            reader = csv.DictReader(io.TextIOWrapper(raw_handle, encoding="utf-8"))
            for row_index, row in enumerate(reader, start=1):
                ent_seq = (row.get("jmdict_seq") or "").strip()
                kana = (row.get("kana") or "").strip()
                kanji = (row.get("kanji") or "").strip()
                waller_definition = (row.get("waller_definition") or "").strip()
                if not ent_seq or not (kana or kanji):
                    continue
                rows.append(
                    PendingCandidateRow(
                        ent_seq=ent_seq,
                        kana=kana,
                        kanji=kanji,
                        waller_definition=waller_definition,
                        row_index=row_index,
                    )
                )
    if not rows:
        raise ValueError("Unable to load N5 candidate rows from the Yomitan snapshot.")
    return rows


class JMDictByEntSeqResolver:
    def __init__(self, needed_ent_seq: set[str]) -> None:
        self._needed_ent_seq = needed_ent_seq
        self._entries: dict[str, dict[str, Any]] = {}

    def load(self) -> None:
        with gzip.open(JMDICT_SOURCE_PATH, "rb") as handle:
            for _, elem in ET.iterparse(handle, events=("end",)):
                if elem.tag != "entry":
                    continue
                ent_seq = elem.findtext("ent_seq")
                if ent_seq not in self._needed_ent_seq:
                    elem.clear()
                    continue
                self._entries[ent_seq] = {
                    "ent_seq": ent_seq,
                    "kebs": [node.text for node in elem.findall("k_ele/keb") if node.text],
                    "rebs": [node.text for node in elem.findall("r_ele/reb") if node.text],
                    "glosses": unique_non_empty(
                        [
                            gloss.text
                            for gloss in elem.findall("sense/gloss")
                            if gloss.text
                        ]
                    ),
                    "parts_of_speech": unique_non_empty(
                        [
                            pos.text
                            for pos in elem.findall("sense/pos")
                            if pos.text
                        ]
                    ),
                    "fields": unique_non_empty(
                        [
                            field.text
                            for field in elem.findall("sense/field")
                            if field.text
                        ]
                    ),
                    "priority_tags": unique_non_empty(
                        [
                            pri.text
                            for pri in elem.findall("k_ele/ke_pri") + elem.findall("r_ele/re_pri")
                            if pri.text
                        ]
                    ),
                }
                elem.clear()
        missing = sorted(self._needed_ent_seq - set(self._entries))
        if missing:
            raise KeyError(f"Unable to resolve JMdict entries for ent_seq values: {missing[:10]}")

    def resolve(self, ent_seq: str) -> dict[str, Any]:
        entry = self._entries.get(ent_seq)
        if entry is None:
            raise KeyError(f"Unable to resolve JMdict entry for ent_seq '{ent_seq}'.")
        return entry


def candidate_sort_key(row: PendingCandidateRow, entry: dict[str, Any]) -> tuple[int, int]:
    score = 0
    if row.kanji and row.kanji in entry["kebs"]:
        score += 50
        if entry["kebs"] and entry["kebs"][0] == row.kanji:
            score += 25
    if row.kana and row.kana in entry["rebs"]:
        score += 20
        if entry["rebs"] and entry["rebs"][0] == row.kana:
            score += 10
    if row.kanji and not row.kana:
        score += 5
    return score, -row.row_index


def choose_representative_candidate(
    rows: list[PendingCandidateRow], entry: dict[str, Any]
) -> PendingCandidateRow:
    return max(rows, key=lambda row: candidate_sort_key(row, entry))


def pending_vocab_source_refs(ent_seq: str) -> list[dict[str, Any]]:
    return [
        {
            "provider": "JMDICT",
            "category": "LEXICAL_ENTRY",
            "externalId": ent_seq,
            "sourceUrl": "https://www.edrdg.org/jmdict/j_jmdict.html",
            "retrievedFrom": "content/syllabus/sources/jmdict/raw/2026-05-16/JMdict_e.gz",
            "licenseNote": "See the EDRDG licence snapshot stored with the raw JMdict acquisition.",
        },
        {
            "provider": "YOMITAN_JLPT_VOCAB",
            "category": "JLPT_SIGNAL",
            "externalId": ent_seq,
            "sourceUrl": "https://github.com/stephenmk/yomitan-jlpt-vocab",
            "retrievedFrom": "content/syllabus/sources/yomitan-jlpt-vocab/raw/2026-05-16/source-main.zip",
            "notes": "Derived from the Yomitan N5 CSV mapped to JMdict ent_seq.",
        },
    ]


def pending_curriculum_signals() -> dict[str, Any]:
    return {
        "jlpt": {
            "resolvedLevel": "N5",
            "candidates": [
                {
                    "provider": "YOMITAN_JLPT_VOCAB",
                    "level": "N5",
                    "scope": "VOCABULARY",
                    "confidence": "HEURISTIC",
                    "mappedBy": "JMdict ent_seq",
                }
            ],
            "resolutionNotes": (
                "Candidate comes from the N5 Yomitan overlay mapped to JMdict and still awaits lesson mapping in the syllabus."
            ),
        }
    }


def build_pending_candidate_item(
    row: PendingCandidateRow,
    entry: dict[str, Any],
) -> dict[str, Any]:
    primary_spelling_candidates = unique_non_empty(
        [
            row.kanji or None,
            entry["kebs"][0] if entry["kebs"] else None,
            row.kana or None,
            entry["rebs"][0] if entry["rebs"] else None,
        ]
    )
    if not primary_spelling_candidates:
        raise ValueError(f"Pending candidate ent_seq '{row.ent_seq}' does not expose a usable surface form.")
    primary_spelling = primary_spelling_candidates[0]
    readings = unique_non_empty([row.kana or None, *entry["rebs"]])
    if not readings:
        raise ValueError(f"Pending candidate ent_seq '{row.ent_seq}' does not expose a reading.")
    glosses_en = unique_non_empty(entry["glosses"][:3] + ([row.waller_definition] if row.waller_definition else []))
    if not glosses_en:
        raise ValueError(f"Pending candidate ent_seq '{row.ent_seq}' does not expose an English gloss.")

    alternate_spellings = unique_non_empty(
        [
            spelling
            for spelling in entry["kebs"]
            if spelling != primary_spelling
        ]
    )
    canonical_answers = {
        "JAPANESE": unique_non_empty([primary_spelling, *alternate_spellings]),
        "KANA": readings,
        "ENGLISH": glosses_en,
    }
    skill_code = f"n5_vocab_jmdict_{row.ent_seq}"

    return {
        "id": make_uuid("flashcard-item", "vocabulary", "pending-n5", row.ent_seq),
        "skillId": None,
        "skillCode": skill_code,
        "trackSlug": "jlpt-n5-foundation",
        "unitSlug": None,
        "lessonSlug": None,
        "itemType": "VOCABULARY",
        "surfaceFormText": primary_spelling,
        "kanaDisplayText": readings[0],
        "romajiText": None,
        "englishMeaning": glosses_en[0],
        "alternateSpellings": alternate_spellings,
        "readings": readings,
        "glossesEn": glosses_en,
        "partsOfSpeech": unique_non_empty(entry["parts_of_speech"]) or ["unclassified"],
        "priorityTags": unique_non_empty(entry["priority_tags"]),
        "fields": unique_non_empty(entry["fields"]),
        "commonnessRankBucket": infer_commonness_bucket(entry["priority_tags"]),
        "curriculumSignals": pending_curriculum_signals(),
        "sourceRefs": pending_vocab_source_refs(row.ent_seq),
        "answerOptionPayload": {
            "schemaVersion": 1,
            "canonicalAnswers": canonical_answers,
            "distractorPoolItemIds": [],
        },
        "mappingStatus": "PENDING_LESSON_MAPPING",
        "explanationText": None,
        "isActive": True,
    }


def build_pending_registry_entry(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "skillCode": item["skillCode"],
        "trackSlug": item["trackSlug"],
        "primarySpelling": item["surfaceFormText"],
        "kanaDisplayText": item["kanaDisplayText"],
        "englishMeaning": item["englishMeaning"],
        "alternateSpellings": copy.deepcopy(item["alternateSpellings"]),
        "readings": copy.deepcopy(item["readings"]),
        "glossesEn": copy.deepcopy(item["glossesEn"]),
        "partsOfSpeech": copy.deepcopy(item["partsOfSpeech"]),
        "priorityTags": copy.deepcopy(item["priorityTags"]),
        "fields": copy.deepcopy(item["fields"]),
        "commonnessRankBucket": item["commonnessRankBucket"],
        "curriculumSignals": copy.deepcopy(item["curriculumSignals"]),
        "sourceRefs": copy.deepcopy(item["sourceRefs"]),
        "mappingStatus": item["mappingStatus"],
    }


def chunked(sequence: list[dict[str, Any]], size: int) -> list[list[dict[str, Any]]]:
    return [sequence[index : index + size] for index in range(0, len(sequence), size)]


def segmented_slug(base_slug: str, segment_index: int, segment_count: int) -> str:
    if segment_count == 1:
        return base_slug
    return f"{base_slug}-part-{segment_index:02d}"


def segmented_title(base_title: str, segment_index: int, segment_count: int) -> str:
    if segment_count == 1:
        return base_title
    return f"{base_title} Part {segment_index}"


def segmented_description(
    base_description: str,
    segment_index: int,
    segment_count: int,
    item_count: int,
) -> str:
    if segment_count == 1:
        return f"{base_description} Contains {item_count} items."
    return f"{base_description} Part {segment_index} of {segment_count}. Contains {item_count} items."


def append_segmented_decks(
    payload: dict[str, Any],
    *,
    track_slug: str,
    unit_slug: str | None,
    base_slug: str,
    base_title: str,
    base_description: str,
    source_skill_codes: list[str],
    items: list[dict[str, Any]],
    deck_sort_order_start: int,
    mapping_status: str,
) -> int:
    item_segments = chunked(items, DECK_SEGMENT_SIZE)
    deck_sort_order = deck_sort_order_start
    for segment_index, item_segment in enumerate(item_segments, start=1):
        deck_slug = segmented_slug(base_slug, segment_index, len(item_segments))
        deck_id = make_uuid("flashcard-deck", deck_slug)
        payload["decks"].append(
            {
                "id": deck_id,
                "slug": deck_slug,
                "trackSlug": track_slug,
                "unitSlug": unit_slug,
                "title": segmented_title(base_title, segment_index, len(item_segments)),
                "description": segmented_description(
                    base_description,
                    segment_index,
                    len(item_segments),
                    len(item_segment),
                ),
                "sortOrder": deck_sort_order,
                "isPublished": True,
                "sourceSkillCodes": source_skill_codes,
                "mappingStatus": mapping_status,
                "segmentIndex": segment_index,
                "segmentCount": len(item_segments),
                "itemCount": len(item_segment),
            }
        )
        deck_sort_order += 1

        for membership_sort_order, item in enumerate(item_segment, start=1):
            payload["deckItems"].append(
                {
                    "deckId": deck_id,
                    "itemId": item["id"],
                    "sortOrder": membership_sort_order,
                    "trackSlug": item["trackSlug"],
                    "unitSlug": item["unitSlug"],
                    "lessonSlug": item["lessonSlug"],
                    "skillCode": item["skillCode"],
                    "mappingStatus": item["mappingStatus"],
                }
            )
    return deck_sort_order


def collect_mapped_n5_ent_seq(track_payloads: dict[str, dict[str, Any]]) -> set[str]:
    ent_seq_values: set[str] = set()
    track = track_payloads["jlpt-n5-foundation"]["track"]
    for unit in track["units"]:
        for lesson in unit["lessons"]:
            for skill in lesson["skills"]:
                if skill.get("skillType") != "VOCABULARY":
                    continue
                if not skill.get("isPublished") or not skill.get("supportsFlashcards"):
                    continue
                for source_ref in skill.get("sourceRefs", []):
                    if source_ref.get("provider") == "JMDICT":
                        ent_seq_values.add(str(source_ref["externalId"]))
                        break
    return ent_seq_values


def build_pending_registry_and_items(
    mapped_n5_ent_seq: set[str],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    pending_rows = load_pending_n5_rows()
    rows_by_ent_seq: dict[str, list[PendingCandidateRow]] = {}
    ordered_ent_seq: list[str] = []
    for row in pending_rows:
        if row.ent_seq in mapped_n5_ent_seq:
            continue
        if row.ent_seq not in rows_by_ent_seq:
            rows_by_ent_seq[row.ent_seq] = []
            ordered_ent_seq.append(row.ent_seq)
        rows_by_ent_seq[row.ent_seq].append(row)

    resolver = JMDictByEntSeqResolver(set(ordered_ent_seq))
    resolver.load()

    pending_items: list[dict[str, Any]] = []
    registry_items: list[dict[str, Any]] = []
    for ent_seq in ordered_ent_seq:
        entry = resolver.resolve(ent_seq)
        row = choose_representative_candidate(rows_by_ent_seq[ent_seq], entry)
        item = build_pending_candidate_item(row, entry)
        pending_items.append(item)
        registry_items.append(build_pending_registry_entry(item))

    registry = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": GENERATED_AT,
        "trackSlug": "jlpt-n5-foundation",
        "curriculumLevel": "N5",
        "sourceProviders": ["JMDICT", "YOMITAN_JLPT_VOCAB"],
        "items": registry_items,
    }
    return pending_items, registry


def build_payload(track_payloads: dict[str, dict[str, Any]]) -> tuple[dict[str, Any], dict[str, Any]]:
    payload: dict[str, Any] = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": GENERATED_AT,
        "deckSource": "SYSTEM",
        "deckType": "FOUNDATION",
        "contentType": "VOCABULARY",
        "decks": [],
        "items": [],
        "deckItems": [],
    }

    seen_item_skill_codes: set[str] = set()
    seen_item_ids: set[str] = set()
    deck_sort_order = 1

    for track_slug in SUPPORTED_TRACK_SLUGS:
        track = track_payloads[track_slug]["track"]
        for unit in sorted(track["units"], key=lambda item: item["sortOrder"]):
            unit_items: list[dict[str, Any]] = []
            source_skill_codes: list[str] = []
            seen_source_skill_codes: set[str] = set()

            lessons = sorted(unit["lessons"], key=lambda item: item["sortOrder"])
            for lesson in lessons:
                for skill in lesson["skills"]:
                    if skill.get("skillType") != "VOCABULARY":
                        continue
                    if not skill.get("isPublished") or not skill.get("supportsFlashcards"):
                        continue

                    item = build_existing_item(track, unit, lesson, skill)
                    if item["skillCode"] in seen_item_skill_codes:
                        raise ValueError(
                            f"Duplicate vocabulary skillCode '{item['skillCode']}' produced multiple flashcard items."
                        )
                    if item["id"] in seen_item_ids:
                        raise ValueError(
                            f"Deterministic item id collision detected for skillCode '{item['skillCode']}'."
                        )

                    seen_item_skill_codes.add(item["skillCode"])
                    seen_item_ids.add(item["id"])
                    unit_items.append(item)
                    payload["items"].append(item)

                    skill_code_parts = skill["code"].rsplit("_", 1)
                    source_skill_code = skill_code_parts[0] if len(skill_code_parts) == 2 else skill["code"]
                    if source_skill_code not in seen_source_skill_codes:
                        seen_source_skill_codes.add(source_skill_code)
                        source_skill_codes.append(source_skill_code)

            if not unit_items:
                continue

            base_slug = f"{unit['slug']}-vocabulary-foundation"
            base_title = f"{track['curriculumLevel']} {unit['title']} Vocabulary"
            base_description = (
                f"System vocabulary deck for the {track['curriculumLevel']} {unit['title']} unit."
            )
            deck_sort_order = append_segmented_decks(
                payload,
                track_slug=track["slug"],
                unit_slug=unit["slug"],
                base_slug=base_slug,
                base_title=base_title,
                base_description=base_description,
                source_skill_codes=source_skill_codes,
                items=unit_items,
                deck_sort_order_start=deck_sort_order,
                mapping_status="SYLLABUS_MAPPED",
            )

    mapped_n5_ent_seq = collect_mapped_n5_ent_seq(track_payloads)
    pending_items, pending_registry = build_pending_registry_and_items(mapped_n5_ent_seq)

    for item in pending_items:
        if item["skillCode"] in seen_item_skill_codes:
            raise ValueError(
                f"Pending N5 candidate skillCode '{item['skillCode']}' collides with an existing skillCode."
            )
        if item["id"] in seen_item_ids:
            raise ValueError(
                f"Pending N5 candidate item id collision detected for skillCode '{item['skillCode']}'."
            )
        seen_item_skill_codes.add(item["skillCode"])
        seen_item_ids.add(item["id"])
        payload["items"].append(item)

    deck_sort_order = append_segmented_decks(
        payload,
        track_slug="jlpt-n5-foundation",
        unit_slug=None,
        base_slug="jlpt-n5-foundation-vocabulary-foundation-unmapped",
        base_title="N5 Candidate Vocabulary Backlog",
        base_description=(
            "Track-scoped N5 vocabulary candidate deck generated from the JMdict lexical base plus the Yomitan N5 overlay while lesson mapping remains pending."
        ),
        source_skill_codes=[PENDING_N5_SOURCE_HANDLE],
        items=pending_items,
        deck_sort_order_start=deck_sort_order,
        mapping_status="PENDING_LESSON_MAPPING",
    )

    return payload, pending_registry


def validate_pending_registry(registry: dict[str, Any]) -> None:
    schema = load_json(DOCS_SCHEMA_DIR / "pending-vocabulary-skill-code-registry.schema.json")
    jsonschema.validate(registry, schema)


def validate_output(
    payload: dict[str, Any],
    track_payloads: dict[str, dict[str, Any]],
    pending_registry: dict[str, Any],
) -> None:
    output_schema = load_json(DOCS_SCHEMA_DIR / "vocabulary-flashcard-seed.schema.json")
    jsonschema.validate(payload, output_schema)
    validate_pending_registry(pending_registry)

    track_lookup: dict[str, dict[str, Any]] = {
        payload_data["track"]["slug"]: payload_data["track"] for payload_data in track_payloads.values()
    }
    item_lookup = {item["id"]: item for item in payload["items"]}
    pending_skill_codes = {item["skillCode"] for item in pending_registry["items"]}

    for deck in payload["decks"]:
        track = track_lookup.get(deck["trackSlug"])
        if track is None:
            raise ValueError(f"Deck '{deck['slug']}' points to unknown track '{deck['trackSlug']}'.")
        if deck["unitSlug"] is not None and not any(unit["slug"] == deck["unitSlug"] for unit in track["units"]):
            raise ValueError(
                f"Deck '{deck['slug']}' points to unknown unit '{deck['unitSlug']}' in track '{deck['trackSlug']}'."
            )
        if deck["itemCount"] < 1 or deck["itemCount"] > DECK_SEGMENT_SIZE:
            raise ValueError(f"Deck '{deck['slug']}' violates the deck item count rule.")
        if deck["mappingStatus"] == "SYLLABUS_MAPPED" and deck["unitSlug"] is None:
            raise ValueError(f"Mapped deck '{deck['slug']}' must keep a unitSlug.")
        if deck["mappingStatus"] == "PENDING_LESSON_MAPPING" and deck["unitSlug"] is not None:
            raise ValueError(f"Pending deck '{deck['slug']}' must stay track-scoped.")

    for item in payload["items"]:
        track = track_lookup.get(item["trackSlug"])
        if track is None:
            raise ValueError(f"Item '{item['skillCode']}' points to unknown track '{item['trackSlug']}'.")

        if item["mappingStatus"] == "SYLLABUS_MAPPED":
            if item["skillId"] is None or item["unitSlug"] is None or item["lessonSlug"] is None:
                raise ValueError(f"Mapped item '{item['skillCode']}' is missing syllabus ownership fields.")
            unit = next((candidate for candidate in track["units"] if candidate["slug"] == item["unitSlug"]), None)
            if unit is None:
                raise ValueError(
                    f"Item '{item['skillCode']}' points to unknown unit '{item['unitSlug']}' in track '{item['trackSlug']}'."
                )
            lesson = next((candidate for candidate in unit["lessons"] if candidate["slug"] == item["lessonSlug"]), None)
            if lesson is None:
                raise ValueError(
                    f"Item '{item['skillCode']}' points to unknown lesson '{item['lessonSlug']}' in unit '{item['unitSlug']}'."
                )
            if not any(skill["code"] == item["skillCode"] for skill in lesson["skills"]):
                raise ValueError(
                    f"Item '{item['skillCode']}' cannot be traced back to lesson '{item['lessonSlug']}'."
                )
        else:
            if item["trackSlug"] != "jlpt-n5-foundation":
                raise ValueError(f"Pending item '{item['skillCode']}' must remain under the N5 track.")
            if item["skillId"] is not None or item["unitSlug"] is not None or item["lessonSlug"] is not None:
                raise ValueError(
                    f"Pending item '{item['skillCode']}' must not pretend to be mapped to a lesson yet."
                )
            if item["skillCode"] not in pending_skill_codes:
                raise ValueError(
                    f"Pending item '{item['skillCode']}' is missing from the pending registry output."
                )

    memberships_by_deck: dict[str, list[dict[str, Any]]] = {}
    for membership in payload["deckItems"]:
        item = item_lookup.get(membership["itemId"])
        if item is None:
            raise ValueError(f"Deck membership references missing itemId '{membership['itemId']}'.")
        if membership["skillCode"] != item["skillCode"]:
            raise ValueError(
                f"Deck membership for itemId '{membership['itemId']}' carries mismatched skillCode '{membership['skillCode']}'."
            )
        if membership["mappingStatus"] != item["mappingStatus"]:
            raise ValueError(
                f"Deck membership for skillCode '{membership['skillCode']}' carries mismatched mappingStatus."
            )
        if membership["trackSlug"] != item["trackSlug"]:
            raise ValueError(
                f"Deck membership for skillCode '{membership['skillCode']}' carries mismatched trackSlug."
            )
        if membership["unitSlug"] != item["unitSlug"] or membership["lessonSlug"] != item["lessonSlug"]:
            raise ValueError(
                f"Deck membership for skillCode '{membership['skillCode']}' carries mismatched lesson ownership."
            )
        memberships_by_deck.setdefault(membership["deckId"], []).append(membership)

    for deck in payload["decks"]:
        memberships = memberships_by_deck.get(deck["id"], [])
        if len(memberships) != deck["itemCount"]:
            raise ValueError(
                f"Deck '{deck['slug']}' declares itemCount={deck['itemCount']} but has {len(memberships)} memberships."
            )
        expected_sort_orders = list(range(1, len(memberships) + 1))
        actual_sort_orders = sorted(membership["sortOrder"] for membership in memberships)
        if actual_sort_orders != expected_sort_orders:
            raise ValueError(f"Deck '{deck['slug']}' has non-contiguous membership sortOrder values.")


def main() -> None:
    track_payloads = validate_inputs()
    payload, pending_registry = build_payload(track_payloads)
    validate_output(payload, track_payloads, pending_registry)
    write_json(OUTPUT_PATH, payload)
    write_json(PENDING_REGISTRY_OUTPUT_PATH, pending_registry)
    print(
        f"Generated {OUTPUT_PATH} with "
        f"{len(payload['decks'])} decks, {len(payload['items'])} items, and {len(payload['deckItems'])} memberships."
    )
    print(
        f"Generated {PENDING_REGISTRY_OUTPUT_PATH} with "
        f"{len(pending_registry['items'])} pending N5 skill codes."
    )


if __name__ == "__main__":
    main()
