#!/usr/bin/env python3
"""Prepare TD-006 manifests and seed artifacts without writing the database."""

import argparse
import gzip
import hashlib
import json
import subprocess
import sys
from pathlib import Path

from prepare_distractor_expansion import ASSIGNMENT, DRAFT, ROOT


PROVENANCE_REFS = [
    'docs/syllabus/flashcards/distractor-expansion.md',
    'content/flashcards/drafts/distractor-expansion-01/curation.json',
    'content/flashcards/drafts/distractor-expansion-01/proposals.json',
    'content/flashcards/drafts/distractor-expansion-01/review.md',
    'content/flashcards/drafts/distractor-expansion-01/review.json',
]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def encode(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def compile_payloads(snapshot, assignment, proposals):
    vocabulary = json.loads(snapshot['vocabulary-foundation.json'])
    overlay = json.loads(snapshot['localizations.v2.json'])
    rows = {row['itemId']: row['candidateItemIds'] for row in proposals['items']}
    active = {item['id'] for item in vocabulary['items'] if item['isActive']}

    if set(rows) != active or len(rows) != len(proposals['items']):
        raise ValueError('Proposal scope must match each active vocabulary item exactly once.')

    for item in vocabulary['items']:
        if item['isActive']:
            item['answerOptionPayload']['reviewedDistractorPoolItemIds'] = rows[item['id']]

    overlay['contentRevision'] = assignment['targetContentRevision']
    overlay['translationRevision'] = assignment['targetTranslationRevision']
    overlay['sourceRefs'] = list(dict.fromkeys([*overlay.get('sourceRefs', []), *PROVENANCE_REFS]))

    return {
        'vocabulary-foundation.json': encode(vocabulary),
        'localizations.v2.json': encode(overlay),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--preview', action='store_true', help='Write an explicitly unreviewed preview only.')
    mode.add_argument('--reviewed', action='store_true', help='Require full review and compile seed artifacts.')
    parser.add_argument('--output-dir', type=Path, required=True, help='New output directory, outside active seed.')
    args = parser.parse_args()

    output = args.output_dir.resolve()
    active = (ROOT / 'content/flashcards/system-decks').resolve()

    if output == active or active in output.parents or output in active.parents:
        parser.error('output directory must not contain or be inside the active seed directory')

    command = [sys.executable, str(ROOT / 'scripts/flashcards/validate_distractor_expansion.py')]
    if args.reviewed:
        command.append('--require-reviewed')

    subprocess.run(command, cwd=ROOT, check=True)

    if args.reviewed:
        subprocess.run(
            [
                'bun',
                'scripts/flashcards/audit_distractor_expansion.ts',
                '--all-active',
                '--reviewed',
            ],
            cwd=ROOT,
            check=True,
        )

    assignment = json.loads(ASSIGNMENT.read_text())
    for baseline in assignment['baselines']:
        actual = (ROOT / baseline['path']).read_bytes()
        if digest(actual) != baseline['sha256']:
            raise ValueError(f"Active baseline changed: {baseline['path']}")

    curation_path = DRAFT / 'curation.json'
    proposals_path = DRAFT / 'proposals.json'
    proposals = json.loads(proposals_path.read_text())

    manifest = {
        'manifestFormat': 'kotoba-distractor-expansion-manifest-v1',
        'taskId': 'TD-006',
        'reviewStatus': 'READY_FOR_INTEGRATION' if args.reviewed else 'REVIEW_INCOMPLETE',
        'integrationStatus': 'AWAITING_DATABASE_VALIDATION' if args.reviewed else 'NOT_READY',
        'isPublished': False,
        'assignmentSha256': digest(ASSIGNMENT.read_bytes()),
        'exclusionsSha256': digest((DRAFT / 'exclusions.json').read_bytes()),
        'curationSha256': digest(curation_path.read_bytes()),
        'proposalsSha256': digest(proposals_path.read_bytes()),
        'baselineArchive': assignment['baselineArchive'],
        'rawSource': assignment['source'],
        'targetContentRevision': assignment['targetContentRevision'],
        'targetTranslationRevision': assignment['targetTranslationRevision'],
        'itemCount': len(proposals['items']),
        'items': [
            {
                'itemId': row['itemId'],
                ('reviewedDistractorPoolItemIds' if args.reviewed else 'candidateItemIds'):
                    row['candidateItemIds'],
            }
            for row in proposals['items']
        ],
    }

    files = {}
    if args.reviewed:
        snapshot = json.loads(gzip.decompress((ROOT / assignment['baselineArchive']['path']).read_bytes()))
        files = compile_payloads(snapshot, assignment, proposals)
        manifest['reviewSha256'] = digest((DRAFT / 'review.json').read_bytes())
        manifest['reviewReportSha256'] = digest((DRAFT / 'review.md').read_bytes())
        manifest['seedArtifacts'] = {name: digest(data) for name, data in files.items()}

    files['manifest.json'] = encode(manifest)

    output.mkdir(parents=True, exist_ok=True)
    if any((output / name).exists() for name in files):
        raise FileExistsError('Output file already exists; choose an empty output directory.')

    for name, data in files.items():
        (output / name).write_bytes(data)

    result = {
        'reviewStatus': manifest['reviewStatus'],
        'integrationStatus': manifest['integrationStatus'],
        'outputDirectory': str(output),
        'files': sorted(files),
        'items': manifest['itemCount'],
    }

    print(json.dumps(result))


if __name__ == '__main__':
    main()
