import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { flashcardArtifactSchema } from '@/backend/flashcards/application/helpers/flashcard-artifact-schema';
import type {
  CanonicalFlashcardSource,
  FlashcardLocalizationOverlay,
} from '@/backend/flashcards/application/ports/canonical-flashcard-source.port';
import type { FlashcardSeedCatalog } from '@/backend/flashcards/application/ports/flashcard-seed-catalog.port';
import { PrepareFlashcardSeedServiceImpl } from '@/backend/flashcards/application/services/impl/prepare-flashcard-seed.service.impl';
import type { FlashcardSeedPlan } from '@/backend/flashcards/application/services/prepare-flashcard-seed.service';
import { OptionSnapshotBuilder } from '@/backend/flashcards/domain/services/option-snapshot-builder';
import { FileCanonicalFlashcardSource } from '@/backend/flashcards/interface/secondary/seed/canonical-flashcard-source';
import { StandaloneVocabularySeed } from '@/backend/syllabus/domain/value-objects/standalone-vocabulary-seed';
import content from '../../../content/flashcards/drafts/voc-03-batch-01/content.json';
import coverage from '../../../content/flashcards/drafts/voc-03-batch-01/coverage.json';
import curation from '../../../content/flashcards/drafts/voc-03-batch-01/curation.json';
import baselineOverlay from '../../../content/flashcards/drafts/voc-03-batch-02/baseline/localizations.v2.json';
import manifest from '../../../content/flashcards/drafts/voc-03-batch-02/baseline/manifest.v2.json';
import baselineVocabulary from '../../../content/flashcards/drafts/voc-03-batch-02/baseline/vocabulary-foundation.json';

const group = manifest.groups[0];
const activeSource = new FileCanonicalFlashcardSource();
// Batch 01's held pen and bank fingerprints describe revision 2, before batch 02.
const source = {
  readArtifacts: async () =>
    (await activeSource.readArtifacts()).map((artifact) =>
      artifact.contentType === 'VOCABULARY'
        ? flashcardArtifactSchema.parse(baselineVocabulary)
        : artifact,
    ),
  readLocalizationOverlay: async (): Promise<FlashcardLocalizationOverlay> => ({
    ...baselineOverlay,
    schemaVersion: '2.0.0',
  }),
  readKanjiSkills: () => activeSource.readKanjiSkills(),
} satisfies CanonicalFlashcardSource;
let plan: FlashcardSeedPlan;

beforeAll(async () => {
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
            supportsFlashcards: boolean;
            isPublished: boolean;
          }[];
        }[];
      }[];
    };
  };

  const catalog: FlashcardSeedCatalog = {
    tracks: [{ slug: track.slug, curriculumLevel: track.curriculumLevel }],
    units: track.units
      .filter((unit) => unit.isPublished)
      .map((unit) => ({ id: unit.id, slug: unit.slug, trackSlug: track.slug })),
    skills: track.units
      .filter((unit) => unit.isPublished)
      .flatMap((unit) =>
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

  catalog.skills.push({
    id: group.id,
    code: group.code,
    skillType: 'VOCABULARY',
    trackSlug: group.trackSlug,
    unitSlug: null,
    lessonSlug: null,
    vocabularyItemIds: group.items.map((item) => item.itemId),
  });

  plan = await new PrepareFlashcardSeedServiceImpl(
    { getPublishedCatalog: async () => catalog },
    source,
  ).prepare(group.items.map((item) => ({ ...item, targetSkillId: group.id })));
}, 30_000);

it('accounts for every assigned item and keeps held content outside the runtime manifest', async () => {
  expect(
    [...coverage.acceptedItemIds, ...coverage.heldItems.map((item) => item.itemId)].sort(),
  ).toEqual([...curation.scope.assignedItemIds].sort());
  expect(group.items.map((item) => item.itemId).sort()).toEqual(
    [...coverage.acceptedItemIds].sort(),
  );

  expect(content.isPublished).toBe(false);
  expect(curation.isPublished).toBe(false);
  expect(content.curation.sha256).toBe(
    createHash('sha256').update(readFileSync(content.curation.path)).digest('hex'),
  );

  const inventory = (await source.readArtifacts()).flatMap((artifact) => artifact.items);

  expect(new StandaloneVocabularySeed(manifest, inventory).manifest).toEqual(manifest);

  const overlay = await source.readLocalizationOverlay();

  for (const held of coverage.heldItems) {
    expect(overlay.items[held.itemId]).toBeUndefined();
    expect(plan.items.find((item) => item.id === held.itemId)?.skillId).toBeNull();
  }
});

it.each(coverage.acceptedItemIds)(
  'preserves reviewed bilingual banks and ownership for %s',
  (id) => {
    const item = plan.items.find((entry) => entry.id === id)!;
    const authored = content.items.find((entry) => entry.itemId === id)!;

    expect(item.skillId).toBe(group.id);

    const banks = Object.fromEntries(
      (['en', 'id'] as const).map((locale) => {
        const localized = item.localizations![locale]!;

        expect(localized.meaning).toBe(authored.localizations[locale].meaning);

        return [
          locale,
          { scriptOptions: localized.scriptOptions, meaningOptions: localized.meaningOptions },
        ];
      }),
    );

    expect(createHash('sha256').update(JSON.stringify(banks)).digest('hex')).toBe(
      coverage.reviewedRuntimeBanks[id as keyof typeof coverage.reviewedRuntimeBanks],
    );

    const builder = new OptionSnapshotBuilder(() => 0);

    for (const locale of ['en', 'id'] as const) {
      for (const [question, answer] of [
        ['JAPANESE', 'MEANING'],
        ['MEANING', 'JAPANESE'],
        ['MEANING', 'KANA'],
      ] as const) {
        const turn = builder.build(item, question, answer, locale);

        expect(turn.localization).toMatchObject({ resolvedLocale: locale, isFallback: false });

        const canonical =
          answer === 'MEANING'
            ? authored.localizations[locale].meaning
            : authored.japanese.acceptedAnswers[answer][0];

        expect(turn.answerOptions.find((option) => option.id === turn.correctOptionId)?.value).toBe(
          canonical,
        );
        expect(turn.answerOptions.filter((option) => option.value === canonical)).toHaveLength(1);
      }
    }
  },
);

it('limits the stamp English aliases to the reviewed postage sense', () => {
  const stamp = plan.items.find((item) => item.id === '4cf91acd-62fa-52d3-8b05-e540af15b45d')!;

  expect(stamp.localizations?.en?.meaningOptions?.aliases).toEqual([
    'postage stamp',
    'stamp (postage)',
  ]);
  expect(stamp.answerOptionPayload.ENGLISH?.canonicalAnswer).toBe('stamp (postage)');
});
