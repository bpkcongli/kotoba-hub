#!/usr/bin/env python3
"""Validate TD-006 draft integrity and require an independent review for integration."""

import argparse
import gzip
import hashlib
import html
import json
import re
import sys
from collections import Counter
from pathlib import Path

from prepare_distractor_expansion import ASSIGNMENT, DRAFT, ROOT, gloss_keys, normalize


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--require-reviewed', action='store_true',
                        help='Reject incomplete editorial review; required before integration.')
    args = parser.parse_args()

    assignment = json.loads(ASSIGNMENT.read_text())
    curation_path = DRAFT / 'curation.json'
    proposal_path = DRAFT / 'proposals.json'
    exclusion_path = DRAFT / 'exclusions.json'
    curation = json.loads(curation_path.read_text())
    proposals = json.loads(proposal_path.read_text())

    require(not curation['isPublished'] and not proposals['isPublished'], 'Draft must remain unpublished.')
    require(curation['assignmentSha256'] == sha(ASSIGNMENT), 'Assignment changed since curation.')
    require(curation['exclusionsSha256'] == sha(exclusion_path), 'Exclusions changed since curation.')

    exclusions = json.loads(exclusion_path.read_text())
    require(not exclusions['isPublished'], 'Exclusions must remain draft metadata.')
    require(proposals['curationSha256'] == sha(curation_path), 'Curation changed since proposal.')

    require(
        sha(ROOT / assignment['baselineArchive']['path']) == assignment['baselineArchive']['sha256'],
        'Baseline archive drift.',
    )
    require(sha(ROOT / assignment['source']['path']) == assignment['source']['sha256'], 'Source drift.')
    require(
        sha(ROOT / assignment['catalogSource']['path']) == assignment['catalogSource']['sha256'],
        'Catalog source drift.',
    )

    snapshot = json.loads(gzip.decompress((ROOT / assignment['baselineArchive']['path']).read_bytes()))
    for entry in assignment['baselines']:
        raw_baseline = snapshot[Path(entry['path']).name].encode()
        require(hashlib.sha256(raw_baseline).hexdigest() == entry['sha256'], 'Baseline file drift.')

    original = {item['id']: item for item in json.loads(snapshot['vocabulary-foundation.json'])['items']}
    overlay = json.loads(snapshot['localizations.v2.json'])['items']
    syllabus = json.loads((ROOT / assignment['catalogSource']['path']).read_text())
    published_skills = {
        skill['id']
        for unit in syllabus['track']['units']
        if unit['isPublished']
        for lesson in unit['lessons']
        if lesson['isPublished']
        for skill in lesson['skills']
        if skill['isPublished'] and skill['supportsFlashcards']
    }

    raw = gzip.open(ROOT / assignment['source']['path'], 'rt').read()
    entries = {}

    for match in re.finditer(r'<entry>.*?</entry>', raw, re.S):
        block = match.group()
        sequence = re.search(r'<ent_seq>(\d+)</ent_seq>', block).group(1)
        if sequence in curation['sourceEntries']:
            entries[sequence] = block

    require(entries == curation['sourceEntries'], 'JMdict source excerpts do not match raw snapshot.')

    inventory = {item['itemId']: item for item in curation['items']}
    require(
        len(inventory) == len(curation['items']) and set(inventory) == set(assignment['scope']),
        'Curation scope is missing or duplicates items.',
    )

    excluded_pairs = set()
    for exclusion in exclusions['pairs']:
        pair = exclusion['itemIds']
        require(
            len(pair) == 2
            and len(set(pair)) == 2
            and set(pair) <= set(inventory)
            and exclusion.get('reason')
            and exclusion.get('source'),
            'Invalid editorial exclusion.',
        )
        excluded_pairs.add(frozenset(pair))

    require(len(excluded_pairs) == len(exclusions['pairs']), 'Duplicate editorial exclusion.')

    rows = {item['itemId']: item for item in proposals['items']}
    require(
        len(rows) == len(proposals['items']) and set(rows) == set(inventory),
        'Proposal scope is missing or duplicates items.',
    )

    usage = Counter()
    for item_id, row in rows.items():
        item = inventory[item_id]
        baseline = original[item_id]

        require(baseline['isActive'], f'Inactive item in draft: {item_id}.')

        seq = next(ref['externalId'] for ref in baseline['sourceRefs'] if ref['provider'] == 'JMDICT')
        require(
            item['entSeq'] == seq
            and item['surfaceFormText'] == baseline['surfaceFormText']
            and item['kanaDisplayText'] == baseline['kanaDisplayText']
            and item['canonicalAnswers'] == baseline['answerOptionPayload']['canonicalAnswers'],
            f'Baseline lexical content changed: {item_id}.',
        )

        localized = overlay.get(item_id)
        require(
            item['meaningEn'] == (localized['en'] if localized else baseline['englishMeaning'])
            and item['meaningId'] == (localized['id'] if localized else None),
            f'Baseline meaning changed: {item_id}.',
        )
        require(
            item['runtimeEligible'] == (
                baseline['mappingStatus'] == 'PENDING_LESSON_MAPPING'
                or baseline['skillId'] in published_skills
            ),
            f'Catalog eligibility changed: {item_id}.',
        )

        source = curation['sourceEntries'][item['entSeq']]
        require(
            hashlib.sha256(source.encode()).hexdigest() == item['sourceEntrySha256'],
            f'Raw source excerpt changed: {item_id}.',
        )
        source_glosses = sorted({
            normalize(html.unescape(gloss))
            for gloss in re.findall(r'<gloss(?: [^>]*)?>(.*?)</gloss>', source)
        })

        require(item['sourceGlossesEn'] == source_glosses, f'Raw gloss index changed: {item_id}.')
        require(item['tags'] and not row['isPublished'], f'Invalid draft tags or publication: {item_id}.')

        candidates = row['candidateItemIds']
        require(
            len(candidates) >= 6 and len(set(candidates)) == len(candidates),
            f'Fewer than six unique peer IDs: {item_id}.',
        )

        values = {mode: set() for mode in ('JAPANESE', 'KANA', 'ENGLISH', 'MEANING_EN', 'MEANING_ID')}
        for peer_id in candidates:
            require(peer_id in inventory and peer_id != item_id, f'Invalid peer: {item_id}/{peer_id}.')

            peer = inventory[peer_id]
            require(
                frozenset((item_id, peer_id)) not in excluded_pairs,
                f'Editorially excluded pair proposed: {item_id}/{peer_id}.',
            )
            require(peer['runtimeEligible'] and peer['meaningId'], f'Ineligible peer: {item_id}/{peer_id}.')
            require(item['entSeq'] != peer['entSeq'], f'Same dictionary identity: {item_id}/{peer_id}.')
            require(
                not gloss_keys(item['sourceGlossesEn']) & gloss_keys(peer['sourceGlossesEn']),
                f'Shared dictionary gloss: {item_id}/{peer_id}.',
            )

            aliases = item['canonicalAnswers']
            for mode, accepted in aliases.items():
                other = peer['canonicalAnswers'].get(mode, [])
                require(
                    not {normalize(value) for value in accepted}
                    & {normalize(value) for value in other},
                    f'Shared {mode} alias: {item_id}/{peer_id}.',
                )

            if item['meaningId']:
                require(
                    normalize(item['meaningId']) != normalize(peer['meaningId']),
                    f'Shared Indonesian meaning: {item_id}/{peer_id}.',
                )

            for mode in ('JAPANESE', 'KANA', 'ENGLISH'):
                answer = peer['canonicalAnswers'].get(mode, [])
                require(bool(answer), f'Missing {mode} answer: {peer_id}.')
                values[mode].add(normalize(answer[0]))

            values['MEANING_EN'].add(normalize(peer['meaningEn']))
            values['MEANING_ID'].add(normalize(peer['meaningId']))
            usage[peer_id] += 1

        require(all(len(bank) >= 6 for bank in values.values()), f'Duplicate option values: {item_id}.')

    require(not proposals['heldItems'], 'Draft has unresolved undersized pools.')

    review_path = DRAFT / 'review.json'
    if args.require_reviewed:
        require(review_path.exists(), 'Independent editorial review artifact is missing.')

        review = json.loads(review_path.read_text())
        require(review.get('verdict') == 'READY_FOR_INTEGRATION', 'Editorial review is incomplete.')
        require(
            review.get('author')
            and review.get('independentReviewer')
            and review['independentReviewer'] != review['author'],
            'Independent reviewer is missing.',
        )
        require(
            review.get('curationSha256') == sha(curation_path)
            and review.get('proposalsSha256') == sha(proposal_path),
            'Review does not bind exact draft.',
        )

        report_path = DRAFT / 'review.md'
        require(
            report_path.exists() and review.get('reviewReportSha256') == sha(report_path),
            'Review does not bind the independent narrative report.',
        )
        require(
            assignment['source']['path'] in review.get('rawSourcesInspected', []),
            'Review does not identify the raw JMdict source.',
        )

        item_reviews = {item['itemId']: item for item in review.get('itemReviews', [])}
        require(
            len(item_reviews) == len(review.get('itemReviews', []))
            and set(item_reviews) == set(rows),
            'Review does not cover every item exactly once.',
        )

        for item_id, checked in item_reviews.items():
            require(checked.get('verdict') == 'READY', f'Item review is incomplete: {item_id}.')
            required_pairs = {
                'legacy:JAPANESE>ENGLISH',
                'legacy:ENGLISH>JAPANESE',
                'legacy:ENGLISH>KANA',
                'en:JAPANESE>MEANING',
                'en:MEANING>JAPANESE',
                'en:MEANING>KANA',
            }

            if inventory[item_id]['meaningId']:
                required_pairs.update({
                    'id:JAPANESE>MEANING',
                    'id:MEANING>JAPANESE',
                    'id:MEANING>KANA',
                })

            require(
                required_pairs <= set(checked.get('checkedPairs', [])),
                f'Script/locale review is incomplete: {item_id}.',
            )

            peers = checked.get('peerReviews', [])
            peer_reviews = {peer['itemId']: peer for peer in peers}
            require(
                len(peer_reviews) == len(peers)
                and set(peer_reviews) == set(rows[item_id]['candidateItemIds']),
                f'Peer review coverage is incomplete: {item_id}.',
            )

            for peer_id, peer in peer_reviews.items():
                require(
                    peer.get('verdict') == 'SAFE'
                    and isinstance(peer.get('reason'), str)
                    and peer['reason'].strip(),
                    f'Peer review evidence is incomplete: {item_id}/{peer_id}.',
                )

        require(not review.get('heldItems'), 'Review contains held items.')

    result = {
        'items': len(rows),
        'peerReferences': sum(usage.values()),
        'distinctPeers': len(usage),
        'maximumPeerFrequency': max(usage.values()),
        'editorialReview': 'REQUIRED' if not args.require_reviewed else 'READY_FOR_INTEGRATION',
        'mechanicalChecksOnly': not args.require_reviewed,
    }

    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except (KeyError, ValueError, AssertionError) as error:
        print(str(error), file=sys.stderr)
        raise SystemExit(1) from error
