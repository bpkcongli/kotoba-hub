#!/usr/bin/env python3
from __future__ import annotations

import gzip
import json
import re
import uuid
import zipfile
from collections import defaultdict
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any
import xml.etree.ElementTree as ET

import jsonschema


ROOT = Path(__file__).resolve().parents[1]
DOCS_DIR = ROOT / "docs" / "syllabus"
CONTENT_DIR = ROOT / "content" / "syllabus"
TRACKS_DIR = CONTENT_DIR / "tracks"

SCHEMA_VERSION = "1.0.0"
GENERATED_AT = date.today().isoformat()
UUID_NAMESPACE = uuid.uuid5(
    uuid.NAMESPACE_URL,
    "https://kotobahub.local/content/syllabus",
)

BUNPRO_DECK_URLS = {
    "N5": "https://bunpro.jp/decks/nn10ai/Bunpro-N5-Grammar",
    "N4": "https://bunpro.jp/decks/m7omkx/bunpro-n4-grammar",
}

TRACKS = [
    {
        "slug": "jlpt-n5-foundation",
        "curriculumLevel": "N5",
        "title": "JLPT N5 Foundation",
        "description": "Core beginner syllabus for first-contact learners who need kana, survival grammar, and daily-use vocabulary.",
        "sortOrder": 1,
        "isPublished": True,
    },
    {
        "slug": "jlpt-n4-expansion",
        "curriculumLevel": "N4",
        "title": "JLPT N4 Expansion",
        "description": "Intermediate bridge track that expands plain form control, clause linking, and socially aware communication.",
        "sortOrder": 2,
        "isPublished": True,
    },
    {
        "slug": "jlpt-n3-bridge",
        "curriculumLevel": "N3",
        "title": "JLPT N3 Bridge",
        "description": "Unpublished bridge shell reserved for future expansion beyond the MVP detailed seed.",
        "sortOrder": 3,
        "isPublished": False,
    },
    {
        "slug": "jlpt-n2-advanced",
        "curriculumLevel": "N2",
        "title": "JLPT N2 Advanced",
        "description": "Unpublished advanced shell reserved for future expansion beyond the MVP detailed seed.",
        "sortOrder": 4,
        "isPublished": False,
    },
]

PROFILE_TO_FLAGS = {
    "BOTH": (True, True, False),
    "RQ-OBJ": (False, True, False),
    "RQ-OBJ+FR": (False, True, True),
    "RQ-FR": (False, False, True),
}

READING_SKILL_CONTENT = {
    "n5_reading_micro_schedule": {
        "title": "Micro Schedule Reading",
        "passageText": "月曜日のあさは七時におきます。八時に学校へ行きます。火曜日は図書館で一時間べんきょうします。",
        "translationEn": "On Monday morning, I wake up at seven. I go to school at eight. On Tuesday, I study in the library for one hour.",
        "focus": "Read a tiny weekly schedule and identify time, place, and frequency cues.",
        "comprehensionChecks": [
            {
                "prompt": "What time does the speaker wake up on Monday?",
                "expectedAnswerEn": "At seven o'clock.",
            },
            {
                "prompt": "Where does the speaker study on Tuesday?",
                "expectedAnswerEn": "In the library.",
            },
        ],
    },
    "n5_short_reading_reason_and_comparison": {
        "title": "Short Reason And Comparison Reading",
        "passageText": "わたしはでんしゃよりバスのほうがすきです。バスはやすいですから、学校まで行きやすいです。",
        "translationEn": "I like buses more than trains. Because buses are cheap, they are easy to take to school.",
        "focus": "Read a short preference statement that combines reason and comparison.",
        "comprehensionChecks": [
            {
                "prompt": "Which does the speaker like more?",
                "expectedAnswerEn": "Buses.",
            },
            {
                "prompt": "Why does the speaker prefer it?",
                "expectedAnswerEn": "Because it is cheap.",
            },
        ],
    },
    "n4_plain_form_reading_bridge": {
        "title": "Plain Form Reading Bridge",
        "passageText": "きのう友だちが来ると思ったが、来なかった。だから、わたしは一人でしゅくだいをした。",
        "translationEn": "Yesterday I thought my friend would come, but they did not. So I did my homework alone.",
        "focus": "Track plain-form clauses inside a short connected statement.",
        "comprehensionChecks": [
            {
                "prompt": "Did the friend come?",
                "expectedAnswerEn": "No, the friend did not come.",
            }
        ],
    },
    "n4_experience_growth_reading": {
        "title": "Experience And Growth Reading",
        "passageText": "日本へ行ってから、毎日日本語を話すようになりました。前より聞くことも話すことも少し上手になりました。",
        "translationEn": "After going to Japan, I started speaking Japanese every day. Compared with before, I became a little better at both listening and speaking.",
        "focus": "Read a short reflection about habit change and growing ability.",
        "comprehensionChecks": [
            {
                "prompt": "What new daily habit did the speaker gain?",
                "expectedAnswerEn": "Speaking Japanese every day.",
            }
        ],
    },
    "n4_hikaku_quantity_reading": {
        "title": "Comparison And Quantity Reading",
        "passageText": "この店は前より人が多いですが、品物の数はそんなに多くありません。だから、買い物は早く終わります。",
        "translationEn": "This shop has more people than before, but the number of goods is not that many. So shopping finishes quickly.",
        "focus": "Interpret comparison and quantity limits in a compact informational paragraph.",
        "comprehensionChecks": [
            {
                "prompt": "Is the number of goods very high?",
                "expectedAnswerEn": "No, it is not that many.",
            }
        ],
    },
    "n4_social_context_reading": {
        "title": "Respectful Social Reading",
        "passageText": "お客様がいらっしゃいましたら、受付で少々お待ちくださいとお伝えください。",
        "translationEn": "If a customer arrives, please tell them to wait a moment at the reception desk.",
        "focus": "Read a short service-context message with respectful language and role awareness.",
        "comprehensionChecks": [
            {
                "prompt": "Who should wait at the reception desk?",
                "expectedAnswerEn": "The customer.",
            }
        ],
    },
    "n4_multi_clause_reading_inference": {
        "title": "Multi-clause Reading Inference",
        "passageText": "雨が降りそうだったのに、空はだんだん明るくなった。それで、出かけようと思っていた友だちは予定どおり公園へ行ったらしい。",
        "translationEn": "Even though it looked like rain, the sky gradually became brighter. Because of that, it seems my friend, who had been thinking of going out, went to the park as planned.",
        "focus": "Follow a multi-clause passage and infer how changing conditions affect the outcome.",
        "comprehensionChecks": [
            {
                "prompt": "Why did the friend go to the park as planned?",
                "expectedAnswerEn": "Because the sky became brighter and the weather improved.",
            }
        ],
    },
    "n4_expression_bridge_to_n3": {
        "title": "Expression Bridge To N3",
        "passageText": "新しい仕事は大変だけれど、前より自分で考えて動くことが多くなった。まだ不安もあるが、この経験は次のレベルにつながると思う。",
        "translationEn": "The new job is tough, but I now have to think and act on my own more than before. I still feel anxious, but I think this experience will connect to the next level.",
        "focus": "Close N4 with a reflective passage that bridges practical reading into broader expression.",
        "comprehensionChecks": [
            {
                "prompt": "What changed in the speaker's work style?",
                "expectedAnswerEn": "They now think and act on their own more often.",
            }
        ],
    },
}


