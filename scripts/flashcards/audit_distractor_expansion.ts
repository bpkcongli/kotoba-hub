import { readFile } from 'node:fs/promises';
import { PrepareFlashcardSeedServiceImpl } from '@/backend/flashcards/application/services/impl/prepare-flashcard-seed.service.impl';
import { validateVocabularyDistractors } from '@/backend/flashcards/application/helpers/validate-vocabulary-distractors';
import type { FlashcardSeedCatalog } from '@/backend/flashcards/application/ports/flashcard-seed-catalog.port';
import { FileCanonicalFlashcardSource } from '@/backend/flashcards/interface/secondary/seed/canonical-flashcard-source';
import manifest from '../../content/flashcards/vocabulary-groups/manifest.v2.json';
import syllabus from '../../content/syllabus/v2/tracks/jlpt-n5-foundation.json';

const directory = 'content/flashcards/drafts/distractor-expansion-01';
const draft = JSON.parse(await readFile(`${directory}/proposals.json`, 'utf8')) as {
  items: { itemId: string; candidateItemIds: string[] }[];
};
const pools = new Map(draft.items.map((item) => [item.itemId, item.candidateItemIds]));

const fileSource = new FileCanonicalFlashcardSource();
const source = {
  readArtifacts: async () =>
    (await fileSource.readArtifacts()).map((artifact) => ({
      ...artifact,
      items: artifact.items.map((item) => {
        const pool = pools.get(item.id);
        return pool
          ? {
              ...item,
              answerOptionPayload: {
                ...item.answerOptionPayload,
                reviewedDistractorPoolItemIds: pool,
              },
            }
          : item;
      }),
    })),
  readLocalizationOverlay: () => fileSource.readLocalizationOverlay(),
  readKanjiSkills: () => fileSource.readKanjiSkills(),
};

const track = syllabus.track;
const units = track.units.filter((unit) => unit.isPublished);
const catalog: FlashcardSeedCatalog = {
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
      vocabularyItemIds: group.items.map((member) => member.itemId),
    })),
  ],
};

const includeUnpublished = process.argv.includes('--all-active');
const reviewed = process.argv.includes('--reviewed');

if (includeUnpublished) {
  const vocabulary = (await source.readArtifacts()).find(
    (artifact) => artifact.contentType === 'VOCABULARY',
  );

  if (!vocabulary) throw new Error('Vocabulary artifact missing.');

  for (const item of vocabulary.items.filter((entry) => entry.isActive && entry.skillId)) {
    if (!catalog.tracks.some((entry) => entry.slug === item.trackSlug))
      catalog.tracks.push({ slug: item.trackSlug, curriculumLevel: 'N4' });

    if (item.unitSlug && !catalog.units.some((entry) => entry.slug === item.unitSlug))
      catalog.units.push({
        id: `audit:${item.unitSlug}`,
        slug: item.unitSlug,
        trackSlug: item.trackSlug,
      });

    if (!catalog.skills.some((entry) => entry.code === item.skillCode))
      catalog.skills.push({
        id: item.skillId!,
        code: item.skillCode,
        skillType: 'VOCABULARY',
        trackSlug: item.trackSlug,
        unitSlug: item.unitSlug,
        lessonSlug: item.lessonSlug,
      });
  }
}

const promotions = manifest.groups.flatMap((group) =>
  group.items.map((member) => ({ ...member, targetSkillId: group.id })),
);
const plan = await new PrepareFlashcardSeedServiceImpl(
  { getPublishedCatalog: async () => catalog },
  source,
).prepare(promotions);

const failures: { itemId: string; item: string; error: string }[] = [];
const eligibleIds = new Set(plan.items.map((item) => item.id));

for (const item of plan.items.filter((entry) => entry.itemType === 'VOCABULARY')) {
  try {
    if (pools.get(item.id)?.some((peer) => !eligibleIds.has(peer))) {
      throw new Error(`A proposed peer is not in the published plan: ${item.id}.`);
    }

    validateVocabularyDistractors({ ...item, contentRevision: 5 }, pools.get(item.id));
  } catch (error) {
    failures.push({
      itemId: item.id,
      item: item.surfaceFormText,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

process.stdout.write(
  `${JSON.stringify(
    {
      reviewStatus: reviewed ? 'READY_FOR_INTEGRATION' : 'REVIEW_INCOMPLETE',
      catalog: includeUnpublished ? 'synthetic-all-active' : 'published',
      auditedVocabularyItems: plan.items.filter((item) => item.itemType === 'VOCABULARY').length,
      insufficientBanks: failures.length,
      failures,
    },
    null,
    2,
  )}\n`,
);

if (failures.length) {
  process.exitCode = 1;
}
