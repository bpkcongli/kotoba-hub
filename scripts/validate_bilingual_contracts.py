import copy
import hashlib
import json
from pathlib import Path

import yaml
from jsonschema import Draft202012Validator, FormatChecker


ROOT = Path(__file__).resolve().parents[1]
SCHEMAS = ROOT / 'docs/syllabus/schema'
EXAMPLES = ROOT / 'docs/syllabus/examples'


def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def check_seed_schemas():
    validators = {}
    examples = {}
    for name, example_name in [
        ('seed-manifest', 'bilingual-manifest'),
        ('track-seed', 'bilingual-track'),
    ]:
        schema = read_json(SCHEMAS / f'{name}.v2.schema.json')
        Draft202012Validator.check_schema(schema)
        validator = Draft202012Validator(schema, format_checker=FormatChecker())
        example = read_json(EXAMPLES / f'{example_name}.v2.example.json')
        validator.validate(example)
        validators[name] = validator
        examples[name] = example

    def reject(name, label, change):
        candidate = copy.deepcopy(examples[name])
        change(candidate)
        require(not validators[name].is_valid(candidate), f'Schema accepted invalid case: {label}')

    def track(value):
        return value['track']

    def lesson(value):
        return track(value)['units'][0]['lessons'][0]

    def block(value, index):
        return lesson(value)['contentBlocks'][index]

    cases = [
        ('unsupported version', lambda v: v.update(schemaVersion='3.0.0')),
        ('missing English', lambda v: track(v)['localizations'].pop('en')),
        ('unsupported locale', lambda v: track(v)['localizations'].update(ja=track(v)['localizations']['en'])),
        ('zero revision', lambda v: track(v).update(contentRevision=0)),
        ('old title outside localization', lambda v: track(v).update(title='Legacy title')),
        ('legacy paragraph body', lambda v: block(v, 0).update(body='Old body')),
        ('English-only example field', lambda v: block(v, 1)['content'].update(englishTranslation='Old translation')),
        ('all-null grammar', lambda v: block(v, 2)['localizations']['id'].update(ALL=None, STANDARD=None, POLITE=None)),
        ('no translation provenance', lambda v: track(v)['localizations']['id'].update(sourceRefs=[])),
        ('wrong canonical skill family', lambda v: lesson(v)['skills'][0]['content'].update(kana={'scriptFamily': 'HIRAGANA', 'characters': [{'char': 'あ', 'romanization': 'a'}]})),
        ('wrong localized skill family', lambda v: lesson(v)['skills'][0]['localizations']['id']['content'].update(kanji={'meanings': ['hari']})),
        ('unsupported prompt language', lambda v: lesson(v)['postStudyQuestions'][0]['promptPayload'].update(promptLanguage='ID')),
        ('multiple blanks', lambda v: lesson(v)['postStudyQuestions'][0]['promptPayload'].update(sentenceTemplate='___ は ___')),
        ('romaji key', lambda v: lesson(v)['postStudyQuestions'][0]['expectedAnswer'].update(acceptedTextAnswers=['wa'])),
        ('published incomplete bank', lambda v: lesson(v).update(isPublished=True)),
        ('published parent with draft English', lambda v: (track(v).update(isPublished=True), track(v)['localizations']['en'].update(isPublished=False))),
    ]
    for label, change in cases:
        reject('track-seed', label, change)
    for label, change in [
        ('unsafe track path', lambda v: v['tracks'][0].update(file='../tracks/a.json')),
        ('wrong import mode', lambda v: v.update(importMode='REPLACE_CATALOG')),
        ('duplicate scoped ID', lambda v: v['tracks'][0]['lessonIds'].append(v['tracks'][0]['lessonIds'][0])),
        ('no scoped lessons', lambda v: v['tracks'][0].update(lessonIds=[])),
    ]:
        reject('seed-manifest', label, change)

    english_only = copy.deepcopy(examples['track-seed'])
    english_only['track']['localizations'].pop('id')
    validators['track-seed'].validate(english_only)
    print(f'JSON Schema: 2 examples, English-only authoring, {len(cases) + 4} rejected cases OK.')


