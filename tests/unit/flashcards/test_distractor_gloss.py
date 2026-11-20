import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts/flashcards'))

from scripts.flashcards.prepare_distractor_expansion import category, gloss_keys  # noqa: E402


class GlossKeysTest(unittest.TestCase):
    def test_optional_qualifier_cannot_hide_a_shared_gloss(self):
        shared = gloss_keys(['(hard) candy']) & gloss_keys(['candy', 'sweets'])

        self.assertIn('candy', shared)

    def test_leading_verb_marker_is_normalized_without_dropping_direction(self):
        shared_loan = gloss_keys(['to loan']) & gloss_keys(['loan'])
        shared_rent = gloss_keys(['to rent out']) & gloss_keys(['to rent'])

        self.assertIn('loan', shared_loan)
        self.assertFalse(shared_rent)

    def test_distinct_glosses_are_not_collapsed(self):
        shared = gloss_keys(['dog']) & gloss_keys(['cat'])

        self.assertFalse(shared)

    def test_primary_part_of_speech_is_not_replaced_by_secondary_adverb(self):
        noun = category(['noun (common)', 'adverb (fukushi)'])
        pronoun = category(['pronoun', 'adverb (fukushi)'])
        expression = category(['expressions (phrases)', 'adverb (fukushi)'])
        adverb = category([
            'adverb (fukushi)',
            'noun or participle which takes the aux. verb suru',
        ])

        self.assertEqual(noun, 'noun')
        self.assertEqual(pronoun, 'pronoun')
        self.assertEqual(expression, 'expression-or-other')
        self.assertEqual(adverb, 'adverb')


if __name__ == '__main__':
    unittest.main()
