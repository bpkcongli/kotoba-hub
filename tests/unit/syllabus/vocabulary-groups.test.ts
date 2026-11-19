import { FlashcardCatalogAdapter } from '@/backend/flashcards/interface/secondary/syllabus/flashcard-catalog.adapter';
import { PracticeCatalogAdapter } from '@/backend/practice/interface/secondary/syllabus/practice-catalog.adapter';
import { ProgressCatalogAdapter } from '@/backend/progress/interface/secondary/syllabus/progress-catalog.adapter';
import { SyllabusCatalogServiceImpl } from '@/backend/syllabus/application/services/impl/syllabus-catalog.service.impl';
import type {
  SyllabusTrackSnapshot,
  SyllabusSkillSnapshot,
} from '@/backend/syllabus/domain/repositories/syllabus-catalog.repository';
import {
  StandaloneVocabularySeed,
  assertVocabularyGroupRevision,
} from '@/backend/syllabus/domain/value-objects/standalone-vocabulary-seed';

const itemId = '10000000-0000-4000-8000-000000000001';
const inventory = [
  {
    id: itemId,
    skillCode: 'pending',
    skillId: null,
    itemType: 'VOCABULARY',
    trackSlug: 'n5',
    mappingStatus: 'PENDING_LESSON_MAPPING',
  },
];

const text = {
  title: 'Writing supplies',
  description: null,
  sourceRevision: 1,
  translationRevision: 1,
  isPublished: true,
  sourceRefs: ['editorial'],
};

const group = {
  id: '20000000-0000-4000-8000-000000000001',
  code: 'n5_supplies',
  slug: 'n5-supplies',
  trackSlug: 'n5',
  curriculumLevel: 'N5' as const,
  sortOrder: 1,
  contentRevision: 1,
  isPublished: true,
  sourceRefs: ['reviewed-batch'],
  items: [{ itemId, pendingSkillCode: 'pending' }],
  localizations: { en: text, id: text },
};

const manifest = () => ({
  schemaVersion: '2.0.0',
  kind: 'STANDALONE_VOCABULARY_GROUPS',
  groups: [structuredClone(group)],
});

it('accepts a v2 manifest and preserves pending item identity', () => {
  expect(
    new StandaloneVocabularySeed(manifest(), inventory).manifest.groups[0].items[0].itemId,
  ).toBe(itemId);
});

it.each(['missing', 'mapped', 'wrong-code', 'duplicate', 'stale', 'unpublished-en'])(
  'rejects invalid group manifest: %s',
  (kind) => {
    const input = manifest();
    const baseline = structuredClone(inventory);

    if (kind === 'missing') baseline.length = 0;
    if (kind === 'mapped') baseline[0].mappingStatus = 'SYLLABUS_MAPPED';
    if (kind === 'wrong-code') input.groups[0].items[0].pendingSkillCode = 'wrong';
    if (kind === 'duplicate') input.groups[0].items.push({ ...input.groups[0].items[0] });
    if (kind === 'stale') input.groups[0].localizations.en.sourceRevision = 2;
    if (kind === 'unpublished-en') input.groups[0].localizations.en.isPublished = false;

    expect(() => new StandaloneVocabularySeed(input, baseline)).toThrow();
  },
);

it('requires immutable identity/membership and monotonic content and translation revisions', () => {
  expect(() => assertVocabularyGroupRevision(group, structuredClone(group))).not.toThrow();
  expect(() => assertVocabularyGroupRevision(group, { ...group, items: [] })).toThrow(/membership/);
  expect(() =>
    assertVocabularyGroupRevision(group, {
      ...group,
      localizations: { en: { ...text, title: 'Changed' } },
    }),
  ).toThrow(/revision/);
});

const skill: SyllabusSkillSnapshot = {
  id: group.id,
  code: group.code,
  slug: group.slug,
  title: text.title,
  description: null,
  curriculumLevel: 'N5',
  skillType: 'VOCABULARY',
  supportsFlashcards: true,
  supportsPracticeObjective: false,
  supportsPracticeFreeResponse: false,
  prerequisiteSkillCodes: [],
  sortOrder: 1,
  isPublished: true,
  seedSchemaVersion: '2.0.0',
  contentRevision: 1,
  localizations: { en: { ...text, content: {} } },
  content: { vocabularyGroup: { itemIds: [itemId] } },
};

