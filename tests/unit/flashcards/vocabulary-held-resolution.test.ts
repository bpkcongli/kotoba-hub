import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import type { FlashcardArtifact } from '@/backend/flashcards/application/ports/canonical-flashcard-source.port';
import type { FlashcardSeedCatalog } from '@/backend/flashcards/application/ports/flashcard-seed-catalog.port';
import { PrepareFlashcardSeedServiceImpl } from '@/backend/flashcards/application/services/impl/prepare-flashcard-seed.service.impl';
import { OptionSnapshotBuilder } from '@/backend/flashcards/domain/services/option-snapshot-builder';
import { FileCanonicalFlashcardSource } from '@/backend/flashcards/interface/secondary/seed/canonical-flashcard-source';
import { StandaloneVocabularySeed } from '@/backend/syllabus/domain/value-objects/standalone-vocabulary-seed';
import manifest from '../../../content/flashcards/vocabulary-groups/manifest.v2.json';
import syllabus from '../../../content/syllabus/v2/tracks/jlpt-n5-foundation.json';

const directory = 'content/flashcards/drafts/voc-03-batch-03';
const curation = JSON.parse(readFileSync(`${directory}/curation.json`, 'utf8')) as {
  baselineArchive: { path: string; sha256: string };
  resolutions: {
    oldItemId: string;
    targetItemId: string;
    disposition: string;
    movesUserHistory: boolean;
  }[];
  groups: { proposedSkillCode: string }[];
};
const snapshot = JSON.parse(
  gunzipSync(readFileSync(curation.baselineArchive.path)).toString('utf8'),
) as Record<string, string>;
const previous = JSON.parse(snapshot['vocabulary-foundation.json']) as FlashcardArtifact;
const previousManifest = JSON.parse(snapshot['manifest.v2.json']) as typeof manifest;

function publishedCatalog(): FlashcardSeedCatalog {
  const { track } = syllabus;
  const units = track.units.filter((unit) => unit.isPublished);

  return {
    tracks: [{ slug: track.slug, curriculumLevel: track.curriculumLevel }],
    units: units.map((unit) => ({ id: unit.id, slug: unit.slug, trackSlug: track.slug })),
    skills: [
      ...units.flatMap((unit) =>
        unit.lessons
          .filter((lesson) => lesson.isPublished)
          .flatMap((lesson) =>
            lesson.skills
              .filter((skill) => skill.isPublished && skill.supportsFlashcards)
              .map((skill) => ({
                id: skill.id,
                code: skill.code,
                skillType: skill.skillType,
                trackSlug: track.slug,
                unitSlug: unit.slug,
                lessonSlug: lesson.slug,
              })),
          ),
      ),
      ...manifest.groups.map((group) => ({
        id: group.id,
        code: group.code,
        skillType: 'VOCABULARY',
        trackSlug: group.trackSlug,
        unitSlug: null,
        lessonSlug: null,
        vocabularyItemIds: group.items.map((item) => item.itemId),
      })),
    ],
  };
}

