"""Check unpublished lesson-content fragments; never compile or import a seed."""

import argparse
import json
from html.parser import HTMLParser
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker


ROOT = Path(__file__).resolve().parents[1]
CLASSES = {'text-emphasis', 'text-warning', 'question-blank',
           'question-dialogue', 'question-scenario', 'question-continuation'}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def distinct_object(pairs):
    result = {}

    for key, value in pairs:
        require(key not in result, f'Duplicate JSON key: {key}')
        result[key] = value

    return result


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=distinct_object)


class DraftHtml(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.text = []

    def handle_starttag(self, tag, attrs):
        require(tag in {'p', 'div', 'span', 'strong', 'br'}, f'Unsupported HTML tag: {tag}')

        require(all(key == 'class' and value in CLASSES for key, value in attrs),
                f'Unsupported HTML attributes: {attrs}')

        if tag != 'br':
            self.stack.append(tag)

    def handle_endtag(self, tag):
        require(bool(self.stack) and self.stack.pop() == tag, f'Unbalanced HTML: {tag}')

    def handle_data(self, data):
        self.text.append(data)

    def handle_comment(self, data):
        raise ValueError('HTML comments are not supported.')

    def handle_decl(self, decl):
        raise ValueError('HTML declarations are not supported.')

    def unknown_decl(self, data):
        raise ValueError('HTML declarations are not supported.')

    def handle_pi(self, data):
        raise ValueError('HTML processing instructions are not supported.')


def plain_html(value):
    parser = DraftHtml()
    parser.feed(value)
    parser.close()

    require(not parser.stack, 'Unclosed HTML tag.')

    return ''.join(parser.text)


def check_html(value):
    if isinstance(value, dict):
        for item in value.values():
            check_html(item)
    elif isinstance(value, list):
        for item in value:
            check_html(item)
    elif isinstance(value, str) and '<' in value:
        plain_html(value)


def validate_fragment(fragment, lesson, require_complete_bank=False):
    schema = read_json(ROOT / 'docs/syllabus/schema/track-seed.v2.schema.json')

    fragment_schema = {
        '$schema': schema['$schema'], '$defs': schema['$defs'],
        'type': 'object', 'additionalProperties': False,
        'required': ['contentBlocks', 'postStudyQuestions'],
        'properties': {key: schema['$defs']['lesson']['properties'][key]
                       for key in ['contentBlocks', 'postStudyQuestions']},
    }

    Draft202012Validator(fragment_schema, format_checker=FormatChecker()).validate(fragment)

    skills = {skill['code']: skill for skill in lesson['skills']}
    identifiers = set()

    for collection in ['contentBlocks', 'postStudyQuestions']:
        orders = set()

        for owner in fragment[collection]:
            require(owner['id'] not in identifiers, f'Duplicate owner ID: {owner["id"]}')
            identifiers.add(owner['id'])

            require(owner['sortOrder'] not in orders, f'Duplicate sortOrder in {collection}.')
            orders.add(owner['sortOrder'])

            require(not owner['isPublished'], 'New draft owners must remain unpublished.')
            require(set(owner['localizations']) == {'en', 'id'}, 'Both en/id packages are required.')

            for locale, text in owner['localizations'].items():
                require(not text['isPublished'], f'Draft {locale} must remain unpublished.')
                require(text['sourceRevision'] == owner['contentRevision'],
                        f'Stale or future sourceRevision: {owner["id"]}/{locale}')

            if collection == 'postStudyQuestions' or owner['blockType'] == 'GRAMMAR_STRUCTURE':
                code = owner.get('skillCode', owner.get('content', {}).get('skillCode'))
                require(code in skills, f'Skill is not owned by this lesson: {code}')

                if collection == 'contentBlocks':
                    require(skills[code]['skillType'] == 'GRAMMAR', f'Not a grammar skill: {code}')

            if collection == 'postStudyQuestions':
                payload = owner['promptPayload']
                require('<' not in payload['sentenceTemplate'], 'Plain prompt contains HTML.')
                require(plain_html(payload['sentenceTemplateHtml']) == payload['sentenceTemplate'],
                        f'Plain/HTML prompt mismatch: {owner["id"]}')

    check_html(fragment)

    questions = fragment['postStudyQuestions']
    levels = [question['difficultyLevel'] for question in questions]
    require(len(levels) == len(set(levels)), 'Duplicate difficultyLevel in question bank.')

    if require_complete_bank:
        require(bool(fragment['contentBlocks']), 'A complete lesson needs content blocks.')
        require(sorted(levels) == list(range(1, 11)), 'A complete bank needs levels 1..10 exactly once.')

        used = {question['skillCode'] for question in questions}
        require(all(skills[code]['isPublished'] for code in used),
                'Complete bank references unpublished skills.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('fragment', type=Path)
    parser.add_argument('--track', required=True, type=Path, help='Existing v1 or v2 track catalog.')
    parser.add_argument('--lesson', required=True, help='Exact existing lesson UUID.')
    parser.add_argument('--require-complete-bank', action='store_true')
    args = parser.parse_args()

    track = read_json(args.track)['track']
    require(track['curriculumLevel'] in {'N5', 'N4'}, 'Authoring tooling is scoped to N5/N4.')

    lessons = [lesson for unit in track['units'] for lesson in unit['lessons']
               if lesson['id'] == args.lesson]
    require(len(lessons) == 1, 'Lesson UUID must resolve exactly once in the supplied track.')

    validate_fragment(read_json(args.fragment), lessons[0], args.require_complete_bank)

    print('Draft format/ownership checks passed; editorial/source/revision-diff review is still required.')


if __name__ == '__main__':
    main()