KANA_CONTENT = {
    "hiragana_a_row": ("HIRAGANA", [("あ", "a"), ("い", "i"), ("う", "u"), ("え", "e"), ("お", "o")]),
    "hiragana_ka_row": ("HIRAGANA", [("か", "ka"), ("き", "ki"), ("く", "ku"), ("け", "ke"), ("こ", "ko")]),
    "hiragana_sa_row": ("HIRAGANA", [("さ", "sa"), ("し", "shi"), ("す", "su"), ("せ", "se"), ("そ", "so")]),
    "hiragana_ta_row": ("HIRAGANA", [("た", "ta"), ("ち", "chi"), ("つ", "tsu"), ("て", "te"), ("と", "to")]),
    "hiragana_na_row": ("HIRAGANA", [("な", "na"), ("に", "ni"), ("ぬ", "nu"), ("ね", "ne"), ("の", "no")]),
    "hiragana_ha_row": ("HIRAGANA", [("は", "ha"), ("ひ", "hi"), ("ふ", "fu"), ("へ", "he"), ("ほ", "ho")]),
    "hiragana_ma_row": ("HIRAGANA", [("ま", "ma"), ("み", "mi"), ("む", "mu"), ("め", "me"), ("も", "mo")]),
    "hiragana_ya_row": ("HIRAGANA", [("や", "ya"), ("ゆ", "yu"), ("よ", "yo")]),
    "hiragana_ra_row": ("HIRAGANA", [("ら", "ra"), ("り", "ri"), ("る", "ru"), ("れ", "re"), ("ろ", "ro")]),
    "hiragana_wa_n_row": ("HIRAGANA", [("わ", "wa"), ("を", "o"), ("ん", "n")]),
    "hiragana_dakuten_rows": ("HIRAGANA", [("が", "ga"), ("ぎ", "gi"), ("ぐ", "gu"), ("げ", "ge"), ("ご", "go"), ("ざ", "za"), ("じ", "ji"), ("ず", "zu"), ("ぜ", "ze"), ("ぞ", "zo"), ("だ", "da"), ("で", "de"), ("ど", "do"), ("ば", "ba"), ("び", "bi"), ("ぶ", "bu"), ("べ", "be"), ("ぼ", "bo")]),
    "hiragana_handakuten_row": ("HIRAGANA", [("ぱ", "pa"), ("ぴ", "pi"), ("ぷ", "pu"), ("ぺ", "pe"), ("ぽ", "po")]),
    "small_tsu_gemination": ("HIRAGANA", [("っ", "small tsu")]),
    "katakana_a_row": ("KATAKANA", [("ア", "a"), ("イ", "i"), ("ウ", "u"), ("エ", "e"), ("オ", "o")]),
    "katakana_ka_row": ("KATAKANA", [("カ", "ka"), ("キ", "ki"), ("ク", "ku"), ("ケ", "ke"), ("コ", "ko")]),
    "katakana_sa_ta_na_rows": ("KATAKANA", [("サ", "sa"), ("シ", "shi"), ("ス", "su"), ("セ", "se"), ("ソ", "so"), ("タ", "ta"), ("チ", "chi"), ("ツ", "tsu"), ("テ", "te"), ("ト", "to"), ("ナ", "na"), ("ニ", "ni"), ("ヌ", "nu"), ("ネ", "ne"), ("ノ", "no")]),
    "katakana_ha_ma_ya_ra_wa_rows": ("KATAKANA", [("ハ", "ha"), ("ヒ", "hi"), ("フ", "fu"), ("ヘ", "he"), ("ホ", "ho"), ("マ", "ma"), ("ミ", "mi"), ("ム", "mu"), ("メ", "me"), ("モ", "mo"), ("ヤ", "ya"), ("ユ", "yu"), ("ヨ", "yo"), ("ラ", "ra"), ("リ", "ri"), ("ル", "ru"), ("レ", "re"), ("ロ", "ro"), ("ワ", "wa"), ("ン", "n")]),
    "katakana_dakuten_rows": ("KATAKANA", [("ガ", "ga"), ("ギ", "gi"), ("グ", "gu"), ("ゲ", "ge"), ("ゴ", "go"), ("ザ", "za"), ("ジ", "ji"), ("ズ", "zu"), ("ゼ", "ze"), ("ゾ", "zo"), ("ダ", "da"), ("デ", "de"), ("ド", "do"), ("バ", "ba"), ("ビ", "bi"), ("ブ", "bu"), ("ベ", "be"), ("ボ", "bo")]),
    "katakana_handakuten_row": ("KATAKANA", [("パ", "pa"), ("ピ", "pi"), ("プ", "pu"), ("ペ", "pe"), ("ポ", "po")]),
    "katakana_combo_sounds": ("KATAKANA", [("キャ", "kya"), ("シュ", "shu"), ("チョ", "cho"), ("ミュ", "myu"), ("リョ", "ryo")]),
    "kana_script_switch_basics": ("KATAKANA", [("コーヒー", "koohii"), ("テレビ", "terebi"), ("パン", "pan"), ("ノート", "nooto")]),
}


@dataclass(frozen=True)
class VocabRequest:
    spelling: str
    reading: str | None = None
    code_suffix: str | None = None


