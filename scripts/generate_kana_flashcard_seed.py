#!/usr/bin/env python3
from __future__ import annotations

import copy
import json
import uuid
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import jsonschema


ROOT = Path(__file__).resolve().parents[1]
SYLLABUS_CONTENT_DIR = ROOT / "content" / "syllabus"
OUTPUT_DIR = ROOT / "content" / "flashcards" / "system-decks"
OUTPUT_PATH = OUTPUT_DIR / "kana-foundation.json"
DOCS_SCHEMA_DIR = ROOT / "docs" / "syllabus" / "schema"

SCHEMA_VERSION = "1.0.0"
GENERATED_AT = date.today().isoformat()
SUPPORTED_TRACK_SLUG = "jlpt-n5-foundation"
UUID_NAMESPACE = uuid.uuid5(
    uuid.NAMESPACE_URL,
    "https://kotobahub.local/content/flashcards/system-decks/kana-foundation",
)
SCRIPT_FAMILY_TO_ITEM_TYPE = {
    "HIRAGANA": "HIRAGANA_CHARACTER",
    "KATAKANA": "KATAKANA_CHARACTER",
}


@dataclass(frozen=True)
class KanaSkillContext:
    track: dict[str, Any]
    unit: dict[str, Any]
    lesson: dict[str, Any]
    skill: dict[str, Any]


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def make_uuid(*parts: str) -> str:
    return str(uuid.uuid5(UUID_NAMESPACE, "/".join(parts)))