it('retires wrong identities without rewriting them, reuses three lesson owners, and adds four distinct identities', () => {
  expect(
    createHash('sha256').update(readFileSync(curation.baselineArchive.path)).digest('hex'),
  ).toBe(curation.baselineArchive.sha256);
  expect(curation.resolutions).toHaveLength(7);
  expect(curation.resolutions.every((entry) => !entry.movesUserHistory)).toBe(true);

  const current = JSON.parse(
    readFileSync('content/flashcards/system-decks/vocabulary-foundation.json', 'utf8'),
  ) as FlashcardArtifact;
  const retiredIds = new Set(curation.resolutions.map((entry) => entry.oldItemId));
  const replaced = curation.resolutions.filter((entry) => entry.disposition === 'RETIRED_REPLACED');
  const reused = curation.resolutions.filter(
    (entry) => entry.disposition === 'RETIRED_ALREADY_COVERED',
  );

  expect(replaced).toHaveLength(4);
  expect(reused).toHaveLength(3);
  expect(current.items).toHaveLength(previous.items.length + 4);

  for (const resolution of curation.resolutions) {
    const before = previous.items.find((item) => item.id === resolution.oldItemId)!;

    expect(current.items.find((item) => item.id === before.id)).toEqual({
      ...before,
      isActive: false,
    });
    expect(current.deckItems.some((member) => member.itemId === before.id)).toBe(false);
    expect(resolution.targetItemId).not.toBe(before.id);
  }

  for (const resolution of reused) {
    const before = previous.items.find((item) => item.id === resolution.targetItemId)!;
    const after = current.items.find((item) => item.id === resolution.targetItemId)!;

    for (const key of [
      'id',
      'skillId',
      'skillCode',
      'unitSlug',
      'lessonSlug',
      'mappingStatus',
    ] as const) {
      expect(after[key]).toEqual(before[key]);
    }

    expect(before.skillId).not.toBeNull();
    expect(
      manifest.groups.some((group) => group.items.some((member) => member.itemId === before.id)),
    ).toBe(false);
  }

  for (const resolution of replaced) {
    expect(previous.items.some((item) => item.id === resolution.targetItemId)).toBe(false);
    expect(current.items.find((item) => item.id === resolution.targetItemId)?.isActive).toBe(true);
  }

  const changedIds = new Set(
    curation.resolutions.flatMap((entry) => [entry.oldItemId, entry.targetItemId]),
  );

  for (const before of previous.items.filter((item) => !changedIds.has(item.id))) {
    expect(current.items.find((item) => item.id === before.id)).toEqual(before);
  }

  expect(current.decks.map((deck) => deck.id)).toEqual(previous.decks.map((deck) => deck.id));

  const replacements = new Map(replaced.map((entry) => [entry.oldItemId, entry.targetItemId]));

  expect(current.deckItems.map(({ deckId, itemId }) => ({ deckId, itemId }))).toEqual(
    previous.deckItems
      .filter((member) => !retiredIds.has(member.itemId) || replacements.has(member.itemId))
      .map(({ deckId, itemId }) => ({ deckId, itemId: replacements.get(itemId) ?? itemId })),
  );

  expect(manifest.groups.slice(0, previousManifest.groups.length)).toEqual(previousManifest.groups);
  expect(manifest.groups).toHaveLength(151);
  expect(manifest.groups.flatMap((group) => group.items)).toHaveLength(583);
  expect(
    new Set(manifest.groups.slice(previousManifest.groups.length).map((group) => group.code)),
  ).toEqual(new Set(curation.groups.map((group) => group.proposedSkillCode)));
});

it('leaves zero eligible pending items and delivers seven corrected bilingual targets in all six localized pairs', async () => {
  const source = new FileCanonicalFlashcardSource();
  const inventory = (await source.readArtifacts()).flatMap((artifact) => artifact.items);

  expect(new StandaloneVocabularySeed(manifest, inventory).manifest).toEqual(manifest);

  const plan = await new PrepareFlashcardSeedServiceImpl(
    { getPublishedCatalog: async () => publishedCatalog() },
    source,
  ).prepare(
    manifest.groups.flatMap((group) =>
      group.items.map((item) => ({ ...item, targetSkillId: group.id })),
    ),
  );

  expect(plan.counts).toMatchObject({ items: 636, mappedItems: 636, pendingItems: 0 });

  const builder = new OptionSnapshotBuilder(() => 0);

  for (const resolution of curation.resolutions) {
    expect(plan.items.some((item) => item.id === resolution.oldItemId)).toBe(false);

    const target = plan.items.find((item) => item.id === resolution.targetItemId)!;

    expect(target.skillId).not.toBeNull();

    for (const locale of ['en', 'id'] as const) {
      for (const [question, answer] of [
        ['JAPANESE', 'MEANING'],
        ['MEANING', 'JAPANESE'],
        ['MEANING', 'KANA'],
      ] as const) {
        const turn = builder.build(target, question, answer, locale);

        expect(turn.localization).toMatchObject({
          requestedLocale: locale,
          resolvedLocale: locale,
          isFallback: false,
          contentRevision: 4,
          translationRevision: 4,
        });
        expect(turn.answerOptions).toHaveLength(4);
        expect(new Set(turn.answerOptions.map((option) => option.value)).size).toBe(4);
        expect(turn.answerOptions.find((option) => option.id === turn.correctOptionId)?.value).toBe(
          answer === 'MEANING'
            ? target.localizations![locale]!.meaning
            : target.answerOptionPayload[answer]!.canonicalAnswer,
        );
      }
    }
  }
});
