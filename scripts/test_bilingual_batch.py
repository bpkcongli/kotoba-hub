import copy
import re
import unittest

from convert_bilingual_batch import (
    AUTHORING, OUTPUT, ROOT, build, check_revisions, owner_rows, read_json,
)


class BilingualBatchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inventory = read_json(ROOT / 'docs/syllabus/bilingual-batch-01.json')
        cls.source = read_json(ROOT / cls.inventory['sourceFile'])
        cls.authoring = read_json(AUTHORING)

        cls.manifest, cls.payload, cls.report = build(cls.inventory, cls.source, cls.authoring)

    def compile(self, authoring):
        return build(self.inventory, self.source, authoring)

    def test_identity_japanese_keys_and_provenance_are_preserved(self):
        old = self.source['track']
        source_lessons = {l['id']: l for u in old['units'] for l in u['lessons']}

        self.assertEqual(self.payload['track']['id'], old['id'])
        self.assertEqual(self.manifest['tracks'][0]['lessonIds'], [l['id'] for l in self.inventory['lessons']])

        actual_lessons = [l for u in self.payload['track']['units'] for l in u['lessons']]
        self.assertEqual({l['id'] for l in actual_lessons}, {l['id'] for l in self.inventory['lessons']})

        for lesson in actual_lessons:
            before = source_lessons[lesson['id']]

            for field in ['slug', 'sortOrder', 'estimatedMinutes']:
                self.assertEqual(lesson[field], before[field])

            for field in ['skills', 'contentBlocks', 'postStudyQuestions']:
                self.assertEqual([o['id'] for o in lesson[field]], [o['id'] for o in before[field]])

            for question, original in zip(lesson['postStudyQuestions'], before['postStudyQuestions']):
                for field in ['expectedAnswer', 'difficultyLevel', 'sortOrder', 'questionType', 'sourceRefs']:
                    self.assertEqual(question[field], original[field])

                prompt = {k: v for k, v in original['promptPayload'].items() if k not in {'placeholder', 'hintTexts'}}
                self.assertEqual(question['promptPayload'], prompt)

            for block, original in zip(lesson['contentBlocks'], before['contentBlocks']):
                if block['blockType'] == 'EXAMPLE_SENTENCE':
                    self.assertEqual(block['content']['japaneseSentence'], original['content']['japaneseSentence'])

            for skill, original in zip(lesson['skills'], before['skills']):
                for field in ['code', 'slug', 'skillType', 'curriculumLevel', 'sortOrder',
                              'prerequisiteSkillCodes', 'curriculumSignals', 'sourceRefs',
                              'supportsFlashcards', 'supportsPracticeObjective', 'supportsPracticeFreeResponse']:
                    self.assertEqual(skill[field], original[field])

                canonical = copy.deepcopy(original['content'])
                if skill['skillType'] == 'GRAMMAR':
                    canonical['grammar'].pop('meaning')
                else:
                    canonical['vocabulary'].pop('glossesEn')

                self.assertEqual(skill['content'], canonical)

    def test_held_batch_is_explicit_and_does_not_publish_incomplete_lessons(self):
        self.assertEqual(self.report['status'], 'HELD')
        held = {l['id'] for l in self.report['lessons'] if l['status'] == 'HELD'}
        self.assertEqual(len(held), 7)
        self.assertEqual(sum(len(l['holds']) for l in self.report['lessons']), 18)

        for unit in self.payload['track']['units']:
            for lesson in unit['lessons']:
                self.assertEqual(lesson['isPublished'], lesson['id'] not in held)

        self.assertEqual(len(self.report['questionAttributionFixes']), 41)
        self.assertEqual(len(self.report['blockAttributionFixes']), 4)

    def test_missing_indonesian_and_stale_translations_are_rejected(self):
        owner_id = self.payload['track']['id']

        for change in ['missing', 'stale']:
            authoring = copy.deepcopy(self.authoring)
            locales = authoring['owners'][owner_id]['localizations']

            if change == 'missing':
                locales.pop('id')
            else:
                locales['id']['sourceRevision'] += 1

            with self.assertRaises(AssertionError):
                self.compile(authoring)

    def test_out_of_scope_owners_and_fake_attribution_are_rejected(self):
        authoring = copy.deepcopy(self.authoring)
        authoring['owners']['00000000-0000-5000-8000-000000000000'] = {}

        with self.assertRaises(AssertionError):
            self.compile(authoring)

        authoring = copy.deepcopy(self.authoring)
        question_id = next(iter(authoring['questionSkillCodes']))
        authoring['questionSkillCodes'][question_id] = 'fake_bundle'

        with self.assertRaises(AssertionError):
            self.compile(authoring)

    def test_reading_match_cannot_publish_the_wrong_lexeme(self):
        authoring = copy.deepcopy(self.authoring)
        lesson = next(l for u in self.source['track']['units'] for l in u['lessons']
                      if l['slug'] == 'ko-so-a-do-modifiers')
        question = lesson['postStudyQuestions'][0]

        authoring['holds'].pop(question['id'])
        authoring['questionSkillCodes'][question['id']] = 'n5_kosoado_modifiers_kyuu'
        authoring['owners'][question['id']]['contentRevision'] = 2
        for locale in ['en', 'id']:
            authoring['owners'][question['id']]['localizations'][locale]['sourceRevision'] = 2

        with self.assertRaises(AssertionError):
            self.compile(authoring)

    def test_unsafe_localized_html_is_rejected(self):
        authoring = copy.deepcopy(self.authoring)
        question = next(iter(authoring['questionSkillCodes']))
        authoring['owners'][question]['localizations']['id']['explanation'] = '<p onclick="alert(1)">Jawaban</p>'

        with self.assertRaises(AssertionError):
            self.compile(authoring)

    def test_regeneration_preserves_curation_and_requires_revision_updates(self):
        existing = read_json(OUTPUT / self.manifest['tracks'][0]['file'])
        self.assertEqual(existing, self.payload)
        check_revisions(existing, self.payload)

        changed = copy.deepcopy(self.payload)
        owner = changed['track']
        owner['localizations']['id']['title'] = 'Dasar Bahasa Jepang N5'

        with self.assertRaises(AssertionError):
            check_revisions(existing, changed)

        owner['localizations']['id']['translationRevision'] += 1
        check_revisions(existing, changed)

        owner['localizations']['en']['title'] = 'Japanese N5 Foundation'
        owner['localizations']['en']['translationRevision'] += 1

        with self.assertRaises(AssertionError):
            check_revisions(existing, changed)

    def test_every_owner_has_current_bilingual_provenance(self):
        rows = list(owner_rows(self.payload['track']))
        self.assertEqual(len(rows), 484)

        for owner in rows:
            self.assertEqual(set(owner['localizations']), {'en', 'id'})

            for locale in ['en', 'id']:
                localization = owner['localizations'][locale]

                self.assertEqual(localization['sourceRevision'], owner['contentRevision'])
                self.assertTrue(localization['isPublished'])
                self.assertTrue(localization['sourceRefs'])

    def test_japanese_fragments_in_learning_text_are_not_translated(self):
        def strings(value, path=''):
            if isinstance(value, dict):
                for key, item in value.items():
                    if key not in {'title', 'sourceRefs'}:
                        yield from strings(item, path + '.' + key)
            elif isinstance(value, list):
                for index, item in enumerate(value):
                    yield from strings(item, path + '.' + str(index))
            elif isinstance(value, str):
                japanese = ''.join(re.findall('[ぁ-ゖァ-ヺ一-龯々ー]', value))
                if japanese:
                    yield path, japanese

        for owner in owner_rows(self.payload['track']):
            self.assertEqual(dict(strings(owner['localizations']['en'])),
                             dict(strings(owner['localizations']['id'])), owner['id'])


if __name__ == '__main__':
    unittest.main()
