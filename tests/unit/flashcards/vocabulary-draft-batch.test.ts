import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import type { FlashcardArtifact } from '@/backend/flashcards/application/ports/canonical-flashcard-source.port';
import type { FlashcardSeedCatalog } from '@/backend/flashcards/application/ports/flashcard-seed-catalog.port';
import { PrepareFlashcardSeedServiceImpl } from '@/backend/flashcards/application/services/impl/prepare-flashcard-seed.service.impl';
import { OptionSnapshotBuilder } from '@/backend/flashcards/domain/services/option-snapshot-builder';
import { FileCanonicalFlashcardSource } from '@/backend/flashcards/interface/secondary/seed/canonical-flashcard-source';
import { StandaloneVocabularySeed } from '@/backend/syllabus/domain/value-objects/standalone-vocabulary-seed';
import type activeManifest from '../../../content/flashcards/vocabulary-groups/manifest.v2.json';

const snapshot = JSON.parse(
  gunzipSync(readFileSync('content/flashcards/drafts/voc-03-batch-03/baseline.json.gz')).toString(
    'utf8',
  ),
) as Record<string, string>;
const manifest = JSON.parse(snapshot['manifest.v2.json']) as typeof activeManifest;
const vocabulary = JSON.parse(snapshot['vocabulary-foundation.json']) as FlashcardArtifact;

function historicalSource() {
  const current = new FileCanonicalFlashcardSource();

  return {
    readArtifacts: async () =>
      (await current.readArtifacts()).map((artifact) =>
        artifact.contentType === 'VOCABULARY' ? vocabulary : artifact,
      ),
    readLocalizationOverlay: async () =>
      JSON.parse(snapshot['localizations.v2.json']) as Awaited<
        ReturnType<typeof current.readLocalizationOverlay>
      >,
    readKanjiSkills: () => current.readKanjiSkills(),
  };
}

const directory = 'content/flashcards/drafts/voc-03-batch-02';
const candidate = JSON.parse(readFileSync(`${directory}/integration-candidate.json`, 'utf8')) as {
  isPublished: boolean;
  reviewStatus: string;
  baselineManifestSha256: string;
  targetContentRevision: number;
  targetTranslationRevision: number;
  groups: typeof manifest.groups;
  canonicalUpdates: {
    itemId: string;
    englishMeaning: string;
    canonicalAnswers: FlashcardArtifact['items'][number]['answerOptionPayload']['canonicalAnswers'];
    reviewedDistractorPoolItemIds: string[];
  }[];
  localizationUpdates: Record<string, { surfaceFormText: string; en: string; id: string }>;
};