def require_string(value: Any, *, label: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{label} must be a string.")
    normalized = value.strip()
    if not normalized:
        raise ValueError(f"{label} must not be empty.")
    return normalized


def validate_inputs() -> dict[str, Any]:
    manifest = load_json(SYLLABUS_CONTENT_DIR / "manifest.json")
    manifest_schema = load_json(DOCS_SCHEMA_DIR / "seed-manifest.schema.json")

    jsonschema.validate(manifest, manifest_schema)

    manifest_track = next(
        (
            track
            for track in manifest["tracks"]
            if track["slug"] == SUPPORTED_TRACK_SLUG and track["isPublished"]
        ),
        None,
    )
    if manifest_track is None:
        raise ValueError(f"Published track '{SUPPORTED_TRACK_SLUG}' is missing from the syllabus manifest.")

    track_path = SYLLABUS_CONTENT_DIR / manifest_track["file"]
    payload = load_json(track_path)
    ensure_track_payload_shape(payload, track_path)

    track = payload["track"]
    if track["slug"] != SUPPORTED_TRACK_SLUG:
        raise ValueError(f"Track payload slug mismatch: expected '{SUPPORTED_TRACK_SLUG}', got '{track['slug']}'.")
    if not track["isPublished"]:
        raise ValueError(f"Track '{SUPPORTED_TRACK_SLUG}' must remain published in its payload.")

    return payload


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


def build_skill_lookup(track_payload: dict[str, Any]) -> dict[str, KanaSkillContext]:
    track = track_payload["track"]
    lookup: dict[str, KanaSkillContext] = {}

    for unit in track["units"]:
        for lesson in unit["lessons"]:
            for skill in lesson["skills"]:
                if skill["code"] in lookup:
                    raise ValueError(f"Duplicate skill code '{skill['code']}' found in track payload.")
                lookup[skill["code"]] = KanaSkillContext(
                    track=track,
                    unit=unit,
                    lesson=lesson,
                    skill=skill,
                )

    return lookup


def iter_kana_lessons(track_payload: dict[str, Any]) -> list[tuple[dict[str, Any], dict[str, Any], list[dict[str, Any]]]]:
    track = track_payload["track"]
    result: list[tuple[dict[str, Any], dict[str, Any], list[dict[str, Any]]]] = []

    for unit in sorted(track["units"], key=lambda item: item["sortOrder"]):
        for lesson in sorted(unit["lessons"], key=lambda item: item["sortOrder"]):
            kana_skills = [
                skill
                for skill in sorted(lesson["skills"], key=lambda item: item["sortOrder"])
                if skill["skillType"] == "KANA" and skill["supportsFlashcards"] and skill["isPublished"]
            ]
            if kana_skills:
                result.append((unit, lesson, kana_skills))

    return result


def build_item(
    track: dict[str, Any],
    unit: dict[str, Any],
    lesson: dict[str, Any],
    skill: dict[str, Any],
    *,
    character: dict[str, Any],
    character_index: int,
) -> dict[str, Any]:
    kana_content = skill.get("content", {}).get("kana")
    if not isinstance(kana_content, dict):
        raise ValueError(f"Kana skill '{skill['code']}' is missing content.kana.")

    script_family = require_string(kana_content.get("scriptFamily"), label=f"{skill['code']} scriptFamily")
    item_type = SCRIPT_FAMILY_TO_ITEM_TYPE.get(script_family)
    if item_type is None:
        raise ValueError(
            f"Kana skill '{skill['code']}' has unsupported script family '{script_family}'."
        )

    char_text = require_string(character.get("char"), label=f"{skill['code']} character[{character_index}] char")
    romanization = require_string(
        character.get("romanization"),
        label=f"{skill['code']} character[{character_index}] romanization",
    )

    return {
        "id": make_uuid("flashcard-item", "kana", skill["code"], f"{character_index:02d}"),
        "skillId": skill["id"],
        "skillCode": skill["code"],
        "trackSlug": track["slug"],
        "unitSlug": unit["slug"],
        "lessonSlug": lesson["slug"],
        "itemType": item_type,
        "surfaceFormText": char_text,
        "kanaDisplayText": char_text,
        "romajiText": romanization,
        "englishMeaning": None,
        "curriculumSignals": copy.deepcopy(skill.get("curriculumSignals", {})),
        "sourceRefs": copy.deepcopy(skill.get("sourceRefs", [])),
        "answerOptionPayload": {
            "schemaVersion": 1,
            "canonicalAnswers": {
                "KANA": [char_text],
                "ROMAJI": [romanization],
            },
            "distractorPoolItemIds": [],
        },
        "mappingStatus": "SYLLABUS_MAPPED",
        "explanationText": None,
        "isActive": bool(skill["isPublished"]),
    }


def build_payload(track_payload: dict[str, Any]) -> dict[str, Any]:
    track = track_payload["track"]
    payload = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": GENERATED_AT,
        "deckSource": "SYSTEM",
        "deckType": "FOUNDATION",
        "contentType": "KANA",
        "decks": [],
        "items": [],
        "deckItems": [],
    }

    deck_sort_order = 1

    for unit, lesson, kana_skills in iter_kana_lessons(track_payload):
        deck_id = make_uuid("flashcard-deck", lesson["slug"], "kana-foundation")
        deck_slug = f"{lesson['slug']}-kana-foundation"
        deck_item_ids: list[str] = []

        for skill in kana_skills:
            kana_content = skill.get("content", {}).get("kana")
            if not isinstance(kana_content, dict):
                raise ValueError(f"Kana skill '{skill['code']}' is missing content.kana.")
            characters = kana_content.get("characters")
            if not isinstance(characters, list) or not characters:
                raise ValueError(f"Kana skill '{skill['code']}' must expose at least one kana character.")

            for character_index, character in enumerate(characters, start=1):
                item = build_item(
                    track,
                    unit,
                    lesson,
                    skill,
                    character=character,
                    character_index=character_index,
                )
                payload["items"].append(item)
                deck_item_ids.append(item["id"])
                payload["deckItems"].append(
                    {
                        "deckId": deck_id,
                        "itemId": item["id"],
                        "sortOrder": len(deck_item_ids),
                        "trackSlug": track["slug"],
                        "unitSlug": unit["slug"],
                        "lessonSlug": lesson["slug"],
                        "skillCode": skill["code"],
                        "mappingStatus": "SYLLABUS_MAPPED",
                    }
                )

        item_lookup = {item["id"]: item for item in payload["items"]}
        for item_id in deck_item_ids:
            item_lookup[item_id]["answerOptionPayload"]["distractorPoolItemIds"] = [
                candidate_id for candidate_id in deck_item_ids if candidate_id != item_id
            ]

        payload["decks"].append(
            {
                "id": deck_id,
                "slug": deck_slug,
                "trackSlug": track["slug"],
                "unitSlug": unit["slug"],
                "lessonSlug": lesson["slug"],
                "title": f"{lesson['title']} Kana Foundation",
                "description": (
                    f"System kana deck for the {lesson['title']} lesson. Contains {len(deck_item_ids)} items."
                ),
                "sortOrder": deck_sort_order,
                "isPublished": True,
                "sourceSkillCodes": [skill["code"] for skill in kana_skills],
                "mappingStatus": "SYLLABUS_MAPPED",
                "segmentIndex": 1,
                "segmentCount": 1,
                "itemCount": len(deck_item_ids),
            }
        )
        deck_sort_order += 1

    return payload