VOCAB_BUNDLES: dict[str, list[VocabRequest]] = {
    "n5_vocab_greetings_and_polite_openers": [
        VocabRequest("こんにちは"),
        VocabRequest("おはよう"),
        VocabRequest("こんばんは"),
        VocabRequest("ありがとう"),
        VocabRequest("すみません"),
    ],
    "n5_vocab_basic_self_intro_phrases": [
        VocabRequest("はじめまして"),
        VocabRequest("よろしく"),
        VocabRequest("どうぞ"),
        VocabRequest("こちらこそ"),
    ],
    "n5_vocab_identity_and_roles": [
        VocabRequest("学生", "がくせい"),
        VocabRequest("先生", "せんせい"),
        VocabRequest("会社員", "かいしゃいん"),
        VocabRequest("日本人", "にほんじん"),
        VocabRequest("友達", "ともだち"),
    ],
    "n5_kosoado_pronouns": [
        VocabRequest("これ"),
        VocabRequest("それ"),
        VocabRequest("あれ"),
    ],
    "n5_vocab_classroom_objects_basic": [
        VocabRequest("本", "ほん"),
        VocabRequest("ノート"),
        VocabRequest("ペン"),
        VocabRequest("机", "つくえ"),
        VocabRequest("椅子", "いす"),
    ],
    "n5_kosoado_modifiers": [
        VocabRequest("この"),
        VocabRequest("その"),
        VocabRequest("あの"),
    ],
    "n5_vocab_people_places_things_basic": [
        VocabRequest("人", "ひと"),
        VocabRequest("かばん"),
        VocabRequest("部屋", "へや"),
        VocabRequest("店", "みせ"),
        VocabRequest("車", "くるま"),
    ],
    "n5_place_reference_words": [
        VocabRequest("ここ"),
        VocabRequest("そこ"),
        VocabRequest("あそこ"),
    ],
    "n5_where_question_doko": [
        VocabRequest("どこ"),
    ],
    "n5_vocab_campus_and_home_places": [
        VocabRequest("学校", "がっこう"),
        VocabRequest("教室", "きょうしつ"),
        VocabRequest("図書館", "としょかん"),
        VocabRequest("家", "いえ"),
        VocabRequest("部屋", "へや"),
        VocabRequest("台所", "だいどころ"),
    ],
    "n5_who_dare": [
        VocabRequest("誰", "だれ"),
    ],
    "n5_which_one_dore": [
        VocabRequest("どれ"),
    ],
    "n5_which_noun_dono": [
        VocabRequest("どの"),
    ],
    "n5_vocab_people_reference_basic": [
        VocabRequest("私", "わたし"),
        VocabRequest("あなた"),
        VocabRequest("彼", "かれ"),
        VocabRequest("彼女", "かのじょ"),
    ],
    "n5_vocab_daily_routine_verbs": [
        VocabRequest("行く", "いく"),
        VocabRequest("来る", "くる"),
        VocabRequest("帰る", "かえる"),
        VocabRequest("食べる", "たべる"),
        VocabRequest("飲む", "のむ"),
        VocabRequest("見る", "みる"),
        VocabRequest("聞く", "きく"),
        VocabRequest("勉強", "べんきょう"),
    ],
    "n5_i_adjective_inventory_basic": [
        VocabRequest("いい"),
        VocabRequest("高い", "たかい"),
        VocabRequest("安い", "やすい"),
        VocabRequest("大きい", "おおきい"),
        VocabRequest("小さい", "ちいさい"),
        VocabRequest("おいしい"),
    ],
    "n5_na_adjective_inventory_basic": [
        VocabRequest("静か", "しずか"),
        VocabRequest("元気", "げんき"),
        VocabRequest("きれい"),
        VocabRequest("便利", "べんり"),
        VocabRequest("有名", "ゆうめい"),
    ],
    "n5_vocab_numbers_basic": [
        VocabRequest("一", "いち", "ichi"),
        VocabRequest("二", "に", "ni"),
        VocabRequest("三", "さん", "san"),
        VocabRequest("四", "よん", "yon"),
        VocabRequest("五", "ご", "go"),
    ],
    "n5_vocab_people_objects_counters": [
        VocabRequest("一つ", "ひとつ"),
        VocabRequest("二つ", "ふたつ"),
        VocabRequest("三つ", "みっつ"),
        VocabRequest("一人", "ひとり"),
        VocabRequest("二人", "ふたり"),
    ],
    "n5_vocab_days_and_clock_time": [
        VocabRequest("今日", "きょう"),
        VocabRequest("明日", "あした"),
        VocabRequest("昨日", "きのう"),
        VocabRequest("月曜日", "げつようび"),
        VocabRequest("火曜日", "かようび"),
        VocabRequest("時間", "じかん"),
    ],
    "n5_vocab_frequency_and_schedule": [
        VocabRequest("毎日", "まいにち"),
        VocabRequest("時々", "ときどき"),
        VocabRequest("いつも"),
        VocabRequest("今週", "こんしゅう"),
        VocabRequest("来週", "らいしゅう"),
    ],
    "n5_vocab_home_school_locations": [
        VocabRequest("家", "いえ"),
        VocabRequest("学校", "がっこう"),
        VocabRequest("教室", "きょうしつ"),
        VocabRequest("図書館", "としょかん"),
        VocabRequest("駅", "えき"),
    ],
    "n5_vocab_motion_verbs": [
        VocabRequest("行く", "いく"),
        VocabRequest("来る", "くる"),
        VocabRequest("帰る", "かえる"),
        VocabRequest("入る", "はいる"),
        VocabRequest("出る", "でる"),
    ],
    "n5_transport_and_method_bundle": [
        VocabRequest("電車", "でんしゃ"),
        VocabRequest("バス"),
        VocabRequest("車", "くるま"),
        VocabRequest("自転車", "じてんしゃ"),
        VocabRequest("徒歩", "とほ"),
    ],
    "n5_vocab_social_exchange_basic": [
        VocabRequest("あげる"),
        VocabRequest("くれる"),
        VocabRequest("もらう"),
        VocabRequest("手伝う", "てつだう"),
        VocabRequest("プレゼント"),
    ],
    "n5_vocab_instruction_verbs": [
        VocabRequest("待つ", "まつ"),
        VocabRequest("座る", "すわる"),
        VocabRequest("立つ", "たつ"),
        VocabRequest("書く", "かく"),
        VocabRequest("読む", "よむ"),
    ],
    "n4_capability_context_vocab": [
        VocabRequest("上手", "じょうず"),
        VocabRequest("苦手", "にがて"),
        VocabRequest("得意", "とくい"),
        VocabRequest("趣味", "しゅみ"),
    ],
    "n4_goal_setting_vocab": [
        VocabRequest("予定", "よてい"),
        VocabRequest("目標", "もくひょう"),
        VocabRequest("必要", "ひつよう"),
        VocabRequest("希望", "きぼう"),
    ],
    "n4_social_viewpoint_vocab": [
        VocabRequest("手伝う", "てつだう"),
        VocabRequest("紹介する", "しょうかいする"),
        VocabRequest("教える", "おしえる"),
        VocabRequest("貸す", "かす"),
        VocabRequest("借りる", "かりる"),
    ],
    "n4_request_softening_vocab": [
        VocabRequest("ちょっと"),
        VocabRequest("もし"),
        VocabRequest("お願い", "おねがい"),
        VocabRequest("すみません"),
    ],
    "n4_service_and_apology_bundle": [
        VocabRequest("申し訳ありません", "もうしわけありません"),
        VocabRequest("失礼します", "しつれいします"),
        VocabRequest("すみません"),
        VocabRequest("ありがとうございます"),
    ],
    "n4_ordering_vocab": [
        VocabRequest("まず"),
        VocabRequest("次に", "つぎに"),
        VocabRequest("後で", "あとで"),
        VocabRequest("最後", "さいご"),
    ],
    "n4_quantity_vocab_bundle": [
        VocabRequest("たくさん"),
        VocabRequest("少し", "すこし"),
        VocabRequest("ほとんど"),
        VocabRequest("全部", "ぜんぶ"),
        VocabRequest("半分", "はんぶん"),
    ],
    "n4_backgrounding_vocab": [
        VocabRequest("実は", "じつは"),
        VocabRequest("ところで"),
        VocabRequest("ちなみに"),
        VocabRequest("さて"),
    ],
    "n4_maybe_context_vocab": [
        VocabRequest("多分", "たぶん"),
        VocabRequest("もしかしたら"),
        VocabRequest("おそらく"),
        VocabRequest("きっと"),
    ],
    "n4_sorede": [
        VocabRequest("それで"),
    ],
    "n4_soreni": [
        VocabRequest("それに"),
    ],
    "n4_soredemo": [
        VocabRequest("それでも"),
    ],
    "n4_demo_demo": [
        VocabRequest("でも"),
    ],
    "n4_demo": [
        VocabRequest("しかし"),
    ],
    "n4_respectful_service_vocab": [
        VocabRequest("お客様", "おきゃくさま"),
        VocabRequest("店員", "てんいん"),
        VocabRequest("受付", "うけつけ"),
        VocabRequest("ご案内", "ごあんない"),
    ],
    "n4_formal_service_bundle": [
        VocabRequest("ございます"),
        VocabRequest("少々", "しょうしょう"),
        VocabRequest("畏まる", "かしこまる"),
        VocabRequest("致す", "いたす"),
    ],
}

KANJI_BUNDLES: dict[str, list[str]] = {
    "n5_vocab_calendar_kanji_bundle": ["日", "月", "火", "水", "木", "金", "土", "年", "時"],
    "n5_location_kanji_bundle": ["上", "下", "中", "外", "前", "後"],
    "n4_honorific_kanji_bundle": ["客", "様", "社", "員", "課"],
}


def slugify_code(code: str) -> str:
    return code.replace("_", "-")


