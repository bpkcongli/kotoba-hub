#!/usr/bin/env python3
"""Render TD-006 proposed pairs for editorial inspection, without approving them."""

import argparse
import csv
import json
import sys

from prepare_distractor_expansion import DRAFT


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--start', type=int, default=0, help='First zero-based item index.')
    parser.add_argument('--limit', type=int, default=None, help='Maximum number of target items.')
    args = parser.parse_args()

    if args.start < 0 or (args.limit is not None and args.limit < 1):
        parser.error('start must be nonnegative and limit must be positive')

    curation = json.loads((DRAFT / 'curation.json').read_text())
    proposals = json.loads((DRAFT / 'proposals.json').read_text())
    index = {item['itemId']: item for item in curation['items']}
    stop = None if args.limit is None else args.start + args.limit

    writer = csv.writer(sys.stdout, delimiter='\t', lineterminator='\n')
    writer.writerow([
        'target_id',
        'target_japanese',
        'target_kana',
        'target_en',
        'target_id_meaning',
        'target_tags',
        'peer_id',
        'peer_japanese',
        'peer_kana',
        'peer_en',
        'peer_id_meaning',
        'peer_tags',
    ])

    for row in proposals['items'][args.start:stop]:
        target = index[row['itemId']]

        for peer_id in row['candidateItemIds']:
            peer = index[peer_id]
            writer.writerow([
                target['itemId'],
                target['surfaceFormText'],
                target['kanaDisplayText'],
                target['meaningEn'],
                target['meaningId'] or '(English fallback)',
                ', '.join(target['tags']),
                peer['itemId'],
                peer['surfaceFormText'],
                peer['kanaDisplayText'],
                peer['meaningEn'],
                peer['meaningId'],
                ', '.join(peer['tags']),
            ])


if __name__ == '__main__':
    main()
