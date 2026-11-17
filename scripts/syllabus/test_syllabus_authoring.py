"""Regression checks for draft boundaries; not a Japanese-language quality test."""

import copy
import unittest
import uuid

from jsonschema import ValidationError

from validate_syllabus_authoring import ROOT, read_json, validate_fragment


class SyllabusAuthoringTests(unittest.TestCase):
    def setUp(self):
        self.fragment = read_json(ROOT / 'docs/syllabus/examples/lesson-content-authoring.v2.example.json')
        self.track = read_json(ROOT / 'content/syllabus/v1/tracks/jlpt-n5-foundation.json')['track']

        self.lesson = next(lesson for unit in self.track['units'] for lesson in unit['lessons']
                           if lesson['id'] == '86e7168a-ef45-5550-a44e-18574971067a')

    def rejected(self, change, message):
        candidate = copy.deepcopy(self.fragment)
        change(candidate)

        with self.assertRaisesRegex((ValueError, ValidationError), message):
            validate_fragment(candidate, self.lesson)

    def test_example_is_valid_but_not_a_complete_lesson(self):
        validate_fragment(self.fragment, self.lesson)

        with self.assertRaisesRegex(ValueError, 'levels 1..10'):
            validate_fragment(self.fragment, self.lesson, require_complete_bank=True)

    def test_skill_from_another_lesson_is_rejected(self):
        self.rejected(lambda v: v['postStudyQuestions'][0].update(skillCode='n5_particle_mo'),
                      'not owned by this lesson')

    def test_grammar_block_cannot_claim_a_non_grammar_skill(self):
        lesson = copy.deepcopy(self.lesson)
        lesson['skills'][2]['skillType'] = 'VOCABULARY'

        with self.assertRaisesRegex(ValueError, 'Not a grammar skill'):
            validate_fragment(self.fragment, lesson)

    def test_both_locales_are_required_for_this_workflow(self):
        self.rejected(lambda v: v['contentBlocks'][0]['localizations'].pop('id'),
                      'Both en/id')

    def test_plain_and_html_prompts_cannot_disagree(self):
        self.rejected(lambda v: v['postStudyQuestions'][0]['promptPayload'].update(
            sentenceTemplate='（ていねいなかたち）あしたはあめ___。'), 'prompt mismatch')

    def test_no_publishing_from_a_draft(self):
        def publish_question(candidate):
            question = candidate['postStudyQuestions'][0]
            question['isPublished'] = True
            question['localizations']['en']['isPublished'] = True

        self.rejected(publish_question, 'unpublished')

    def test_stale_localization_is_rejected(self):
        self.rejected(lambda v: v['contentBlocks'][0].update(contentRevision=2),
                      'sourceRevision')

    def test_html_event_handler_is_rejected(self):
        self.rejected(lambda v: v['contentBlocks'][0]['localizations']['id'].update(
            body='<p onclick="alert(1)">Gunakan bentuk lampau.</p>'), 'Unsupported HTML attributes')

    def test_bank_cannot_repeat_a_difficulty_under_a_new_id(self):
        candidate = copy.deepcopy(self.fragment)
        question = copy.deepcopy(candidate['postStudyQuestions'][0])

        question.update(id=str(uuid.uuid5(uuid.NAMESPACE_URL, 'test-draft-question-2')), sortOrder=2)
        candidate['postStudyQuestions'].append(question)

        with self.assertRaisesRegex(ValueError, 'Duplicate difficultyLevel'):
            validate_fragment(candidate, self.lesson)

    def test_owner_ids_cannot_collide_across_arrays(self):
        self.rejected(lambda v: v['postStudyQuestions'][0].update(id=v['contentBlocks'][0]['id']),
                      'Duplicate owner ID')


if __name__ == '__main__':
    unittest.main()