def check_inventory():
    inventory = read_json(ROOT / 'docs/syllabus/bilingual-batch-01.json')
    source_path = ROOT / inventory['sourceFile']
    require(hashlib.sha256(source_path.read_bytes()).hexdigest() == inventory['sourceSha256'],
            'Baseline changed: review source diff and update the inventory intentionally.')
    source = read_json(source_path)['track']
    lessons = {lesson['id']: (unit, lesson) for unit in source['units'] for lesson in unit['lessons']}
    entries = inventory['lessons']
    require(len(entries) == len({entry['id'] for entry in entries}) == 16, 'Expected 16 distinct lesson IDs.')
    for entry in entries:
        unit, lesson = lessons[entry['id']]
        require((unit['id'], unit['slug'], lesson['slug']) ==
                (entry['unitId'], entry['unitSlug'], entry['slug']), 'Inventory identity mismatch.')
        for field, source_key in [('skillIds', 'skills'), ('contentBlockIds', 'contentBlocks'), ('questionIds', 'postStudyQuestions')]:
            require(entry[field] == [row['id'] for row in lesson[source_key]], f'Inventory subtree mismatch: {field}.')
        unresolved = sorted({q['skillCode'] for q in lesson['postStudyQuestions']} -
                            {s['code'] for s in lesson['skills'] if s['isPublished']})
        require(entry['unresolvedQuestionSkillCodes'] == unresolved, 'Attribution mismatch.')
        require(entry['baselineStatus'] == ('REQUIRES_SKILL_ATTRIBUTION_FIX' if unresolved else 'IMPORTABLE_V1'),
                'Baseline status mismatch.')
    require(sum(e['baselineStatus'] == 'IMPORTABLE_V1' for e in entries) == 9, 'Expected nine importable v1 lessons.')
    print('Inventory: source checksum, 16 lesson/subtree identities and 9/7 baseline split OK.')


def check_openapi():
    path = ROOT / 'docs/api-contract/openapi.bilingual.yaml'
    doc = yaml.safe_load(path.read_text(encoding='utf-8'))
    require(doc['openapi'] == '3.0.3', 'Unexpected OpenAPI version.')
    operations = []

    def walk(value):
        if isinstance(value, dict):
            if '$ref' in value:
                target = doc
                require(value['$ref'].startswith('#/'), 'Expected a self-contained OpenAPI reference.')
                for segment in value['$ref'][2:].split('/'):
                    target = target[segment.replace('~1', '/').replace('~0', '~')]
            if value.get('type') == 'object' and 'properties' in value:
                if 'required' in value:
                    require(bool(value['required']), 'OpenAPI required must be nonempty; omit it when all fields are optional.')
                require(set(value.get('required', [])) <= set(value['properties']), 'Required API field missing from properties.')
            for item in value.values():
                walk(item)
        elif isinstance(value, list):
            for item in value:
                walk(item)

    walk(doc)
    for item in doc['paths'].values():
        for method, operation in item.items():
            if method in {'get', 'post', 'patch'}:
                operations.append(operation['operationId'])
                require('200' in operation['responses'], 'Missing success response.')
                require(operation.get('security') == [{'cookieAuth': []}], 'Missing session authorization.')
    require(len(operations) == len(set(operations)) == 7, 'Expected seven distinct operations.')
    definitions = doc['components']['schemas']
    require('translation' in definitions['SyllabusExampleSentenceContentBlockPayload']['required'], 'Missing neutral translation field.')
    require('contentLocale' not in definitions['QuizLessonPostStudyAnswerRequest']['properties'], 'Answer must reuse delivery locale.')
    print('OpenAPI: YAML, internal references, required fields and 7 guarded operations OK (structural check).')


if __name__ == '__main__':
    check_seed_schemas()
    check_inventory()
    check_openapi()
