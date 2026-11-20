#!/usr/bin/env python3
"""Audit VOC-03 identity corrections and generate the pre-promotion bootstrap manifest."""

import argparse
import copy
import csv
import gzip
import hashlib
import io
import json
import re
import uuid
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BATCH = ROOT / 'content/flashcards/drafts/voc-03-batch-03'


def read(path):
    return json.loads(Path(path).read_text())


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def require(value, message):
    if not value:
        raise ValueError(message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--draft-only', action='store_true')
    parser.add_argument('--write-bootstrap', type=Path,
                        help='Write a temporary manifest excluding the four new identities. Never use after their promotion.')

    args = parser.parse_args()

    curation = read(BATCH / 'curation.json')
    content = read(BATCH / 'content.json')
    assignment = read(BATCH / 'assignment.json')
    archive = curation['baselineArchive']

    require(sha(ROOT / archive['path']) == archive['sha256'], 'Baseline archive drift.')

    snapshots = json.loads(gzip.decompress((ROOT / archive['path']).read_bytes()))

    for baseline in assignment['baselines']:
        name = Path(baseline['path']).name
        checksum = (hashlib.sha256(snapshots[name].encode()).hexdigest()
                    if name in snapshots else sha(ROOT / baseline['path']))

        require(checksum == baseline['sha256'], 'Baseline/source drift: ' + name)

    require(curation['baselines'] == assignment['baselines'], 'Curation baseline mismatch.')

    for reference in [curation['assignment'], content['curation']]:
        require(sha(ROOT / reference['path']) == reference['sha256'], 'Handoff hash drift.')

    before = json.loads(snapshots['vocabulary-foundation.json'])
    before_items = {item['id']: item for item in before['items']}
    resolutions = curation['resolutions']
    retired = {item['oldItemId'] for item in resolutions}

    require(len(resolutions) == len(retired) == 7 and retired == set(assignment['assignedItemIds']),
            'Retirement coverage differs from assignment.')

    targets = {item['itemId']: item for item in curation['items']}
    authored = {item['itemId']: item for item in content['items']}

    require(len(targets) == len(authored) == 7 and set(targets) == set(authored), 'Target coverage gap.')
    require(set(targets) == {entry['targetItemId'] for entry in resolutions}, 'Resolution target drift.')
    require(not curation['isPublished'] and not content['isPublished'] and not curation['heldItems'],
            'Draft boundary or unresolved hold.')

    raw = gzip.open(ROOT / assignment['baselines'][4]['path'], 'rt').read()
    entries = {re.search(r'<ent_seq>(\d+)</ent_seq>', block)[1]: block
               for block in re.findall(r'<entry>.*?</entry>', raw, re.S)}

    with zipfile.ZipFile(ROOT / assignment['baselines'][5]['path']) as archive_file:
        rows = archive_file.read('yomitan-jlpt-vocab-main/original_data/n5.csv').decode().splitlines()

    for seq, block in curation['sourceEntries'].items():
        require(entries[seq] == block, 'Raw XML drift: ' + seq)

    require(set(curation['sourceEntries']) == {i['oldEntSeq'] for i in resolutions} |
            {i['targetEntSeq'] for i in resolutions}, 'Incomplete old/corrected raw source scope.')

    namespace = uuid.uuid5(uuid.NAMESPACE_URL,
                          'https://kotobahub.local/content/flashcards/system-decks/vocabulary-foundation')
    new_ids = set()

    for resolution in resolutions:
        old = before_items[resolution['oldItemId']]

        require(old['englishMeaning'] == resolution['oldEnglishMeaning'] and old['skillId'] is None
                and not resolution['movesUserHistory'], 'Legacy meaning/attribution changed.')
        require(any(ref.get('provider') == 'JMDICT' and ref.get('externalId') == resolution['oldEntSeq']
                    for ref in old['sourceRefs']), 'Old lexical identity drift.')

        row = resolution['overlayRow']

        require(rows[row['lineNumberOneBased'] - 1] == row['rawCsvRow'], 'CSV evidence drift.')

        values = next(csv.reader(io.StringIO(row['rawCsvRow'])))

        require(values == row['values'] and values[0] == resolution['oldEntSeq'], 'False raw CSV identity.')

        target = targets[resolution['targetItemId']]

        require(target['entSeq'] == resolution['targetEntSeq'] and target['senseEvidence']['senseOrdinals'] == [1],
                'Wrong target identity/sense.')

        if resolution['disposition'] == 'RETIRED_REPLACED':
            expected_id = str(uuid.uuid5(namespace, 'flashcard-item/vocabulary/pending-n5/' + target['entSeq']))

            require(expected_id == target['itemId'] and expected_id not in before_items, 'New ID is unstable or reused.')
            require(not target['duplicateCheck']['sameEntryItemIds'], 'New identity duplicates an existing item.')

            new_ids.add(expected_id)
        else:
            require(resolution['disposition'] == 'RETIRED_ALREADY_COVERED'
                    and before_items[target['itemId']]['skillId'] == target['runtimeMapping']['skillId']
                    and before_items[target['itemId']]['lessonSlug'] == 'ko-so-a-do-pronouns', 'Existing owner changed.')

        parsed = ET.fromstring(re.sub(r'&([\w-]+);', lambda m: m[0] if m[1] in
                                     ['amp', 'lt', 'gt', 'quot', 'apos'] else m[1], entries[target['entSeq']]))
        sense = parsed.findall('sense')[0]
        ev = target['senseEvidence']

        require(ev['selectedGlossesEn'] == [n.text for n in sense.findall('gloss')], 'Sense evidence drift.')
        require(ev['registerTags'] == [n.text for n in sense.findall('misc')], 'Usage restriction drift.')
        require(ev['restrictions']['readingForms'] == [{tag: [n.text for n in form.findall(tag)]
                    for tag in dict.fromkeys(n.tag for n in form)} for form in parsed.findall('r_ele')],
                'Reading form evidence drift.')
        require(target['kanaDisplayText'] in [n.findtext('reb') for n in parsed.findall('r_ele')], 'Unsupported reading.')

        a = authored[target['itemId']]

        require(not a['isPublished'] and a['japanese']['surfaceFormText'] == target['surfaceFormText']
                and a['japanese']['acceptedAnswers'] == {'JAPANESE': [target['surfaceFormText']],
                                                       'KANA': [target['kanaDisplayText']]}, 'Authored form drift.')

        for locale in ['en', 'id']:
            package = a['localizations'][locale]

            require(not package['isPublished'] and package['sourceRevision'] == package['translationRevision'] == 4,
                    'Draft publication/revision mismatch.')

            checks = a['optionChecks'][locale]

            require(len(checks) == 3 and {(c['fromScript'], c['toScript']) for c in checks} == {
                ('JAPANESE', 'MEANING'), ('MEANING', 'JAPANESE'), ('MEANING', 'KANA')}, 'Missing option pair.')

            for check in checks:
                answer = package['meaning'] if check['toScript'] == 'MEANING' else a['japanese']['acceptedAnswers'][check['toScript']][0]

                require(check['correctAnswer'] == answer and len(check['distractorCandidates']) == 3, 'Option answer drift.')

    require(len(new_ids) == 4, 'Expected four new identities and three existing owners.')

    if args.draft_only:
        print('VOC-03: seven source corrections and 42 authored option sets validated (draft only).')
        return

    integration = read(BATCH / 'coverage.json')

    require(integration['reviewStatus'] == 'READY_FOR_INTEGRATION' and
            sha(BATCH / 'review.md') == integration['reviewSha256'], 'Missing independent review binding.')
    require(integration['curationSha256'] == sha(BATCH / 'curation.json') and
            integration['contentSha256'] == sha(BATCH / 'content.json'), 'Reviewed handoff drift.')

    for path, checksum in integration['artifactSha256'].items():
        require(sha(ROOT / path) == checksum, 'Integrated artifact drift: ' + path)

    active = read(ROOT / assignment['baselines'][0]['path'])
    items = {item['id']: item for item in active['items']}

    require(list(items) == list(before_items) + [i['itemId'] for i in curation['items'] if i['itemId'] in new_ids],
            'Unexpected identity addition/removal/order.')

    for item_id, old in before_items.items():
        if item_id in retired:
            require(items[item_id] == {**old, 'isActive': False}, 'Retirement mutated old meaning/history identity.')
        elif item_id not in targets:
            require(items[item_id] == old, 'Unassigned canonical item changed.')
        else:
            restored = {**items[item_id], **{k: old[k] for k in
                         ['surfaceFormText', 'englishMeaning', 'answerOptionPayload', 'sourceRefs']}}

            require(restored == old, 'Existing pronoun attribution/lexical identity changed.')

    overlay = read(ROOT / assignment['baselines'][2]['path'])
    old_overlay = json.loads(snapshots['localizations.v2.json'])
    expected_packages = {item_id: {'surfaceFormText': a['japanese']['surfaceFormText'],
                                  'en': a['localizations']['en']['meaning'], 'id': a['localizations']['id']['meaning']}
                         for item_id, a in authored.items()}

    require(overlay['items'] == {**old_overlay['items'], **expected_packages} and
            overlay['contentRevision'] == overlay['translationRevision'] == 4, 'Overlay/revision drift.')

    for item_id, a in authored.items():
        item = items[item_id]

        require(item['answerOptionPayload']['canonicalAnswers'] == {**a['japanese']['acceptedAnswers'],
                'ENGLISH': [a['localizations']['en']['meaning']]}, 'Integrated answer drift.')
        require(item['answerOptionPayload']['reviewedDistractorPoolItemIds'] ==
                [peer['itemId'] for peer in a['localizations']['en']['distractorCandidates']], 'Integrated option pool drift.')

    manifest = read(ROOT / assignment['baselines'][3]['path'])
    previous = json.loads(snapshots['manifest.v2.json'])

    require(manifest['groups'][:len(previous['groups'])] == previous['groups'], 'Existing groups changed.')

    additions = manifest['groups'][len(previous['groups']):]

    require(len(additions) == 4 and {i['itemId'] for g in additions for i in g['items']} == new_ids,
            'New promotion scope drift.')
    require([g['code'] for g in additions] == [g['proposedSkillCode'] for g in curation['groups']], 'New owner drift.')

    promoted = {member['itemId'] for group in manifest['groups'] for member in group['items']}
    pending = [i['id'] for i in active['items'] if i['isActive'] and i['skillId'] is None and i['id'] not in promoted]

    require(not pending, 'Active pending vocabulary remains.')

    replacement = {r['oldItemId']: r['targetItemId'] for r in resolutions if r['targetItemId'] in new_ids}
    expected_slots = []
    changed_decks = set()

    for slot in before['deckItems']:
        row = copy.deepcopy(slot)

        if row['itemId'] in retired:
            changed_decks.add(row['deckId'])

            if row['itemId'] not in replacement:
                continue

            row['itemId'] = replacement[row['itemId']]
            row['skillCode'] = items[row['itemId']]['skillCode']

        expected_slots.append(row)

    expected_decks = copy.deepcopy(before['decks'])

    for deck in expected_decks:
        if deck['id'] not in changed_decks:
            continue

        members = [row for row in expected_slots if row['deckId'] == deck['id']]

        for order, row in enumerate(members, 1):
            row['sortOrder'] = order

        deck['itemCount'] = len(members)
        deck['description'] = re.sub(r'Contains \d+ items\.', f'Contains {len(members)} items.', deck['description'])

    require(active['deckItems'] == expected_slots and active['decks'] == expected_decks, 'Unreviewed system deck changes.')

    registry = read(ROOT / assignment['baselines'][1]['path'])
    old_registry = json.loads(snapshots['vocabulary-foundation-pending-n5-skill-codes.json'])

    require(registry['items'][:len(old_registry['items'])] == old_registry['items'] and
            len(registry['items']) == len(old_registry['items']) + 4, 'Historical registry changed.')

    if args.write_bootstrap:
        require(args.write_bootstrap.resolve() not in [(ROOT / b['path']).resolve() for b in assignment['baselines']],
                'Bootstrap must not replace a canonical artifact.')

        bootstrap = {**manifest, 'groups': manifest['groups'][:len(previous['groups'])]}

        args.write_bootstrap.write_text(json.dumps(bootstrap, ensure_ascii=False, indent=2) + '\n')

    print(json.dumps({'taskId': 'VOC-03', 'resolvedHolds': 7, 'reusedLessonItems': 3, 'newItems': 4,
                      'retiredHistoricalItems': 7, 'groups': len(manifest['groups']),
                      'promotedMembers': len(promoted), 'activePending': len(pending),
                      'reviewStatus': integration['reviewStatus']}))


if __name__ == '__main__':
    main()