const track: SyllabusTrackSnapshot = {
  id: '30000000-0000-4000-8000-000000000001',
  slug: 'n5',
  curriculumLevel: 'N5',
  title: 'N5',
  description: null,
  sortOrder: 1,
  isPublished: true,
  units: [],
  standaloneVocabularySkills: [skill],
};

it('exposes standalone skills to flashcards/progress without adding a lesson or practice eligibility', async () => {
  const service = new SyllabusCatalogServiceImpl({ getTracks: async () => [track] });

  expect((await new FlashcardCatalogAdapter(service).getPublishedCatalog()).skills).toEqual([
    { id: group.id, code: group.code },
  ]);

  expect((await new ProgressCatalogAdapter(service).getPublishedAttributions())[0]).toMatchObject({
    lessonId: null,
    unitId: null,
    trackSlug: 'n5',
    vocabularyItemIds: [itemId],
  });

  expect(await new PracticeCatalogAdapter(service).getSkills()).toEqual([]);
  expect((await service.getPublishedOnboardingTracks())[0].units).toEqual([]);
});

it.each(['draft', 'stale', 'missing-en', 'no-flashcards', 'hidden-track'])(
  'excludes ineligible standalone skills: %s',
  async (kind) => {
    const source = structuredClone(track);
    const member = source.standaloneVocabularySkills![0];

    if (kind === 'draft') member.isPublished = false;
    if (kind === 'stale') member.localizations!.en!.sourceRevision = 2;
    if (kind === 'missing-en') member.localizations = {};
    if (kind === 'no-flashcards') member.supportsFlashcards = false;
    if (kind === 'hidden-track') source.isPublished = false;

    expect(
      await new SyllabusCatalogServiceImpl({ getTracks: async () => [source] }).getActivitySkills(),
    ).toEqual([]);
  },
);

it('keeps lesson-owned vocabulary under an unpublished lesson ineligible', async () => {
  const source = structuredClone(track);

  source.standaloneVocabularySkills = [];
  source.units = [
    {
      id: '40000000-0000-4000-8000-000000000001',
      slug: 'hidden-parent',
      title: 'Parent',
      description: null,
      sortOrder: 1,
      isFoundationUnit: false,
      isPublished: true,
      lessons: [
        {
          id: '50000000-0000-4000-8000-000000000001',
          slug: 'unpublished-lesson',
          title: 'Draft lesson',
          learningObjective: null,
          sortOrder: 1,
          estimatedMinutes: null,
          isPublished: false,
          contentBlocks: [],
          skills: [{ ...skill, id: '60000000-0000-4000-8000-000000000001', code: 'lesson_vocab' }],
        },
      ],
    },
  ];

  const service = new SyllabusCatalogServiceImpl({ getTracks: async () => [source] });

  expect(await service.getActivitySkills()).toEqual([]);

  expect((await new FlashcardCatalogAdapter(service).getPublishedCatalog()).skills).toEqual([]);
});

it('requires a new canonical revision for changed English and permits stale Indonesian fallback', () => {
  const changed = {
    ...group,
    localizations: { en: { ...text, title: 'New title', translationRevision: 2 }, id: text },
  };

  expect(() => assertVocabularyGroupRevision(group, changed)).toThrow(/canonical revision/);

  const revised = {
    ...changed,
    contentRevision: 2,
    localizations: {
      ...changed.localizations,
      en: { ...changed.localizations.en, sourceRevision: 2 },
    },
  };

  expect(() => assertVocabularyGroupRevision(group, revised)).not.toThrow();
  expect(
    () =>
      new StandaloneVocabularySeed(
        { schemaVersion: '2.0.0', kind: 'STANDALONE_VOCABULARY_GROUPS', groups: [revised] },
        inventory,
      ),
  ).not.toThrow();
});