def validate_output(payload: dict[str, Any], skill_lookup: dict[str, KanaSkillContext]) -> None:
    output_schema = load_json(DOCS_SCHEMA_DIR / "kana-flashcard-seed.schema.json")
    jsonschema.validate(payload, output_schema)

    item_lookup = {item["id"]: item for item in payload["items"]}

    for deck in payload["decks"]:
        if deck["trackSlug"] != SUPPORTED_TRACK_SLUG:
            raise ValueError(f"Deck '{deck['slug']}' points to unsupported track '{deck['trackSlug']}'.")
        if deck["segmentIndex"] != 1 or deck["segmentCount"] != 1:
            raise ValueError(f"Deck '{deck['slug']}' must remain unsegmented for KANA baseline.")
        if deck["itemCount"] < 1:
            raise ValueError(f"Deck '{deck['slug']}' must contain at least one item.")

    for item in payload["items"]:
        context = skill_lookup.get(item["skillCode"])
        if context is None:
            raise ValueError(f"Item '{item['skillCode']}' points to an unknown skill code.")
        if item["skillId"] != context.skill["id"]:
            raise ValueError(f"Item '{item['skillCode']}' points to a mismatched skillId.")
        if item["trackSlug"] != context.track["slug"]:
            raise ValueError(f"Item '{item['skillCode']}' points to a mismatched track slug.")
        if item["unitSlug"] != context.unit["slug"] or item["lessonSlug"] != context.lesson["slug"]:
            raise ValueError(f"Item '{item['skillCode']}' points to mismatched syllabus ownership.")

        expected_script_family = context.skill["content"]["kana"]["scriptFamily"]
        expected_item_type = SCRIPT_FAMILY_TO_ITEM_TYPE[expected_script_family]
        if item["itemType"] != expected_item_type:
            raise ValueError(f"Item '{item['skillCode']}' points to mismatched itemType '{item['itemType']}'.")

        canonical_answers = item["answerOptionPayload"]["canonicalAnswers"]
        if item["surfaceFormText"] not in canonical_answers["KANA"]:
            raise ValueError(f"Item '{item['skillCode']}' is missing its kana answer.")
        if item["romajiText"] not in canonical_answers["ROMAJI"]:
            raise ValueError(f"Item '{item['skillCode']}' is missing its romaji answer.")

    memberships_by_deck: dict[str, list[dict[str, Any]]] = {}
    for membership in payload["deckItems"]:
        item = item_lookup.get(membership["itemId"])
        if item is None:
            raise ValueError(f"Deck membership references missing itemId '{membership['itemId']}'.")
        if membership["skillCode"] != item["skillCode"]:
            raise ValueError(
                f"Deck membership for itemId '{membership['itemId']}' carries mismatched skillCode."
            )
        if membership["lessonSlug"] != item["lessonSlug"] or membership["unitSlug"] != item["unitSlug"]:
            raise ValueError(
                f"Deck membership for itemId '{membership['itemId']}' carries mismatched syllabus ownership."
            )
        memberships_by_deck.setdefault(membership["deckId"], []).append(membership)

    for deck in payload["decks"]:
        memberships = sorted(memberships_by_deck.get(deck["id"], []), key=lambda entry: entry["sortOrder"])
        if len(memberships) != deck["itemCount"]:
            raise ValueError(f"Deck '{deck['slug']}' itemCount does not match its memberships.")
        expected_order = list(range(1, len(memberships) + 1))
        actual_order = [membership["sortOrder"] for membership in memberships]
        if actual_order != expected_order:
            raise ValueError(f"Deck '{deck['slug']}' has a broken membership order.")

        deck_item_ids = [membership["itemId"] for membership in memberships]
        for item_id in deck_item_ids:
            distractor_pool = item_lookup[item_id]["answerOptionPayload"]["distractorPoolItemIds"]
            expected_pool = [candidate_id for candidate_id in deck_item_ids if candidate_id != item_id]
            if distractor_pool != expected_pool:
                raise ValueError(
                    f"Item '{item_lookup[item_id]['skillCode']}' carries an unexpected distractor pool."
                )


def main() -> None:
    track_payload = validate_inputs()
    skill_lookup = build_skill_lookup(track_payload)
    payload = build_payload(track_payload)
    validate_output(payload, skill_lookup)
    write_json(OUTPUT_PATH, payload)

    print(
        f"Generated {len(payload['decks'])} kana decks, "
        f"{len(payload['items'])} items, and {len(payload['deckItems'])} memberships."
    )


if __name__ == "__main__":
    main()