def make_uuid(*parts: str) -> str:
    return str(uuid.uuid5(UUID_NAMESPACE, "/".join(parts)))


def title_from_slug(slug: str) -> str:
    words = slug.split("-")
    return " ".join(word.upper() if len(word) <= 2 else word.capitalize() for word in words)


def title_from_code(code: str) -> str:
    words = code.split("_")
    if words and re.fullmatch(r"n[2345]", words[0]):
        words = words[1:]
    return " ".join(word.upper() if len(word) <= 2 else word.capitalize() for word in words)


def infer_commonness_bucket(priority_tags: list[str]) -> str | None:
    if not priority_tags:
        return None
    if any(tag in {"news1", "ichi1", "spec1", "gai1"} for tag in priority_tags):
        return "VERY_COMMON"
    if any(tag.startswith("nf") for tag in priority_tags):
        return "COMMON"
    return "KNOWN"


def normalize_register(register: str | None) -> str:
    if not register:
        return "GENERAL"
    mapping = {
        "一般": "GENERAL",
        "丁寧": "POLITE",
        "硬い": "FORMAL",
        "くだけた": "CASUAL",
    }
    return mapping.get(register, register.upper())


ROMAJI_DIGRAPHS = {
    "きゃ": "kya",
    "きゅ": "kyu",
    "きょ": "kyo",
    "しゃ": "sha",
    "しゅ": "shu",
    "しょ": "sho",
    "ちゃ": "cha",
    "ちゅ": "chu",
    "ちょ": "cho",
    "にゃ": "nya",
    "にゅ": "nyu",
    "にょ": "nyo",
    "ひゃ": "hya",
    "ひゅ": "hyu",
    "ひょ": "hyo",
    "みゃ": "mya",
    "みゅ": "myu",
    "みょ": "myo",
    "りゃ": "rya",
    "りゅ": "ryu",
    "りょ": "ryo",
    "ぎゃ": "gya",
    "ぎゅ": "gyu",
    "ぎょ": "gyo",
    "じゃ": "ja",
    "じゅ": "ju",
    "じょ": "jo",
    "びゃ": "bya",
    "びゅ": "byu",
    "びょ": "byo",
    "ぴゃ": "pya",
    "ぴゅ": "pyu",
    "ぴょ": "pyo",
    "ゔぁ": "va",
    "ゔぃ": "vi",
    "ゔ": "vu",
    "ゔぇ": "ve",
    "ゔぉ": "vo",
}

ROMAJI_SINGLE = {
    "あ": "a",
    "い": "i",
    "う": "u",
    "え": "e",
    "お": "o",
    "か": "ka",
    "き": "ki",
    "く": "ku",
    "け": "ke",
    "こ": "ko",
    "さ": "sa",
    "し": "shi",
    "す": "su",
    "せ": "se",
    "そ": "so",
    "た": "ta",
    "ち": "chi",
    "つ": "tsu",
    "て": "te",
    "と": "to",
    "な": "na",
    "に": "ni",
    "ぬ": "nu",
    "ね": "ne",
    "の": "no",
    "は": "ha",
    "ひ": "hi",
    "ふ": "fu",
    "へ": "he",
    "ほ": "ho",
    "ま": "ma",
    "み": "mi",
    "む": "mu",
    "め": "me",
    "も": "mo",
    "や": "ya",
    "ゆ": "yu",
    "よ": "yo",
    "ら": "ra",
    "り": "ri",
    "る": "ru",
    "れ": "re",
    "ろ": "ro",
    "わ": "wa",
    "を": "o",
    "ん": "n",
    "が": "ga",
    "ぎ": "gi",
    "ぐ": "gu",
    "げ": "ge",
    "ご": "go",
    "ざ": "za",
    "じ": "ji",
    "ず": "zu",
    "ぜ": "ze",
    "ぞ": "zo",
    "だ": "da",
    "ぢ": "ji",
    "づ": "zu",
    "で": "de",
    "ど": "do",
    "ば": "ba",
    "び": "bi",
    "ぶ": "bu",
    "べ": "be",
    "ぼ": "bo",
    "ぱ": "pa",
    "ぴ": "pi",
    "ぷ": "pu",
    "ぺ": "pe",
    "ぽ": "po",
    "ぁ": "a",
    "ぃ": "i",
    "ぅ": "u",
    "ぇ": "e",
    "ぉ": "o",
    "ー": "-",
}


def katakana_to_hiragana(text: str) -> str:
    chars: list[str] = []
    for char in text:
        code = ord(char)
        if 0x30A1 <= code <= 0x30F6:
            chars.append(chr(code - 0x60))
        else:
            chars.append(char)
    return "".join(chars)


def romanize_kana(text: str) -> str:
    text = katakana_to_hiragana(text)
    text = text.replace("・", "").replace("〜", "").replace("～", "")
    result: list[str] = []
    i = 0
    while i < len(text):
        if text[i] == "っ":
            if i + 1 < len(text):
                next_chunk = text[i + 1 : i + 3]
                next_romaji = ROMAJI_DIGRAPHS.get(next_chunk) or ROMAJI_SINGLE.get(text[i + 1], "")
                if next_romaji:
                    result.append(next_romaji[0])
            i += 1
            continue
        pair = text[i : i + 2]
        if pair in ROMAJI_DIGRAPHS:
            result.append(ROMAJI_DIGRAPHS[pair])
            i += 2
            continue
        char = text[i]
        romaji = ROMAJI_SINGLE.get(char)
        if romaji == "-":
            if result:
                last = result[-1][-1]
                if last in "aeiou":
                    result.append(last)
            i += 1
            continue
        if romaji:
            result.append(romaji)
        i += 1
    token = "".join(result)
    token = re.sub(r"[^a-z0-9]+", "_", token)
    token = re.sub(r"_+", "_", token).strip("_")
    return token or "item"


def parse_unit_metadata() -> dict[str, dict[str, Any]]:
    text = (DOCS_DIR / "jlpt-unit-sequencing.md").read_text(encoding="utf-8")
    units: dict[str, dict[str, Any]] = {}
    current_track_slug: str | None = None
    for line in text.splitlines():
        if line.startswith("## N5 Unit Order"):
            current_track_slug = "jlpt-n5-foundation"
            continue
        if line.startswith("## N4 Unit Order"):
            current_track_slug = "jlpt-n4-expansion"
            continue
        if not current_track_slug or not line.startswith("|"):
            continue
        columns = [col.strip() for col in line.strip().split("|")[1:-1]]
        if len(columns) != 5 or columns[0] == "Order" or columns[0].startswith("---"):
            continue
        slug = columns[1].strip("`")
        units[slug] = {
            "trackSlug": current_track_slug,
            "sortOrder": int(columns[0]),
            "title": columns[2],
            "description": f"{columns[3]} {columns[4]}".strip(),
            "isFoundationUnit": slug in {"n5-kana-basics", "n4-plain-form-bridge"},
        }
    return units


