#!/usr/bin/env python3
"""Generate unpublished TD-006 candidate pools for editorial review; never write seed."""

import argparse
import gzip
import hashlib
import html
import json
import re
import unicodedata
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DRAFT = ROOT / 'content/flashcards/drafts/distractor-expansion-01'
ASSIGNMENT = DRAFT / 'assignment.json'
STOPWORDS = {
    'a', 'an', 'the', 'to', 'of', 'in', 'on', 'for', 'at', 'or', 'and', 'is',
    'be', 'one', 'some', 'something', 'someone', 'that', 'this', 'yang',
    'untuk', 'dari', 'atau', 'dan', 'di', 'ke', 'suatu', 'sebuah',
}


def read(path):
    return json.loads(path.read_text())


def checksum(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def normalize(value):
    return ' '.join(unicodedata.normalize('NFKC', value).casefold().split())


def tokens(value):
    return {
        token
        for token in re.findall(r'[^\W_]+', normalize(value), re.UNICODE)
        if len(token) > 2 and token not in STOPWORDS
    }


def gloss_keys(glosses):
    keys = set()
    for gloss in glosses:
        for value in (gloss, re.sub(r'\([^)]*\)', '', gloss)):
            value = re.sub(r'^(?:to|a|an|the)\s+', '', normalize(value))
            value = ' '.join(re.sub(r'[^\w\s]', ' ', value).split())
            if value:
                keys.add(value)
    return keys


def category(parts):
    value = (parts[0] if parts else '').lower()
    if 'adjectiv' in value:
        return 'adjective'
    if 'adverb' in value:
        return 'adverb'
    if 'verb' in value:
        return 'verb'
    if 'pronoun' in value:
        return 'pronoun'
    if 'numeric' in value or 'counter' in value:
        return 'number-or-counter'
    if 'noun' in value:
        return 'noun'
    if 'conjunction' in value:
        return 'conjunction'
    return 'expression-or-other'


def aliases(item):
    return {
        mode: {normalize(value) for value in values}
        for mode, values in item['answerOptionPayload']['canonicalAnswers'].items()
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--force', action='store_true',
                        help='Replace existing candidate drafts; any prior review must be repeated.')
    args = parser.parse_args()

    if not args.force and any((DRAFT / name).exists() for name in ('curation.json', 'proposals.json')):
        parser.error('draft files already exist; use --force only when replacement is intended')

    assignment = read(ASSIGNMENT)
    archive = ROOT / assignment['baselineArchive']['path']
    source_path = ROOT / assignment['source']['path']
    catalog_path = ROOT / assignment['catalogSource']['path']

    assert checksum(archive) == assignment['baselineArchive']['sha256'], 'Baseline archive drift'
    assert checksum(source_path) == assignment['source']['sha256'], 'JMdict source drift'
    assert checksum(catalog_path) == assignment['catalogSource']['sha256'], 'Catalog source drift'

    snapshot = json.loads(gzip.decompress(archive.read_bytes()))
    for baseline in assignment['baselines']:
        value = snapshot[Path(baseline['path']).name].encode()
        assert hashlib.sha256(value).hexdigest() == baseline['sha256'], 'Baseline file drift'

    artifact = json.loads(snapshot['vocabulary-foundation.json'])
    overlay = json.loads(snapshot['localizations.v2.json'])
    manifest = json.loads(snapshot['manifest.v2.json'])
    exclusions_path = DRAFT / 'exclusions.json'
    exclusions = read(exclusions_path)

    assert not exclusions['isPublished'], 'Exclusions must remain draft metadata'

    excluded_pairs = {frozenset(entry['itemIds']) for entry in exclusions['pairs']}
    syllabus = read(catalog_path)
    published_skills = {
        skill['id']
        for unit in syllabus['track']['units']
        if unit['isPublished']
        for lesson in unit['lessons']
        if lesson['isPublished']
        for skill in lesson['skills']
        if skill['isPublished'] and skill['supportsFlashcards']
    }
    group_tags = {
        member['itemId']: group['localizations']['en']['title']
        for group in manifest['groups']
        for member in group['items']
    }
    assigned = [item for item in artifact['items'] if item['isActive']]

    assert [item['id'] for item in assigned] == assignment['scope'], 'Scope drift'

    required_sequences = {
        next(ref['externalId'] for ref in item['sourceRefs'] if ref['provider'] == 'JMDICT')
        for item in assigned
    }
    raw = gzip.open(source_path, 'rt').read()
    entries = {}

    for match in re.finditer(r'<entry>.*?</entry>', raw, re.S):
        block = match.group()
        sequence = re.search(r'<ent_seq>(\d+)</ent_seq>', block).group(1)
        if sequence in required_sequences:
            entries[sequence] = block

    assert set(entries) == required_sequences, 'Missing raw dictionary entries'

    inventory = []
    for item in assigned:
        sequence = next(ref['externalId'] for ref in item['sourceRefs'] if ref['provider'] == 'JMDICT')
        eligible = item['mappingStatus'] == 'PENDING_LESSON_MAPPING' or item['skillId'] in published_skills
        localization = overlay['items'].get(item['id'])
        thematic = group_tags.get(item['id']) or item.get('lessonSlug') or item.get('unitSlug') or 'unclassified'
        pos = category(item.get('partsOfSpeech', []))

        if pos in ('adverb', 'expression-or-other') and re.search(
                r'greeting|conversation|discourse', thematic, re.IGNORECASE):
            pos = 'expression-or-other'

        inventory.append({
            'itemId': item['id'],
            'entSeq': sequence,
            'tags': [f'theme:{thematic}', f'part-of-speech:{pos}'],
            'runtimeEligible': eligible,
            'surfaceFormText': item['surfaceFormText'],
            'kanaDisplayText': item['kanaDisplayText'],
            'canonicalAnswers': item['answerOptionPayload']['canonicalAnswers'],
            'meaningEn': localization['en'] if localization else item['englishMeaning'],
            'meaningId': localization['id'] if localization else None,
            'sourceGlossesEn': sorted({
                normalize(html.unescape(gloss))
                for gloss in re.findall(r'<gloss(?: [^>]*)?>(.*?)</gloss>', entries[sequence])
            }),
            'sourceEntrySha256': hashlib.sha256(entries[sequence].encode()).hexdigest(),
        })

    by_id = {item['id']: item for item in assigned}
    index = {item['itemId']: item for item in inventory}
    gloss_index = {item['itemId']: gloss_keys(item['sourceGlossesEn']) for item in inventory}
    peers = [item for item in inventory if item['runtimeEligible'] and item['meaningId']]

    def conflicts(target, peer):
        if target['itemId'] == peer['itemId'] or target['entSeq'] == peer['entSeq']:
            return 'same identity or dictionary entry'

        if frozenset((target['itemId'], peer['itemId'])) in excluded_pairs:
            return 'editorially excluded pair'

        if gloss_index[target['itemId']] & gloss_index[peer['itemId']]:
            return 'shared JMdict gloss across senses'

        a, b = aliases(by_id[target['itemId']]), aliases(by_id[peer['itemId']])
        if any(a.get(mode, set()) & b.get(mode, set()) for mode in set(a) | set(b)):
            return 'shared canonical alias'

        if target['meaningId'] and normalize(target['meaningId']) == normalize(peer['meaningId']):
            return 'same Indonesian meaning'

        meaning_pairs = [
            (
                ' '.join(a.get('ENGLISH', [])) + ' ' + (target['meaningEn'] or ''),
                ' '.join(b.get('ENGLISH', [])) + ' ' + (peer['meaningEn'] or ''),
            ),
            (target['meaningId'] or '', peer['meaningId'] or ''),
        ]
        if any(tokens(left) & tokens(right) for left, right in meaning_pairs):
            return 'possible meaning overlap'

        return None

    proposals = []
    for target in inventory:
        candidates = []
        for peer in peers:
            if conflicts(target, peer):
                continue

            tie = hashlib.sha256((target['itemId'] + peer['itemId']).encode()).hexdigest()
            candidates.append((
                target['tags'][1] != peer['tags'][1],
                target['tags'][0] != peer['tags'][0],
                tie,
                peer,
            ))

        candidates.sort(key=lambda row: row[:3])

        chosen = []
        seen = {mode: set() for mode in ('JAPANESE', 'KANA', 'ENGLISH', 'MEANING_EN', 'MEANING_ID')}

        for _, _, _, peer in candidates:
            a = peer['canonicalAnswers']
            values = {
                'JAPANESE': a.get('JAPANESE', [''])[0],
                'KANA': a.get('KANA', [''])[0],
                'ENGLISH': a.get('ENGLISH', [''])[0],
                'MEANING_EN': peer['meaningEn'],
                'MEANING_ID': peer['meaningId'],
            }

            if any(not value or normalize(value) in seen[mode] for mode, value in values.items()):
                continue

            for mode, value in values.items():
                seen[mode].add(normalize(value))

            chosen.append(peer['itemId'])
            if len(chosen) == 6:
                break

        proposals.append({
            'itemId': target['itemId'],
            'candidateItemIds': chosen,
            'status': 'REVIEW_REQUIRED',
            'isPublished': False,
        })

    curation = {
        'draftFormat': 'kotoba-distractor-curation-v1',
        'taskId': 'TD-006',
        'isPublished': False,
        'assignmentSha256': checksum(ASSIGNMENT),
        'exclusionsSha256': checksum(exclusions_path),
        'source': assignment['source'],
        'items': inventory,
        'sourceEntries': entries,
        'heldItems': [],
        'note': 'Tags are candidate-selection metadata, not proof of semantic safety.',
    }
    curation_path = DRAFT / 'curation.json'

    curation_path.write_text(json.dumps(curation, ensure_ascii=False, indent=2) + '\n')

    draft = {
        'draftFormat': 'kotoba-distractor-proposal-v1',
        'taskId': 'TD-006',
        'isPublished': False,
        'curationSha256': checksum(curation_path),
        'reviewStatus': 'REVIEW_INCOMPLETE',
        'items': proposals,
        'heldItems': [
            entry['itemId']
            for entry in proposals
            if len(entry['candidateItemIds']) < 6
        ],
    }

    (DRAFT / 'proposals.json').write_text(json.dumps(draft, ensure_ascii=False, indent=2) + '\n')

    same_theme = sum(
        any(
            index[peer]['tags'][0] == index[entry['itemId']]['tags'][0]
            for peer in entry['candidateItemIds']
        )
        for entry in proposals
    )
    summary = {
        'items': len(inventory),
        'eligiblePeers': len(peers),
        'sixCandidates': len(proposals) - len(draft['heldItems']),
        'held': len(draft['heldItems']),
        'withSameTheme': same_theme,
        'reviewStatus': draft['reviewStatus'],
    }

    print(json.dumps(summary))


if __name__ == '__main__':
    main()
