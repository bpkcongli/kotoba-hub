"""Validate the explicitly scoped BIL-02 curation overlay against its frozen source."""

import hashlib
import json
import re
import uuid

from jsonschema import Draft202012Validator, FormatChecker


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def load_curation(root, inventory):
    scope = inventory.get('curation')

    if scope is None:
        return None

    require(scope['file'] == 'content/syllabus/v2/authoring/batch-01-curation.json',
            'Unexpected curation path.')

    raw = (root / scope['file']).read_bytes()
    require(hashlib.sha256(raw).hexdigest() == scope['sha256'], 'Curation checksum changed; review the diff.')

    def distinct(pairs):
        result = {}

        for key, value in pairs:
            require(key not in result, f'Duplicate curation JSON key: {key}')
            result[key] = value

        return result

    return json.loads(raw, object_pairs_hook=distinct)


def validate_curation(root, inventory, source, curation):
    scope = inventory.get('curation')

    if scope is None:
        require(curation is None, 'Curation requires an explicit inventory scope.')
        return

    require(isinstance(curation, dict), 'Missing scoped curation.')
    require(set(curation) == {'batchId', 'sourceSha256', 'recordedAt', 'addedSkills',
                             'blockReplacements', 'questionSkillCodes', 'resolutions',
                             'prerequisiteReplacements'},
            'Unexpected curation fields.')
    require(curation['batchId'] == inventory['batchId'] and
            curation['sourceSha256'] == inventory['sourceSha256'], 'Wrong curation baseline.')

    lessons = {lesson['id']: lesson for unit in source['track']['units'] for lesson in unit['lessons']}
    allowed = {lesson['id'] for lesson in inventory['lessons']}
    existing_ids = {owner['id'] for lesson in lessons.values()
                    for field in ['skills', 'contentBlocks', 'postStudyQuestions']
                    for owner in lesson.get(field, [])}
    existing_codes = {skill['code'] for lesson in lessons.values() for skill in lesson['skills']}
    original_blocks = {block['id']: (lesson['id'], block) for lesson in lessons.values()
                       for block in lesson.get('contentBlocks', [])}
    original_questions = {question['id']: lesson['id'] for lesson in lessons.values()
                          for question in lesson.get('postStudyQuestions', [])}

    added = curation['addedSkills']
    replacements = curation['blockReplacements']

    require([{'lessonId': row['lessonId'], 'id': row['skill']['id'], 'code': row['skill']['code']}
             for row in added] == scope['addedSkills'], 'Curation skill scope changed.')
    require([{'lessonId': row['lessonId'], 'id': row['block']['id']} for row in replacements] ==
            scope['blockReplacements'], 'Curation block scope changed.')
    require(curation['questionSkillCodes'] == scope['questionSkillCodes'], 'Curation question scope changed.')
    require(curation['prerequisiteReplacements'] == scope['prerequisiteReplacements'],
            'Curation prerequisite scope changed.')

    schema = json.loads((root / 'docs/syllabus/schema/track-seed.v2.schema.json').read_text())
    namespace = uuid.uuid5(uuid.NAMESPACE_URL, 'https://kotobahub.local/content/syllabus')
    codes_by_lesson = {lid: {skill['code'] for skill in lessons[lid]['skills']} for lid in allowed}
    ids, codes, positions = set(existing_ids), set(existing_codes), {}

    for row in added + replacements:
        require(set(row) == {'lessonId', 'reason', 'skill' if 'skill' in row else 'block'},
                'Unexpected curation record fields.')
        require(row['lessonId'] in allowed, 'Curation targets an out-of-scope lesson.')
        require(isinstance(row['reason'], str) and row['reason'].strip(), 'Missing curation reason.')

        owner = row.get('skill', row.get('block'))
        definition = 'skill' if 'skill' in row else 'paragraphLessonContentBlock'
        Draft202012Validator({'$defs': schema['$defs'], '$ref': f'#/$defs/{definition}'},
                             format_checker=FormatChecker()).validate(owner)

        require(owner['isPublished'] and set(owner['localizations']) == {'en', 'id'},
                'Curation must have both reviewed language packages.')

        for text in owner['localizations'].values():
            require(text['isPublished'] and text['sourceRevision'] == owner['contentRevision'],
                    'Curation contains draft/stale translation.')

        if 'skill' in row:
            lesson = lessons[row['lessonId']]

            require(owner['id'] not in ids and owner['code'] not in codes, 'Curation reuses an existing skill identity.')
            ids.add(owner['id'])
            codes.add(owner['code'])

            expected_id = uuid.uuid5(namespace, '/'.join(['N5', lesson['slug'], owner['code']]))
            require(owner['id'] == str(expected_id), 'New skill UUID is not deterministic.')

            require(owner['curriculumLevel'] == 'N5' and owner['skillType'] == 'VOCABULARY',
                    'This curation only adds N5 lexical skills.')
            require(owner['contentRevision'] == 1 and
                    all(text['translationRevision'] == 1 for text in owner['localizations'].values()),
                    'New skill revisions must start at one.')
            require(bool(owner['sourceRefs']), 'New skill lacks canonical source provenance.')

            positions.setdefault(row['lessonId'], {skill['sortOrder'] for skill in lesson['skills']})
            require(owner['sortOrder'] not in positions[row['lessonId']] and
                    owner['sortOrder'] > max(skill['sortOrder'] for skill in lesson['skills']),
                    'New skills must append without changing existing order.')
            positions[row['lessonId']].add(owner['sortOrder'])

            require(set(owner['prerequisiteSkillCodes']) <= existing_codes | codes,
                    'New skill has an unknown prerequisite.')
            codes_by_lesson[row['lessonId']].add(owner['code'])
        else:
            require(owner['id'] in original_blocks, 'Curation invents a replacement block.')
            lesson_id, original = original_blocks[owner['id']]

            require(lesson_id == row['lessonId'] and original['blockType'] == 'GRAMMAR_STRUCTURE',
                    'Replacement must preserve the original block owner.')
            require(owner['sortOrder'] == original['sortOrder'] and owner['contentRevision'] > 1,
                    'Replacement must retain order and increment its revision.')

            content = original.get('content', original)
            japanese = ''.join(re.findall('[ぁ-ゖァ-ヺ一-龯々ー]', ''.join(
                content.get(field) or '' for field in ['ALL', 'STANDARD', 'POLITE'])))

            for text in owner['localizations'].values():
                remaining = iter(''.join(re.findall('[ぁ-ゖァ-ヺ一-龯々ー]', text['body'])))
                require(all(any(char == candidate for candidate in remaining) for char in japanese),
                        'Replacement dropped or reordered an original Japanese pattern.')

    replacement_ids = [row['block']['id'] for row in replacements]
    require(len(replacement_ids) == len(set(replacement_ids)), 'Duplicate replacement block.')

    for question_id, code in curation['questionSkillCodes'].items():
        require(question_id in original_questions and original_questions[question_id] in allowed,
                'Curation changes an out-of-scope question.')
        require(code in codes_by_lesson[original_questions[question_id]], 'Curation assigns a skill across lessons.')

    required = set(replacement_ids) | set(curation['questionSkillCodes'])
    require(len(curation['resolutions']) == len(required) and
            {row['ownerId'] for row in curation['resolutions']} == required, 'Incomplete curation resolutions.')

    for row in curation['resolutions']:
        require(set(row) == {'ownerId', 'reason', 'sourceRefs'} and bool(row['reason'].strip()),
                'Invalid resolution evidence.')
        require(bool(row['sourceRefs']), 'Resolution lacks evidence.')

        for ref in row['sourceRefs']:
            Draft202012Validator({'$defs': schema['$defs'], '$ref': '#/$defs/sourceRef'},
                                 format_checker=FormatChecker()).validate(ref)

    changed_codes = set()

    for row in curation['prerequisiteReplacements']:
        require(set(row) == {'lessonId', 'skillCode', 'oldPrerequisiteSkillCodes',
                             'prerequisiteSkillCodes', 'reason', 'sourceRefs'},
                'Unexpected prerequisite curation fields.')
        require(row['lessonId'] in allowed and row['skillCode'] not in changed_codes,
                'Out-of-scope or duplicate prerequisite replacement.')
        changed_codes.add(row['skillCode'])

        original = next((skill for skill in lessons[row['lessonId']]['skills']
                         if skill['code'] == row['skillCode']), None)
        require(original is not None and original['prerequisiteSkillCodes'] == row['oldPrerequisiteSkillCodes'],
                'Prerequisite replacement baseline changed.')

        require(len(row['prerequisiteSkillCodes']) == len(set(row['prerequisiteSkillCodes'])) and
                set(row['prerequisiteSkillCodes']) <= codes_by_lesson[row['lessonId']],
                'Replacement prerequisite must resolve within its lesson.')

        removed = set(row['oldPrerequisiteSkillCodes']) - set(row['prerequisiteSkillCodes'])
        require(bool(removed) and removed <= set(scope['retiredSkillCodes']),
                'Only retired prerequisite edges may be replaced.')

        require(bool(row['reason'].strip()) and bool(row['sourceRefs']), 'Prerequisite repair lacks evidence.')

        for ref in row['sourceRefs']:
            Draft202012Validator({'$defs': schema['$defs'], '$ref': '#/$defs/sourceRef'},
                                 format_checker=FormatChecker()).validate(ref)


def validate_dependencies(track, source):
    catalog = {skill['code']: skill for unit in source['track']['units'] for lesson in unit['lessons']
               for skill in lesson['skills']}

    current = [skill for unit in track['units'] for lesson in unit['lessons'] for skill in lesson['skills']]
    require(len(current) == len({skill['code'] for skill in current}), 'Duplicate curated skill code.')

    catalog.update({skill['code']: skill for skill in current})
    visiting, visited = set(), set()

    def visit(code):
        require(code in catalog and catalog[code]['isPublished'], f'Unavailable prerequisite: {code}')
        require(code not in visiting, f'Prerequisite cycle: {code}')

        if code in visited:
            return

        visiting.add(code)

        for prerequisite in catalog[code]['prerequisiteSkillCodes']:
            visit(prerequisite)

        visiting.remove(code)
        visited.add(code)

    for skill in current:
        if skill['isPublished']:
            visit(skill['code'])
