import copy
import re
import unittest

from bilingual_curation import load_curation, validate_curation, validate_dependencies
from convert_bilingual_batch import (
    AUTHORING, OUTPUT, ROOT, build, check_revisions, owner_rows, read_json,
)


class BilingualBatchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.inventory = read_json(ROOT / 'docs/syllabus/bilingual/batch-01/bilingual-batch-01.json')
        cls.source = read_json(ROOT / cls.inventory['sourceFile'])
        cls.authoring = read_json(AUTHORING)
        cls.curation = load_curation(ROOT, cls.inventory)

        cls.manifest, cls.payload, cls.report = build(cls.inventory, cls.source, cls.authoring, cls.curation)

    def compile(self, authoring):
        return build(self.inventory, self.source, authoring, self.curation)

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
                additions = [row['skill']['id'] for row in self.curation['addedSkills']
                             if row['lessonId'] == lesson['id']] if field == 'skills' else []
                self.assertEqual([o['id'] for o in lesson[field]], [o['id'] for o in before[field]] + additions)

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
                              'curriculumSignals', 'sourceRefs',
                              'supportsFlashcards', 'supportsPracticeObjective', 'supportsPracticeFreeResponse']:
                    self.assertEqual(skill[field], original[field])

                repairs = {row['skillCode']: row['prerequisiteSkillCodes']
                           for row in self.curation['prerequisiteReplacements']}
                self.assertEqual(skill['prerequisiteSkillCodes'],
                                 repairs.get(skill['code'], original['prerequisiteSkillCodes']))

                canonical = copy.deepcopy(original['content'])
                if skill['skillType'] == 'GRAMMAR':
                    canonical['grammar'].pop('meaning')
                else:
                    canonical['vocabulary'].pop('glossesEn')

                self.assertEqual(skill['content'], canonical)

    def test_curation_resolves_the_full_batch_without_dropping_any_question(self):
        self.assertEqual(self.report['status'], 'READY_FOR_BIL_03')
        self.assertEqual(len(self.report['lessons']), 16)
        self.assertTrue(all(lesson['status'] == 'READY_FOR_BIL_03' and not lesson['holds']
                            for lesson in self.report['lessons']))

        for unit in self.payload['track']['units']:
            for lesson in unit['lessons']:
                self.assertTrue(lesson['isPublished'])
                self.assertEqual(sorted(q['difficultyLevel'] for q in lesson['postStudyQuestions']),
                                 list(range(1, 11)))

        self.assertEqual(self.report['questionCount'], 160)
        self.assertEqual(len(self.report['questionAttributionFixes']), 56)
        self.assertEqual(len(self.curation['addedSkills']), 8)
        self.assertEqual(len(self.curation['blockReplacements']), 7)
        self.assertEqual(len(self.curation['resolutions']), 22)

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

        authoring['questionSkillCodes'][question['id']] = 'n5_kosoado_modifiers_kyuu'
        authoring['owners'][question['id']]['contentRevision'] = 2
        for locale in ['en', 'id']:
            authoring['owners'][question['id']]['localizations'][locale]['sourceRevision'] = 2

        with self.assertRaises(AssertionError):
            self.compile(authoring)

    def test_curation_cannot_be_omitted_or_have_resolution_evidence_removed(self):
        with self.assertRaisesRegex(AssertionError, 'Missing scoped curation'):
            build(self.inventory, self.source, self.authoring)

        curation = copy.deepcopy(self.curation)
        curation['resolutions'].pop()

        with self.assertRaisesRegex(AssertionError, 'Incomplete curation resolutions'):
            build(self.inventory, self.source, self.authoring, curation)

    def test_new_skills_cannot_be_moved_to_another_lesson_even_with_a_changed_scope(self):
        curation = copy.deepcopy(self.curation)
        inventory = copy.deepcopy(self.inventory)
        question_id = next(iter(curation['questionSkillCodes']))
        other_skill = curation['addedSkills'][-1]['skill']['code']
        curation['questionSkillCodes'][question_id] = other_skill
        inventory['curation']['questionSkillCodes'][question_id] = other_skill

        with self.assertRaisesRegex(AssertionError, 'across lessons'):
            validate_curation(ROOT, inventory, self.source, curation)

    def test_converted_blocks_preserve_japanese_and_real_grammar_blocks_have_grammar_owners(self):
        expected = {row['block']['id']: row['block'] for row in self.curation['blockReplacements']}
        for unit in self.payload['track']['units']:
            for lesson in unit['lessons']:
                skills = {skill['code']: skill for skill in lesson['skills']}
                for block in lesson['contentBlocks']:
                    if block['id'] in expected:
                        self.assertEqual(block, expected[block['id']])
                        self.assertEqual(block['blockType'], 'PARAGRAPH')
                    elif block['blockType'] == 'GRAMMAR_STRUCTURE':
                        self.assertEqual(skills[block['content']['skillCode']]['skillType'], 'GRAMMAR')

        curation = copy.deepcopy(self.curation)
        curation['blockReplacements'][0]['block']['localizations']['id']['body'] = '<p>Penjelasan.</p>'
        with self.assertRaisesRegex(AssertionError, 'Japanese pattern'):
            validate_curation(ROOT, self.inventory, self.source, curation)

    def test_retired_wrong_lexemes_cannot_be_published_by_clearing_the_retirement_list(self):
        authoring = copy.deepcopy(self.authoring)
        authoring['unusableSkillCodes'].clear()
        with self.assertRaisesRegex(AssertionError, 'remain retired'):
            self.compile(authoring)

    def test_dependency_graph_rejects_retired_targets_missing_targets_and_cycles(self):
        for prerequisite in ['n5_kosoado_modifiers_kyuu', 'unknown_skill', 'n5_kosoado_modifiers_sono']:
            track = copy.deepcopy(self.payload['track'])
            skill = next(skill for unit in track['units'] for lesson in unit['lessons']
                         for skill in lesson['skills'] if skill['code'] == 'n5_kosoado_modifiers_sono')
            skill['prerequisiteSkillCodes'] = [prerequisite]
            with self.assertRaisesRegex(AssertionError, 'Unavailable prerequisite|Prerequisite cycle'):
                validate_dependencies(track, self.source)

        validate_dependencies(self.payload['track'], self.source)

    def test_curation_loader_rejects_an_unreviewed_checksum(self):
        inventory = copy.deepcopy(self.inventory)
        inventory['curation']['sha256'] = '0' * 64
        with self.assertRaisesRegex(AssertionError, 'checksum changed'):
            load_curation(ROOT, inventory)

    def test_reviewed_hints_no_longer_spell_out_the_accepted_answer(self):
        reviewed = {'e2428888-83a2-5189-9b4f-02bccb94f3b7', '06713a0b-506b-5852-be82-9c58682229e6',
                    '745dcf70-a820-5eff-a400-eae03ef141d5', '1dca1e7b-2713-5b7d-bfa1-7bd65f2491ec'}
        questions = {q['id']: q for unit in self.payload['track']['units'] for lesson in unit['lessons']
                     for q in lesson['postStudyQuestions']}

        for qid in reviewed:
            question = questions[qid]
            for localization in question['localizations'].values():
                hints = ' '.join(localization['hintTexts'])
                self.assertFalse(any(answer in hints for answer in question['expectedAnswer']['acceptedTextAnswers']))

    def test_revision_check_rejects_lost_existing_owners(self):
        candidate = copy.deepcopy(self.payload)
        candidate['track']['units'][0]['lessons'][0]['skills'].pop(0)
        with self.assertRaisesRegex(AssertionError, 'cannot disappear'):
            check_revisions(self.payload, candidate)

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
        self.assertEqual(len(rows), 492)

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