def parse_lesson_breakdown() -> dict[str, dict[str, Any]]:
    text = (DOCS_DIR / "jlpt-lesson-and-skill-breakdown.md").read_text(encoding="utf-8")
    current_level: str | None = None
    current_unit: str | None = None
    lessons_by_unit: dict[str, dict[str, Any]] = defaultdict(lambda: {"level": None, "lessons": []})
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i].rstrip()
        if line.startswith("## N5 Breakdown"):
            current_level = "N5"
            current_unit = None
        elif line.startswith("## N4 Breakdown"):
            current_level = "N4"
            current_unit = None
        elif line.startswith("## Cross-Track Notes"):
            current_unit = None
            current_level = None
        elif line.startswith("### `") and current_level:
            unit_slug = re.search(r"`([^`]+)`", line).group(1)  # type: ignore[union-attr]
            if re.fullmatch(r"n[45]-[a-z0-9-]+", unit_slug):
                current_unit = unit_slug
                lessons_by_unit[current_unit]["level"] = current_level
            else:
                current_unit = None
        elif line.startswith("- `") and current_unit:
            lesson_slug = re.search(r"`([^`]+)`", line).group(1)  # type: ignore[union-attr]
            objective = ""
            skills: list[str] = []
            for probe in lines[i + 1 : i + 6]:
                probe = probe.strip()
                if probe.startswith("Objective:"):
                    objective = probe.split("Objective:", 1)[1].strip()
                elif probe.startswith("Trackable skills:"):
                    skills = re.findall(r"`([^`]+)`", probe)
                    break
            if not objective or not skills:
                raise RuntimeError(f"Unable to parse lesson block for {lesson_slug!r} in unit {current_unit!r}")
            lessons_by_unit[current_unit]["lessons"].append(
                {
                    "slug": lesson_slug,
                    "title": title_from_slug(lesson_slug),
                    "learningObjective": objective,
                    "authoringSkills": skills,
                }
            )
            i += 2
        i += 1
    return lessons_by_unit


def parse_support_matrix() -> dict[str, str]:
    text = (DOCS_DIR / "skill-activity-support-matrix.md").read_text(encoding="utf-8")
    support: dict[str, str] = {}
    for line in text.splitlines():
        if not line.startswith("- `") or "->" not in line:
            continue
        _, remainder = line.split(":", 1)
        for chunk in remainder.split(";"):
            chunk = chunk.strip()
            profile_match = re.match(r"`([^`]+)` -> (.+)$", chunk)
            if not profile_match:
                continue
            profile = profile_match.group(1)
            for skill_code in re.findall(r"`([^`]+)`", profile_match.group(2)):
                support[skill_code] = profile
    return support


def all_vocab_requests() -> list[VocabRequest]:
    requests: list[VocabRequest] = []
    for bundle_items in VOCAB_BUNDLES.values():
        requests.extend(bundle_items)
    return requests