function catalog(): FlashcardSeedCatalog {
  const { track } = JSON.parse(
    readFileSync('content/syllabus/v2/tracks/jlpt-n5-foundation.json', 'utf8'),
  ) as {
    track: {
      slug: string;
      curriculumLevel: string;
      units: {
        id: string;
        slug: string;
        isPublished: boolean;
        lessons: {
          slug: string;
          isPublished: boolean;
          skills: {
            id: string;
            code: string;
            skillType: string;
            isPublished: boolean;
            supportsFlashcards: boolean;
          }[];
        }[];
      }[];
    };
  };
  const units = track.units.filter((unit) => unit.isPublished);

  return {
    tracks: [{ slug: track.slug, curriculumLevel: track.curriculumLevel }],
    units: units.map((unit) => ({ id: unit.id, slug: unit.slug, trackSlug: track.slug })),
    skills: units.flatMap((unit) =>
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
  };
}

const coverage = JSON.parse(readFileSync(`${directory}/coverage.json`, 'utf8')) as {
  assigned: number;
  authored: number;
  promoted: number;
  pendingAfter: number;
  acceptedItemIds: string[];
  heldItems: { itemId: string }[];
  parts: {
    curationSha256: string;
    contentSha256: string;
    reviewSha256: string;
    reviewStatus: string;
  }[];
};

it('promotes only the reviewed subset, preserving baseline identities and draft boundaries', async () => {
  const integration = JSON.parse(readFileSync(`${directory}/integration.json`, 'utf8')) as {
    artifactSha256: Record<string, string>;
  };

  for (const [path, expected] of Object.entries(integration.artifactSha256)) {
    expect(createHash('sha256').update(snapshot[path.split('/').at(-1)!]).digest('hex')).toBe(
      expected,
    );
  }

  expect(candidate.isPublished).toBe(false);
  expect(candidate.reviewStatus).toBe('READY_FOR_INTEGRATION');
  expect(candidate.groups.every((group) => !group.isPublished)).toBe(true);
  expect(
    candidate.groups.every(
      (group) => !group.localizations.en.isPublished && !group.localizations.id.isPublished,
    ),
  ).toBe(true);

  const baselineManifest = JSON.parse(
    readFileSync(`${directory}/baseline/manifest.v2.json`, 'utf8'),
  ) as typeof manifest;

  expect(
    createHash('sha256')
      .update(readFileSync(`${directory}/baseline/manifest.v2.json`))
      .digest('hex'),
  ).toBe(candidate.baselineManifestSha256);
  expect(manifest.groups.slice(0, baselineManifest.groups.length)).toEqual(baselineManifest.groups);

  const existingIds = baselineManifest.groups.flatMap((group) =>
    group.items.map((item) => item.itemId),
  );
  const promotedIds = manifest.groups.flatMap((group) => group.items.map((item) => item.itemId));

  expect(new Set(promotedIds)).toEqual(new Set([...existingIds, ...coverage.acceptedItemIds]));
  expect(promotedIds).toHaveLength(existingIds.length + coverage.promoted);
  expect(coverage.promoted).toBe(coverage.acceptedItemIds.length);
  expect(
    new Set([...coverage.acceptedItemIds, ...coverage.heldItems.map((item) => item.itemId)]).size,
  ).toBe(coverage.assigned);
  expect(coverage.acceptedItemIds).toContain('506c5576-24cf-5e3f-ae16-77826bf0c8d1');

  const source = historicalSource();
  const inventory = (await source.readArtifacts()).flatMap((artifact) => artifact.items);

  expect(new StandaloneVocabularySeed(manifest, inventory).manifest).toEqual(manifest);

  const baselineVocabulary = JSON.parse(
    readFileSync(`${directory}/baseline/vocabulary-foundation.json`, 'utf8'),
  ) as FlashcardArtifact;

  expect(vocabulary.items.map((item) => item.id)).toEqual(
    baselineVocabulary.items.map((item) => item.id),
  );
  expect(vocabulary.decks).toEqual(baselineVocabulary.decks);
  expect(vocabulary.deckItems).toEqual(baselineVocabulary.deckItems);

  for (const [index, part] of coverage.parts.entries()) {
    const path = `${directory}/part-0${index + 1}`;

    expect(part.reviewStatus).toBe('READY_FOR_INTEGRATION');

    for (const [name, hash] of [
      ['curation.json', part.curationSha256],
      ['content.json', part.contentSha256],
      ['review.md', part.reviewSha256],
    ]) {
      expect(
        createHash('sha256')
          .update(readFileSync(`${path}/${name}`))
          .digest('hex'),
      ).toBe(hash);
    }
  }
});

it('builds bounded legacy and bilingual options for every actual promotion and keeps held items pending', async () => {
  const source = historicalSource();
  const activeCatalog = catalog();

  activeCatalog.skills.push(
    ...manifest.groups.map((group) => ({
      id: group.id,
      code: group.code,
      skillType: 'VOCABULARY',
      trackSlug: group.trackSlug,
      unitSlug: null,
      lessonSlug: null,
      vocabularyItemIds: group.items.map((item) => item.itemId),
    })),
  );

  const plan = await new PrepareFlashcardSeedServiceImpl(
    { getPublishedCatalog: async () => activeCatalog },
    source,
  ).prepare(
    manifest.groups.flatMap((group) =>
      group.items.map((item) => ({ ...item, targetSkillId: group.id })),
    ),
  );

  expect(plan.counts).toMatchObject({
    items: 639,
    mappedItems: 639 - coverage.pendingAfter,
    pendingItems: coverage.pendingAfter,
  });

  const builder = new OptionSnapshotBuilder(() => 0);
  const overlay = await source.readLocalizationOverlay();
  const accepted = new Set(coverage.acceptedItemIds);

  for (const update of candidate.canonicalUpdates.filter((entry) => accepted.has(entry.itemId))) {
    const item = plan.items.find((entry) => entry.id === update.itemId)!;
    const group = manifest.groups.find((entry) =>
      entry.items.some((member) => member.itemId === item.id),
    )!;

    expect(item.skillId).toBe(group.id);

    const peers = plan.items.filter((entry) =>
      update.reviewedDistractorPoolItemIds.includes(entry.id),
    );

    expect(peers).toHaveLength(3);

    for (const mode of ['JAPANESE', 'KANA', 'ENGLISH'] as const) {
      expect(new Set(item.answerOptionPayload[mode]?.distractors)).toEqual(
        new Set(peers.map((peer) => peer.answerOptionPayload[mode]!.canonicalAnswer)),
      );
    }

    for (const locale of ['en', 'id'] as const) {
      for (const [question, answer] of [
        ['JAPANESE', 'MEANING'],
        ['MEANING', 'JAPANESE'],
        ['MEANING', 'KANA'],
      ] as const) {
        const turn = builder.build(item, question, answer, locale);

        expect(turn.localization).toMatchObject({
          resolvedLocale: locale,
          isFallback: false,
          contentRevision: candidate.targetContentRevision,
          translationRevision: candidate.targetTranslationRevision,
        });

        const expected =
          answer === 'MEANING'
            ? candidate.localizationUpdates[item.id][locale]
            : update.canonicalAnswers[answer]![0];

        expect(turn.answerOptions.find((option) => option.id === turn.correctOptionId)?.value).toBe(
          expected,
        );

        const distractors = turn.answerOptions
          .filter((option) => option.id !== turn.correctOptionId)
          .map((option) => option.value);

        expect(new Set(distractors)).toEqual(
          new Set(
            peers.map((peer) =>
              answer === 'MEANING'
                ? peer.localizations![locale]!.meaning
                : peer.answerOptionPayload[answer]!.canonicalAnswer,
            ),
          ),
        );
        expect(turn.answerOptions).toHaveLength(4);
      }
    }
  }

  for (const held of coverage.heldItems) {
    expect(plan.items.find((entry) => entry.id === held.itemId)?.skillId).toBeNull();
    expect(overlay.items[held.itemId]).toBeUndefined();

    const item = plan.items.find((entry) => entry.id === held.itemId)!;

    expect(builder.build(item, 'JAPANESE', 'MEANING', 'id').localization).toMatchObject({
      isFallback: true,
      resolvedLocale: 'en',
    });
  }
}, 30_000);
