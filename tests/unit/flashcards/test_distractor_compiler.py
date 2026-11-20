import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts/flashcards'))

from scripts.flashcards.compile_distractor_expansion import compile_payloads  # noqa: E402


class DistractorCompilerTest(unittest.TestCase):
    def setUp(self):
        self.snapshot = {
            'vocabulary-foundation.json': json.dumps({
                'items': [
                    {'id': 'active', 'isActive': True, 'answerOptionPayload': {'canonical': 'pencil'}},
                    {'id': 'old', 'isActive': False, 'answerOptionPayload': {'canonical': 'retired'}},
                ],
                'deckItems': [{'itemId': 'active'}],
            }),
            'localizations.v2.json': json.dumps({
                'contentRevision': 4, 'translationRevision': 4,
                'sourceRefs': ['existing-source'], 'items': {'active': {'id': 'pensil'}},
            }),
        }
        self.assignment = {'targetContentRevision': 5, 'targetTranslationRevision': 5}
        self.proposals = {'items': [{'itemId': 'active', 'candidateItemIds': ['peer-a', 'peer-b']}]}

    def test_compilation_preserves_identity_history_and_other_fields(self):
        files = compile_payloads(self.snapshot, self.assignment, self.proposals)
        vocabulary = json.loads(files['vocabulary-foundation.json'])
        overlay = json.loads(files['localizations.v2.json'])

        self.assertEqual(vocabulary['items'][0]['answerOptionPayload'],
                         {'canonical': 'pencil', 'reviewedDistractorPoolItemIds': ['peer-a', 'peer-b']})
        self.assertEqual(vocabulary['items'][1], json.loads(self.snapshot['vocabulary-foundation.json'])['items'][1])
        self.assertEqual(vocabulary['deckItems'], [{'itemId': 'active'}])
        self.assertEqual(overlay['items'], {'active': {'id': 'pensil'}})
        self.assertEqual((overlay['contentRevision'], overlay['translationRevision']), (5, 5))
        self.assertEqual(overlay['sourceRefs'][0], 'existing-source')
        self.assertIn('content/flashcards/drafts/distractor-expansion-01/review.json',
                      overlay['sourceRefs'])
        self.assertEqual(len(overlay['sourceRefs']), len(set(overlay['sourceRefs'])))

    def test_missing_or_duplicate_active_items_are_rejected(self):
        for rows in ([], self.proposals['items'] * 2):
            with self.assertRaisesRegex(ValueError, 'scope'):
                compile_payloads(self.snapshot, self.assignment, {'items': rows})

    def test_reviewed_compilation_refuses_missing_review_before_writing(self):
        if (ROOT / 'content/flashcards/drafts/distractor-expansion-01/review.json').exists():
            self.skipTest('An editorial review is now present; this test covers the pre-review state.')

        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / 'manifest-output'

            result = subprocess.run([sys.executable, str(ROOT / 'scripts/flashcards/compile_distractor_expansion.py'),
                                     '--reviewed', '--output-dir', str(output)],
                                    cwd=ROOT, capture_output=True, text=True)

            self.assertNotEqual(result.returncode, 0)
            self.assertIn('Independent editorial review artifact is missing', result.stderr)
            self.assertFalse(output.exists())


if __name__ == '__main__':
    unittest.main()