def unique_strings(values: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result


class JMDictResolver:
    def __init__(self, requests: list[VocabRequest]) -> None:
        self._by_spelling: dict[str, list[dict[str, Any]]] = defaultdict(list)
        self._needed_spellings: set[str] = set()
        self._needed_readings: set[str] = set()
        for item in requests:
            self._needed_spellings.add(item.spelling)
            if item.reading:
                self._needed_readings.add(item.reading)
            if item.spelling.endswith("する"):
                self._needed_spellings.add(item.spelling[:-2])
                if item.reading and item.reading.endswith("する"):
                    self._needed_readings.add(item.reading[:-2])

    def load(self) -> None:
        source_path = ROOT / "content" / "syllabus" / "sources" / "jmdict" / "raw" / "2026-05-16" / "JMdict_e.gz"
        with gzip.open(source_path, "rb") as handle:
            for _, elem in ET.iterparse(handle, events=("end",)):
                if elem.tag != "entry":
                    continue
                kebs = [node.text for node in elem.findall("k_ele/keb") if node.text]
                rebs = [node.text for node in elem.findall("r_ele/reb") if node.text]
                spellings = set(kebs) | set(rebs)
                if not (spellings & self._needed_spellings or set(rebs) & self._needed_readings):
                    elem.clear()
                    continue
                entry = {
                    "ent_seq": elem.findtext("ent_seq"),
                    "kebs": kebs,
                    "rebs": rebs,
                    "glosses": unique_strings(
                        [
                            gloss.text
                            for gloss in elem.findall("sense/gloss")
                            if gloss.text
                        ]
                    ),
                    "parts_of_speech": unique_strings(
                        [
                            pos.text
                            for pos in elem.findall("sense/pos")
                            if pos.text
                        ]
                    ),
                    "fields": unique_strings(
                        [
                            field.text
                            for field in elem.findall("sense/field")
                            if field.text
                        ]
                    ),
                    "priority_tags": unique_strings(
                        [
                            pri.text
                            for pri in elem.findall("k_ele/ke_pri") + elem.findall("r_ele/re_pri")
                            if pri.text
                        ]
                    ),
                }
                for spelling in spellings:
                    self._by_spelling[spelling].append(entry)
                elem.clear()

    def resolve(self, request: VocabRequest) -> dict[str, Any]:
        def lookup(spelling: str, reading: str | None) -> list[dict[str, Any]]:
            result = self._by_spelling.get(spelling, [])
            if reading:
                result = [candidate for candidate in result if reading in candidate["rebs"]]
            return result

        candidates = lookup(request.spelling, request.reading)
        if not candidates and request.spelling.endswith("する"):
            alt_spelling = request.spelling[:-2]
            alt_reading = request.reading[:-2] if request.reading and request.reading.endswith("する") else request.reading
            candidates = lookup(alt_spelling, alt_reading)
        if not candidates:
            raise KeyError(f"Unable to resolve JMdict entry for {request.spelling!r} / {request.reading!r}")

        def score(candidate: dict[str, Any]) -> tuple[int, int]:
            score_value = 0
            if request.spelling in candidate["kebs"]:
                score_value += 50
                if candidate["kebs"] and candidate["kebs"][0] == request.spelling:
                    score_value += 25
            if request.spelling in candidate["rebs"]:
                score_value += 20
            if request.reading and candidate["rebs"] and candidate["rebs"][0] == request.reading:
                score_value += 30
            if candidate["priority_tags"]:
                score_value += 10
            return score_value, -int(candidate["ent_seq"])

        return max(candidates, key=score)


class YomitanJlptResolver:
    def __init__(self) -> None:
        self._entries_by_spelling: dict[str, list[dict[str, str]]] = defaultdict(list)

    def load(self) -> None:
        source_path = ROOT / "content" / "syllabus" / "sources" / "yomitan-jlpt-vocab" / "raw" / "2026-05-16" / "source-main.zip"
        with zipfile.ZipFile(source_path) as archive:
            for index in range(1, 6):
                name = f"yomitan-jlpt-vocab-main/yomitan-jlpt-vocab/term_meta_bank_{index}.json"
                records = json.loads(archive.read(name))
                for term, tag, payload in records:
                    if tag != "freq":
                        continue
                    display = payload.get("frequency", {}).get("displayValue")
                    if not isinstance(display, str) or not display.startswith("N"):
                        continue
                    self._entries_by_spelling[term].append(
                        {
                            "reading": payload.get("reading") or "",
                            "level": display,
                        }
                    )

    def candidates_for(self, spelling: str, reading: str | None) -> list[dict[str, str]]:
        matches = self._entries_by_spelling.get(spelling, [])
        if reading:
            exact = [item for item in matches if item["reading"] == reading]
            if exact:
                return exact
        return matches


class KanjidicResolver:
    def __init__(self, literals: set[str]) -> None:
        self._needed_literals = literals
        self._characters: dict[str, dict[str, Any]] = {}

    def load(self) -> None:
        source_path = ROOT / "content" / "syllabus" / "sources" / "kanjidic2" / "raw" / "2026-05-16" / "kanjidic2.xml.gz"
        with gzip.open(source_path, "rb") as handle:
            for _, elem in ET.iterparse(handle, events=("end",)):
                if elem.tag != "character":
                    continue
                literal = elem.findtext("literal")
                if literal not in self._needed_literals:
                    elem.clear()
                    continue
                meanings = [
                    node.text
                    for node in elem.findall("reading_meaning/rmgroup/meaning")
                    if node.text and not node.attrib.get("{http://www.w3.org/XML/1998/namespace}lang")
                ]
                onyomi = [
                    node.text
                    for node in elem.findall("reading_meaning/rmgroup/reading[@r_type='ja_on']")
                    if node.text
                ]
                kunyomi = [
                    node.text
                    for node in elem.findall("reading_meaning/rmgroup/reading[@r_type='ja_kun']")
                    if node.text
                ]
                stroke_counts = [int(node.text) for node in elem.findall("misc/stroke_count") if node.text]
                freq = elem.findtext("misc/freq")
                legacy_jlpt = elem.findtext("misc/jlpt")
                self._characters[literal] = {
                    "literal": literal,
                    "meaningsEn": meanings,
                    "onyomi": onyomi,
                    "kunyomi": kunyomi,
                    "strokeCount": stroke_counts[0],
                    "frequencyRank": int(freq) if freq else None,
                    "legacyJlptLevel": int(legacy_jlpt) if legacy_jlpt else None,
                }
                elem.clear()

    def resolve(self, literal: str) -> dict[str, Any]:
        if literal not in self._characters:
            raise KeyError(f"Unable to resolve KANJIDIC2 entry for {literal!r}")
        return self._characters[literal]


def internal_curriculum_signal(level: str, scope: str) -> dict[str, Any]:
    return {
        "provider": "KOTOBAHUB_INTERNAL",
        "level": level,
        "scope": scope,
        "confidence": "CURATED",
    }


def grammar_source_ref(level: str, code: str) -> list[dict[str, Any]]:
    return [
        {
            "provider": "BUNPRO",
            "category": "GRAMMAR_DECK",
            "externalId": code,
            "sourceUrl": BUNPRO_DECK_URLS[level],
            "retrievedFrom": f"content/syllabus/sources/bunpro/raw/2026-05-16/decks/{level.lower()}.html",
            "notes": "Canonical grammar inventory is curated from the official Bunpro JLPT deck snapshot.",
        }
    ]


def kana_source_ref(code: str) -> list[dict[str, Any]]:
    return [
        {
            "provider": "KOTOBAHUB_INTERNAL",
            "category": "KANA_CURATION",
            "externalId": code,
            "sourceUrl": "https://kotobahub.local/docs/syllabus/source-of-truth-and-ingestion-plan.md#1-kana",
            "notes": "Kana sequencing is fully curated internally.",
        }
    ]


def reading_source_ref(code: str) -> list[dict[str, Any]]:
    return [
        {
            "provider": "KOTOBAHUB_INTERNAL",
            "category": "CURRICULUM_READING",
            "externalId": code,
            "sourceUrl": "https://kotobahub.local/docs/syllabus/jlpt-lesson-and-skill-breakdown.md",
            "notes": "Reading passage is curated internally to integrate surrounding lesson skills.",
        }
    ]


def vocab_source_refs(entry: dict[str, Any], overlay_candidates: list[dict[str, str]]) -> list[dict[str, Any]]:
    refs = [
        {
            "provider": "JMDICT",
            "category": "LEXICAL_ENTRY",
            "externalId": str(entry["ent_seq"]),
            "sourceUrl": "https://www.edrdg.org/jmdict/j_jmdict.html",
            "retrievedFrom": "content/syllabus/sources/jmdict/raw/2026-05-16/JMdict_e.gz",
            "licenseNote": "See the EDRDG licence snapshot stored with the raw JMdict acquisition.",
        }
    ]
    if overlay_candidates:
        refs.append(
            {
                "provider": "YOMITAN_JLPT_VOCAB",
                "category": "JLPT_SIGNAL",
                "externalId": entry["kebs"][0] if entry["kebs"] else entry["rebs"][0],
                "sourceUrl": "https://github.com/stephenmk/yomitan-jlpt-vocab",
                "retrievedFrom": "content/syllabus/sources/yomitan-jlpt-vocab/raw/2026-05-16/source-main.zip",
                "notes": "Used as a JLPT signal overlay, not as final curriculum truth.",
            }
        )
    return refs


def kanji_source_refs(literal: str) -> list[dict[str, Any]]:
    return [
        {
            "provider": "KANJIDIC2",
            "category": "KANJI_ENTRY",
            "externalId": literal,
            "sourceUrl": "https://www.edrdg.org/kanjidic/kanjd2index_legacy.html",
            "retrievedFrom": "content/syllabus/sources/kanjidic2/raw/2026-05-16/kanjidic2.xml.gz",
            "licenseNote": "See the EDRDG licence snapshot stored with the raw KANJIDIC2 acquisition.",
        }
    ]


def ensure_vocab_and_kanji_bundles() -> None:
    if not VOCAB_BUNDLES or not KANJI_BUNDLES:
        raise RuntimeError("Vocabulary and kanji bundle mappings must be filled before generation.")


def lesson_minutes(skill_count: int, has_reading: bool) -> int:
    minutes = 8 + (skill_count * 2)
    if has_reading:
        minutes += 2
    return max(10, min(20, minutes))


def build_content_block(level: str, unit_title: str, objective: str, lesson_slug: str) -> dict[str, Any]:
    return {
        "id": make_uuid(level, lesson_slug, "content-block", "1"),
        "blockType": "PARAGRAPH",
        "title": "Lesson Focus",
        "body": f"{objective} Lesson ini berada di jalur {unit_title} dan disusun sebagai sesi singkat yang langsung menyiapkan learner untuk skill inti di materi sekitar.",
        "sortOrder": 1,
        "isPublished": True,
    }


def build_kana_skill(level: str, lesson_slug: str, code: str, sort_order: int, flags: tuple[bool, bool, bool]) -> dict[str, Any]:
    script_family, characters = KANA_CONTENT[code]
    title = title_from_code(code)
    return {
        "id": make_uuid(level, lesson_slug, code),
        "code": code,
        "slug": slugify_code(code),
        "curriculumLevel": level,
        "title": title,
        "description": f"Recognize and recall the core symbols covered by {title.lower()}.",
        "skillType": "KANA",
        "supportsFlashcards": flags[0],
        "supportsPracticeObjective": flags[1],
        "supportsPracticeFreeResponse": flags[2],
        "prerequisiteSkillCodes": [],
        "sortOrder": sort_order,
        "isPublished": True,
        "curriculumSignals": {
            "jlpt": {
                "resolvedLevel": level,
                "candidates": [internal_curriculum_signal(level, "KANA")],
                "resolutionNotes": "Kana placement is fully curated internally by KotobaHub.",
            }
        },
        "sourceRefs": kana_source_ref(code),
        "content": {
            "kana": {
                "scriptFamily": script_family,
                "characters": [{"char": char, "romanization": romanization} for char, romanization in characters],
            }
        },
    }


def build_grammar_skill(level: str, lesson_slug: str, lesson_objective: str, code: str, sort_order: int, flags: tuple[bool, bool, bool]) -> dict[str, Any]:
    title = title_from_code(code)
    return {
        "id": make_uuid(level, lesson_slug, code),
        "code": code,
        "slug": slugify_code(code),
        "curriculumLevel": level,
        "title": title,
        "description": f"Practice the {title.lower()} pattern in the context of the lesson objective.",
        "skillType": "GRAMMAR",
        "supportsFlashcards": flags[0],
        "supportsPracticeObjective": flags[1],
        "supportsPracticeFreeResponse": flags[2],
        "prerequisiteSkillCodes": [],
        "sortOrder": sort_order,
        "isPublished": True,
        "curriculumSignals": {
            "jlpt": {
                "resolvedLevel": level,
                "candidates": [internal_curriculum_signal(level, "GRAMMAR")],
                "resolutionNotes": "Grammar placement is curated internally while Bunpro remains the canonical external inventory baseline.",
            }
        },
        "sourceRefs": grammar_source_ref(level, code),
        "content": {
            "grammar": {
                "pattern": title,
                "meaning": lesson_objective,
                "register": "GENERAL",
                "structureLines": [title],
                "bunproLevel": level,
            }
        },
    }


def build_reading_skill(level: str, lesson_slug: str, code: str, sort_order: int, flags: tuple[bool, bool, bool]) -> dict[str, Any]:
    content = READING_SKILL_CONTENT[code]
    return {
        "id": make_uuid(level, lesson_slug, code),
        "code": code,
        "slug": slugify_code(code),
        "curriculumLevel": level,
        "title": content["title"],
        "description": content["focus"],
        "skillType": "READING",
        "supportsFlashcards": flags[0],
        "supportsPracticeObjective": flags[1],
        "supportsPracticeFreeResponse": flags[2],
        "prerequisiteSkillCodes": [],
        "sortOrder": sort_order,
        "isPublished": True,
        "curriculumSignals": {
            "jlpt": {
                "resolvedLevel": level,
                "candidates": [internal_curriculum_signal(level, "READING")],
                "resolutionNotes": "Reading objectives are curated internally from the surrounding unit and lesson goals.",
            }
        },
        "sourceRefs": reading_source_ref(code),
        "content": {
            "reading": {
                "title": content["title"],
                "passageText": content["passageText"],
                "translationEn": content["translationEn"],
                "focus": content["focus"],
                "targetSkillCodes": [],
                "comprehensionChecks": content.get("comprehensionChecks", []),
            }
        },
    }


def build_vocab_skill(level: str, lesson_slug: str, bundle_code: str, request: VocabRequest, entry: dict[str, Any], overlay_candidates: list[dict[str, str]], sort_order: int, flags: tuple[bool, bool, bool]) -> dict[str, Any]:
    primary_spelling = entry["kebs"][0] if entry["kebs"] else entry["rebs"][0]
    reading = request.reading or entry["rebs"][0]
    suffix = request.code_suffix or romanize_kana(reading)
    code = f"{bundle_code}_{suffix}"
    glossary = entry["glosses"][:3]
    commonness_bucket = infer_commonness_bucket(entry["priority_tags"])
    candidates = [internal_curriculum_signal(level, "VOCABULARY")]
    for overlay in overlay_candidates:
        candidates.append(
            {
                "provider": "YOMITAN_JLPT_VOCAB",
                "level": overlay["level"],
                "scope": "VOCABULARY",
                "confidence": "HEURISTIC",
            }
        )
    vocabulary_content: dict[str, Any] = {
        "primarySpelling": primary_spelling,
        "alternateSpellings": [spelling for spelling in entry["kebs"][1:] if spelling != primary_spelling],
        "readings": entry["rebs"],
        "glossesEn": glossary,
        "partsOfSpeech": entry["parts_of_speech"] or ["unclassified"],
        "fields": entry["fields"],
        "priorityTags": entry["priority_tags"],
        "jlptSignalCandidates": [
            {
                "provider": "YOMITAN_JLPT_VOCAB",
                "level": overlay["level"],
                "scope": "VOCABULARY",
                "confidence": "HEURISTIC",
            }
            for overlay in overlay_candidates
        ],
    }
    if commonness_bucket:
        vocabulary_content["commonnessRankBucket"] = commonness_bucket
    return {
        "id": make_uuid(level, lesson_slug, code),
        "code": code,
        "slug": slugify_code(code),
        "curriculumLevel": level,
        "title": primary_spelling,
        "description": f"Recognize and recall the vocabulary item 「{primary_spelling}」 with its core meaning and reading.",
        "skillType": "VOCABULARY",
        "supportsFlashcards": flags[0],
        "supportsPracticeObjective": flags[1],
        "supportsPracticeFreeResponse": flags[2],
        "prerequisiteSkillCodes": [],
        "sortOrder": sort_order,
        "isPublished": True,
        "curriculumSignals": {
            "jlpt": {
                "resolvedLevel": level,
                "candidates": candidates,
                "resolutionNotes": "Lexical form comes from JMdict while JLPT signals remain supporting input only.",
            }
        },
        "sourceRefs": vocab_source_refs(entry, overlay_candidates),
        "content": {"vocabulary": vocabulary_content},
    }


def build_kanji_skill(level: str, lesson_slug: str, bundle_code: str, literal: str, entry: dict[str, Any], sort_order: int, flags: tuple[bool, bool, bool]) -> dict[str, Any]:
    reading_seed = entry["onyomi"][0] if entry["onyomi"] else (entry["kunyomi"][0] if entry["kunyomi"] else literal)
    reading_seed = reading_seed.replace(".", "")
    suffix = romanize_kana(reading_seed)
    code = f"{bundle_code}_{suffix}"
    kanji_content = {
        "literal": entry["literal"],
        "meaningsEn": entry["meaningsEn"][:3],
        "onyomi": entry["onyomi"],
        "kunyomi": entry["kunyomi"],
        "strokeCount": entry["strokeCount"],
        "jlptSignalCandidates": [],
    }
    if entry["frequencyRank"] is not None:
        kanji_content["frequencyRank"] = entry["frequencyRank"]
    if entry["legacyJlptLevel"] is not None:
        kanji_content["legacyJlptLevel"] = entry["legacyJlptLevel"]
    return {
        "id": make_uuid(level, lesson_slug, code),
        "code": code,
        "slug": slugify_code(code),
        "curriculumLevel": level,
        "title": literal,
        "description": f"Recognize the kanji 「{literal}」 together with its core readings and meanings for the lesson theme.",
        "skillType": "KANJI",
        "supportsFlashcards": flags[0],
        "supportsPracticeObjective": flags[1],
        "supportsPracticeFreeResponse": flags[2],
        "prerequisiteSkillCodes": [],
        "sortOrder": sort_order,
        "isPublished": True,
        "curriculumSignals": {
            "jlpt": {
                "resolvedLevel": level,
                "candidates": [internal_curriculum_signal(level, "KANJI")],
                "resolutionNotes": "Modern curriculum placement is curated internally; KANJIDIC2 metadata remains the lexical base layer.",
            }
        },
        "sourceRefs": kanji_source_refs(literal),
        "content": {"kanji": kanji_content},
    }


def skill_kind(code: str) -> str:
    if code in KANA_CONTENT:
        return "KANA"
    if code in VOCAB_BUNDLES:
        return "VOCABULARY_BUNDLE"
    if code in KANJI_BUNDLES:
        return "KANJI_BUNDLE"
    if code in READING_SKILL_CONTENT:
        return "READING"
    return "GRAMMAR"


def apply_prerequisites(skills: list[dict[str, Any]], previous_skill_codes: list[str]) -> None:
    for index, skill in enumerate(skills):
        prereqs: list[str] = []
        if index == 0:
            if previous_skill_codes:
                prereqs.append(previous_skill_codes[-1])
        else:
            prereqs.append(skills[index - 1]["code"])
        skill["prerequisiteSkillCodes"] = prereqs
    non_reading_codes = [skill["code"] for skill in skills if skill["skillType"] != "READING"]
    fallback_codes = previous_skill_codes[-3:]
    for skill in skills:
        if skill["skillType"] == "READING":
            targets = non_reading_codes or fallback_codes
            skill["content"]["reading"]["targetSkillCodes"] = targets[:6]


def build_track_payloads() -> tuple[dict[str, Any], dict[str, dict[str, Any]]]:
    ensure_vocab_and_kanji_bundles()
    unit_metadata = parse_unit_metadata()
    lessons_by_unit = parse_lesson_breakdown()
    support_matrix = parse_support_matrix()

    all_authoring_skills = {
        skill_code
        for unit in lessons_by_unit.values()
        for lesson in unit["lessons"]
        for skill_code in lesson["authoringSkills"]
    }
    missing_support = sorted(all_authoring_skills - set(support_matrix))
    if missing_support:
        raise RuntimeError(f"Missing support profile for skills: {missing_support}")

    jm_resolver = JMDictResolver(all_vocab_requests())
    jm_resolver.load()
    yomitan_resolver = YomitanJlptResolver()
    yomitan_resolver.load()
    kanji_resolver = KanjidicResolver({literal for literals in KANJI_BUNDLES.values() for literal in literals})
    kanji_resolver.load()

    manifest = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": GENERATED_AT,
        "tracks": [],
    }
    payloads: dict[str, dict[str, Any]] = {}

    for track_meta in TRACKS:
        track_slug = track_meta["slug"]
        manifest["tracks"].append(
            {
                "slug": track_slug,
                "curriculumLevel": track_meta["curriculumLevel"],
                "file": f"tracks/{track_slug}.json",
                "sortOrder": track_meta["sortOrder"],
                "isPublished": track_meta["isPublished"],
            }
        )
        payload = {
            "schemaVersion": SCHEMA_VERSION,
            "generatedAt": GENERATED_AT,
            "track": {
                "id": make_uuid(track_slug),
                "slug": track_slug,
                "curriculumLevel": track_meta["curriculumLevel"],
                "title": track_meta["title"],
                "description": track_meta["description"],
                "sortOrder": track_meta["sortOrder"],
                "isPublished": track_meta["isPublished"],
                "units": [],
            },
        }
        if not track_meta["isPublished"]:
            payloads[track_slug] = payload
            continue

        units_for_track = [
            (unit_slug, data)
            for unit_slug, data in unit_metadata.items()
            if data["trackSlug"] == track_slug
        ]
        units_for_track.sort(key=lambda item: item[1]["sortOrder"])

        previous_skill_codes: list[str] = []
        for unit_slug, unit_data in units_for_track:
            unit_payload = {
                "id": make_uuid(track_slug, unit_slug),
                "slug": unit_slug,
                "title": unit_data["title"],
                "description": unit_data["description"],
                "sortOrder": unit_data["sortOrder"],
                "isFoundationUnit": unit_data["isFoundationUnit"],
                "isPublished": True,
                "lessons": [],
            }
            unit_lessons = lessons_by_unit[unit_slug]["lessons"]
            for lesson_index, lesson in enumerate(unit_lessons, start=1):
                lesson_skill_payloads: list[dict[str, Any]] = []
                sort_order = 1
                for authoring_skill_code in lesson["authoringSkills"]:
                    flags = PROFILE_TO_FLAGS[support_matrix[authoring_skill_code]]
                    kind = skill_kind(authoring_skill_code)
                    if kind == "KANA":
                        lesson_skill_payloads.append(
                            build_kana_skill(
                                track_meta["curriculumLevel"],
                                lesson["slug"],
                                authoring_skill_code,
                                sort_order,
                                flags,
                            )
                        )
                        sort_order += 1
                    elif kind == "READING":
                        lesson_skill_payloads.append(
                            build_reading_skill(
                                track_meta["curriculumLevel"],
                                lesson["slug"],
                                authoring_skill_code,
                                sort_order,
                                flags,
                            )
                        )
                        sort_order += 1
                    elif kind == "VOCABULARY_BUNDLE":
                        for request in VOCAB_BUNDLES[authoring_skill_code]:
                            entry = jm_resolver.resolve(request)
                            primary_spelling = entry["kebs"][0] if entry["kebs"] else entry["rebs"][0]
                            overlay_candidates = yomitan_resolver.candidates_for(primary_spelling, request.reading or (entry["rebs"][0] if entry["rebs"] else None))
                            lesson_skill_payloads.append(
                                build_vocab_skill(
                                    track_meta["curriculumLevel"],
                                    lesson["slug"],
                                    authoring_skill_code,
                                    request,
                                    entry,
                                    overlay_candidates,
                                    sort_order,
                                    flags,
                                )
                            )
                            sort_order += 1
                    elif kind == "KANJI_BUNDLE":
                        for literal in KANJI_BUNDLES[authoring_skill_code]:
                            lesson_skill_payloads.append(
                                build_kanji_skill(
                                    track_meta["curriculumLevel"],
                                    lesson["slug"],
                                    authoring_skill_code,
                                    literal,
                                    kanji_resolver.resolve(literal),
                                    sort_order,
                                    flags,
                                )
                            )
                            sort_order += 1
                    else:
                        lesson_skill_payloads.append(
                            build_grammar_skill(
                                track_meta["curriculumLevel"],
                                lesson["slug"],
                                lesson["learningObjective"],
                                authoring_skill_code,
                                sort_order,
                                flags,
                            )
                        )
                        sort_order += 1

                apply_prerequisites(lesson_skill_payloads, previous_skill_codes)
                previous_skill_codes.extend(skill["code"] for skill in lesson_skill_payloads)
                unit_payload["lessons"].append(
                    {
                        "id": make_uuid(track_slug, unit_slug, lesson["slug"]),
                        "slug": lesson["slug"],
                        "title": lesson["title"],
                        "learningObjective": lesson["learningObjective"],
                        "sortOrder": lesson_index,
                        "estimatedMinutes": lesson_minutes(
                            len(lesson_skill_payloads),
                            any(skill["skillType"] == "READING" for skill in lesson_skill_payloads),
                        ),
                        "isPublished": True,
                        "contentBlocks": [
                            build_content_block(
                                track_meta["curriculumLevel"],
                                unit_data["title"],
                                lesson["learningObjective"],
                                lesson["slug"],
                            )
                        ],
                        "skills": lesson_skill_payloads,
                    }
                )
            payload["track"]["units"].append(unit_payload)

        payloads[track_slug] = payload

    return manifest, payloads


def validate_payload(manifest: dict[str, Any], track_payloads: dict[str, dict[str, Any]]) -> None:
    manifest_schema = json.loads((DOCS_DIR / "schema" / "seed-manifest.schema.json").read_text(encoding="utf-8"))
    track_schema = json.loads((DOCS_DIR / "schema" / "track-seed.schema.json").read_text(encoding="utf-8"))
    jsonschema.validate(manifest, manifest_schema)
    for payload in track_payloads.values():
        jsonschema.validate(payload, track_schema)


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    manifest, payloads = build_track_payloads()
    validate_payload(manifest, payloads)
    write_json(CONTENT_DIR / "manifest.json", manifest)
    for slug, payload in payloads.items():
        write_json(TRACKS_DIR / f"{slug}.json", payload)
    print(f"Generated {CONTENT_DIR / 'manifest.json'} and {len(payloads)} track files.")


if __name__ == "__main__":
    main()
