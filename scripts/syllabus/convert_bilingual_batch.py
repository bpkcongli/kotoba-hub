"""Build the isolated BIL-02 authoring batch; never read by the v1 importer."""

import argparse
import copy
import hashlib
import json
import re
from html.parser import HTMLParser
from pathlib import Path

from jsonschema import Draft202012Validator, FormatChecker

from bilingual_curation import load_curation, validate_curation, validate_dependencies
from validate_bilingual_contracts import check_inventory, require


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / 'content/syllabus/v2'
AUTHORING = OUTPUT / 'authoring/batch-01.json'
REPORT = ROOT / 'docs/syllabus/bilingual/batch-01/bilingual-batch-01-conversion.json'
META = {'sourceRevision', 'translationRevision', 'isPublished', 'sourceRefs'}


class BatchHtml(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.text = []

    def handle_starttag(self, tag, attrs):
        require(tag in {'p', 'div', 'span', 'strong', 'br'}, f'Unsafe HTML tag: {tag}')

        classes = {'text-emphasis', 'text-warning', 'question-blank',
                   'question-dialogue', 'question-scenario', 'question-continuation'}
        require(all(key == 'class' and value in classes for key, value in attrs), 'Unsafe HTML attribute.')

        if tag != 'br':
            self.stack.append(tag)

    def handle_endtag(self, tag):
        require(bool(self.stack) and self.stack.pop() == tag, f'Unbalanced HTML: {tag}')

    def handle_data(self, data):
        self.text.append(data)

    def handle_comment(self, data):
        raise AssertionError('HTML comments are not supported in this batch.')

    def handle_decl(self, decl):
        raise AssertionError('HTML declarations are not supported in this batch.')

    def handle_pi(self, data):
        raise AssertionError('HTML processing instructions are not supported in this batch.')


def validate_html(value):
    if isinstance(value, dict):
        for item in value.values():
            validate_html(item)
    elif isinstance(value, list):
        for item in value:
            validate_html(item)
    elif isinstance(value, str) and '<' in value:
        parser = BatchHtml()
        parser.feed(value)
        parser.close()

        require(not parser.stack, 'Unclosed HTML tag.')


def read_json(path):
    def distinct(pairs):
        result = {}

        for key, value in pairs:
            require(key not in result, f'Duplicate JSON key: {key}')
            result[key] = value

        return result

    return json.loads(path.read_text(encoding='utf-8'), object_pairs_hook=distinct)


def encoded(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + '\n'


def owner_rows(track):
    yield track

    for unit in track['units']:
        yield unit
        for lesson in unit['lessons']:
            yield lesson
            for field in ['skills', 'contentBlocks', 'postStudyQuestions']:
                yield from lesson[field]


def legacy_localization(owner):
    if 'learningObjective' in owner:
        return {key: owner[key] for key in ['title', 'learningObjective']}

    if 'units' in owner or 'lessons' in owner:
        return {key: owner.get(key) for key in ['title', 'description']}

    if 'skillType' in owner:
        family = 'grammar' if owner['skillType'] == 'GRAMMAR' else 'vocabulary'
        key, old_key = ('meaning', 'meaning') if family == 'grammar' else ('glosses', 'glossesEn')

        return {'title': owner['title'], 'description': owner.get('description'),
                'content': {family: {key: owner['content'][family][old_key]}}}

    if 'blockType' in owner:
        content = owner.get('content', owner)

        if owner['blockType'] == 'PARAGRAPH':
            return {'title': content.get('title'), 'body': content['body']}

        if owner['blockType'] == 'EXAMPLE_SENTENCE':
            return {'translation': content['englishTranslation']}

        return {key: content.get(key) for key in ['ALL', 'STANDARD', 'POLITE']}

    return {'placeholder': owner['promptPayload'].get('placeholder'),
            'hintTexts': owner['promptPayload'].get('hintTexts', []),
            'explanation': owner.get('explanation')}


def build(inventory, source, authoring, curation=None):
    require(authoring['batchId'] == inventory['batchId'], 'Wrong authoring batch.')
    require(authoring['sourceSha256'] == inventory['sourceSha256'], 'Wrong authoring baseline.')

    validate_curation(ROOT, inventory, source, curation)
    replacements = {row['block']['id']: row['block'] for row in curation['blockReplacements']} if curation else {}

    allowed = {entry['id'] for entry in inventory['lessons']}
    track = copy.deepcopy(source['track'])
    track['units'] = [unit for unit in track['units']
                      if any(lesson['id'] in allowed for lesson in unit['lessons'])]
    for unit in track['units']:
        unit['lessons'] = [lesson for lesson in unit['lessons'] if lesson['id'] in allowed]

    originals = {owner['id']: copy.deepcopy(owner) for owner in owner_rows(track)}
    require(len(list(owner_rows(track))) == len(originals), 'Duplicate canonical ID.')
    require(set(authoring['owners']) == set(originals) - set(replacements),
            'Authoring owner set differs from allowlist/curation.')

    question_ids = {q['id'] for u in track['units'] for l in u['lessons'] for q in l['postStudyQuestions']}
    block_ids = {b['id'] for u in track['units'] for l in u['lessons'] for b in l['contentBlocks']}

    require(set(authoring['questionSkillCodes']) <= question_ids, 'Unknown question override.')
    require(set(authoring['blockSkillCodes']) <= block_ids, 'Unknown block override.')
    require(set(authoring['holds']) <= question_ids | block_ids, 'Unknown publication hold.')
    require(set(authoring['presentationNotes']) <= question_ids, 'Unknown presentation note.')

    skill_codes = {s['code'] for u in track['units'] for l in u['lessons'] for s in l['skills']}
    require(set(authoring['unusableSkillCodes']) <= skill_codes, 'Unknown lexical hold.')

    if curation:
        require(set(authoring['unusableSkillCodes']) == set(inventory['curation']['retiredSkillCodes']),
                'Retired lexical identities must remain retired.')
        require(all(authoring['questionSkillCodes'].get(qid) == code
                    for qid, code in curation['questionSkillCodes'].items()),
                'Curation question mappings were not integrated.')
        require(not (set(authoring['holds']) & {row['ownerId'] for row in curation['resolutions']}),
                'Resolved curation still has publication holds.')

    require(all(isinstance(reason, str) and reason.strip() for reason in authoring['holds'].values()),
            'A publication hold must explain the unresolved attribution.')

    for owner in owner_rows(track):
        if owner['id'] in replacements:
            continue

        original = originals[owner['id']]
        record = authoring['owners'][owner['id']]

        require(set(record) == {'contentRevision', 'localizations'}, 'Unknown authoring owner field.')
        require(set(record['localizations']) == {'en', 'id'}, 'Both languages must be complete.')

        owner.update(copy.deepcopy(record))
        for locale, localization in owner['localizations'].items():
            require(localization['isPublished'] and localization['sourceRevision'] == owner['contentRevision'],
                    f'Incomplete or stale {locale}: {owner["id"]}')

        english = {key: value for key, value in owner['localizations']['en'].items() if key not in META}
        changed = english != legacy_localization(original)
        changed |= owner['id'] in authoring['questionSkillCodes'] or owner['id'] in authoring['blockSkillCodes']
        require(not changed or owner['contentRevision'] >= 2, f'Revision must increase: {owner["id"]}')

        for field in ['title', 'description', 'learningObjective', 'body', 'explanation']:
            owner.pop(field, None)

        if 'skillType' in owner:
            family = 'grammar' if owner['skillType'] == 'GRAMMAR' else 'vocabulary'
            owner['content'][family].pop('meaning' if family == 'grammar' else 'glossesEn')

            if owner['code'] in authoring['unusableSkillCodes']:
                owner['isPublished'] = False
        elif 'blockType' in owner:
            content = original.get('content', original)

            if owner['blockType'] == 'PARAGRAPH':
                owner['content'] = {}
            elif owner['blockType'] == 'EXAMPLE_SENTENCE':
                owner['content'] = {'japaneseSentence': content['japaneseSentence']}
            else:
                owner['content'] = {'skillCode': authoring['blockSkillCodes'].get(owner['id'], content['skillCode'])}
        elif 'promptPayload' in owner:
            for field in ['placeholder', 'hintTexts']:
                owner['promptPayload'].pop(field, None)

            owner['skillCode'] = authoring['questionSkillCodes'].get(owner['id'], owner['skillCode'])

            parser = BatchHtml()
            parser.feed(owner['promptPayload']['sentenceTemplateHtml'])
            plain = re.sub(r'\s+', '', owner['promptPayload']['sentenceTemplate'])
            rendered = re.sub(r'\s+', '', ''.join(parser.text))

            require(plain == rendered or bool(authoring['presentationNotes'].get(owner['id'])),
                    f'Unreviewed plain/HTML difference: {owner["id"]}')

        if owner['id'] in authoring['holds']:
            owner['isPublished'] = False

    for unit in track['units']:
        for lesson in unit['lessons']:
            lesson['contentBlocks'] = [copy.deepcopy(replacements.get(block['id'], block))
                                       for block in lesson['contentBlocks']]
            if curation:
                lesson['skills'].extend(copy.deepcopy(row['skill']) for row in curation['addedSkills']
                                        if row['lessonId'] == lesson['id'])

    if curation:
        prerequisite_replacements = {row['skillCode']: row['prerequisiteSkillCodes']
                                     for row in curation['prerequisiteReplacements']}
        for unit in track['units']:
            for lesson in unit['lessons']:
                for skill in lesson['skills']:
                    if skill['code'] in prerequisite_replacements:
                        skill['prerequisiteSkillCodes'] = copy.deepcopy(prerequisite_replacements[skill['code']])
        validate_dependencies(track, source)

    rows = list(owner_rows(track))
    require(len(rows) == len({row['id'] for row in rows}), 'Duplicate curated owner ID.')
    require(all(set(row['localizations']) == {'en', 'id'} and
                all(text['isPublished'] and text['sourceRevision'] == row['contentRevision']
                    for text in row['localizations'].values()) for row in rows),
            'Every curated owner requires both current language packages.')

    summaries = []
    for unit in track['units']:
        for lesson in unit['lessons']:
            codes = {skill['code'] for skill in lesson['skills'] if skill['isPublished']}
            holds = []

            for field in ['postStudyQuestions', 'contentBlocks']:
                for owner in lesson[field]:
                    reference = owner.get('skillCode', owner.get('content', {}).get('skillCode'))
                    held = owner['id'] in authoring['holds']

                    if reference and reference not in codes:
                        require(held, f'Unreviewed attribution: {owner["id"]}')

                    if curation and owner.get('blockType') == 'GRAMMAR_STRUCTURE':
                        require(any(skill['code'] == reference and skill['skillType'] == 'GRAMMAR'
                                    and skill['isPublished'] for skill in lesson['skills']),
                                f'Grammar block requires a grammar skill: {owner["id"]}')

                    if held:
                        holds.append({'id': owner['id'], 'kind': field,
                                      'reason': authoring['holds'][owner['id']]})

            if holds:
                lesson['isPublished'] = False

            require(len(lesson['postStudyQuestions']) == 10 and
                    sorted(q['difficultyLevel'] for q in lesson['postStudyQuestions']) == list(range(1, 11)),
                    f'Invalid bank: {lesson["slug"]}')

            summaries.append({'id': lesson['id'], 'slug': lesson['slug'],
                              'status': 'HELD' if holds else 'READY_FOR_BIL_03', 'holds': holds})

    payload = {'schemaVersion': '2.0.0', 'generatedAt': authoring['generatedAt'], 'track': track}
    validate_html(payload)

    manifest = {'schemaVersion': '2.0.0', 'generatedAt': authoring['generatedAt'], 'defaultLocale': 'en',
                'supportedLocales': ['en', 'id'], 'importMode': 'MERGE_LESSONS', 'tracks': [{
                    **{key: track[key] for key in ['slug', 'curriculumLevel', 'sortOrder', 'isPublished']},
                    'file': f'tracks/{track["slug"]}.json',
                    'lessonIds': [entry['id'] for entry in inventory['lessons']]}]}

    for name, value in [('track-seed', payload), ('seed-manifest', manifest)]:
        schema = read_json(ROOT / f'docs/syllabus/schema/{name}.v2.schema.json')
        Draft202012Validator(schema, format_checker=FormatChecker()).validate(value)

    changed_english = [oid for oid, old in originals.items()
                       if legacy_localization(old) != {
                           k: v for k, v in (replacements.get(oid) or authoring['owners'][oid])['localizations']['en'].items()
                           if k not in META}]

    report = {'batchId': inventory['batchId'], 'sourceFile': inventory['sourceFile'],
              'sourceSha256': inventory['sourceSha256'], 'status': 'HELD' if any(l['holds'] for l in summaries) else 'READY_FOR_BIL_03',
              'ownerCount': len(rows), 'localizedOwnerCount': len(rows),
              'questionCount': len(question_ids), 'questionAttributionFixes': authoring['questionSkillCodes'],
              'blockAttributionFixes': authoring['blockSkillCodes'],
              'unusableSkillCodes': authoring['unusableSkillCodes'],
              'englishRevisedOwnerIds': changed_english, 'presentationNotes': authoring['presentationNotes'],
              'lessons': summaries}

    if curation:
        report['curation'] = {**inventory['curation'], 'recordedAt': curation['recordedAt'],
                              'resolutions': curation['resolutions']}
        report['baselineOwnerCount'] = len(originals)

    return manifest, payload, report


def check_revisions(previous, candidate):
    old_rows = {row['id']: row for row in owner_rows(previous['track'])}
    new_rows = list(owner_rows(candidate['track']))
    require(set(old_rows) <= {row['id'] for row in new_rows}, 'Existing owner cannot disappear.')

    for row in new_rows:
        if row['id'] not in old_rows:
            require(row['contentRevision'] == 1 and
                    all(text['translationRevision'] == 1 for text in row['localizations'].values()),
                    'New owner revisions must start at one.')
            continue

        old = old_rows[row['id']]
        require(row['contentRevision'] >= old['contentRevision'], 'Canonical revision cannot decrease.')

        def canonical(owner):
            return {key: value for key, value in owner.items()
                    if key not in {'localizations', 'contentRevision', 'sortOrder', 'isPublished',
                                   'units', 'lessons', 'skills', 'contentBlocks', 'postStudyQuestions'}}

        def text(localization):
            return {key: value for key, value in localization.items() if key not in META | {'sourceRefs'}}

        english_changed = (text(old['localizations']['en']) != text(row['localizations']['en']) or
                           old['localizations']['en']['sourceRefs'] != row['localizations']['en']['sourceRefs'])
        if canonical(old) != canonical(row) or english_changed:
            require(row['contentRevision'] > old['contentRevision'], 'Changed canonical/English requires a new revision.')

        for locale in ['en', 'id']:
            before, after = old['localizations'][locale], row['localizations'][locale]
            require(after['translationRevision'] >= before['translationRevision'], 'Translation revision cannot decrease.')

            if text(before) != text(after) or before['sourceRefs'] != after['sourceRefs']:
                require(after['translationRevision'] > before['translationRevision'], 'Changed translation requires a new revision.')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Verify artifacts without writing.')
    parser.add_argument('--require-publishable', action='store_true', help='Fail if any lesson is held.')
    args = parser.parse_args()

    check_inventory()
    inventory = read_json(ROOT / 'docs/syllabus/bilingual/batch-01/bilingual-batch-01.json')
    source_path = ROOT / inventory['sourceFile']
    actual = hashlib.sha256(source_path.read_bytes()).hexdigest()
    require(actual == inventory['sourceSha256'], f'Source changed: expected {inventory["sourceSha256"]}, actual {actual}. Review the diff first.')

    manifest, payload, report = build(inventory, read_json(source_path), read_json(AUTHORING),
                                      load_curation(ROOT, inventory))
    track_path = OUTPUT / manifest['tracks'][0]['file']

    if track_path.exists():
        check_revisions(read_json(track_path), payload)

    artifacts = [(OUTPUT / 'manifest.json', manifest), (track_path, payload), (REPORT, report)]

    if args.require_publishable:
        require(report['status'] == 'READY_FOR_BIL_03', 'Batch HELD: inspect bilingual-batch-01-conversion.json; no partial import allowed.')

    for path, value in artifacts:
        if args.check:
            require(read_json(path) == value, f'Artifact out of date: {path.relative_to(ROOT)}')
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(encoded(value), encoding='utf-8')

    ready = sum(lesson['status'] == 'READY_FOR_BIL_03' for lesson in report['lessons'])
    print(f'BIL-02 authoring verified: {report["ownerCount"]} bilingual owners, 160 questions; {ready}/16 lessons ready, batch {report["status"]}.')


if __name__ == '__main__':
    main()
