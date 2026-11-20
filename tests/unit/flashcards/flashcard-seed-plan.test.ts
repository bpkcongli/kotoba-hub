import type {
  CanonicalFlashcardSource,
  FlashcardArtifact,
} from '@/backend/flashcards/application/ports/canonical-flashcard-source.port';
import type { FlashcardSeedCatalog } from '@/backend/flashcards/application/ports/flashcard-seed-catalog.port';
import { PrepareFlashcardSeedServiceImpl } from '@/backend/flashcards/application/services/impl/prepare-flashcard-seed.service.impl';
import { ids } from './fixtures';

function setup() {
  const catalog: FlashcardSeedCatalog = {
    tracks: [{ slug: 'n5', curriculumLevel: 'N5' }],
    units: [{ id: 'unit-id', slug: 'school-unit', trackSlug: 'n5' }],
    skills: [
      {
        id: ids.skill,
        code: 'school',
        lessonSlug: 'school-lesson',
        unitSlug: 'school-unit',
        trackSlug: 'n5',
        skillType: 'VOCABULARY',
      },
    ],
  };

  const mapped: FlashcardArtifact['items'][number] = {
    id: ids.item,
    skillId: ids.skill,
    skillCode: 'school',
    trackSlug: 'n5',
    unitSlug: 'school-unit',
    lessonSlug: 'school-lesson',
    itemType: 'VOCABULARY',
    surfaceFormText: '学校',
    kanaDisplayText: 'がっこう',
    romajiText: null,
    englishMeaning: 'school',
    mappingStatus: 'SYLLABUS_MAPPED',
    answerOptionPayload: {
      schemaVersion: 1,
      canonicalAnswers: {
        JAPANESE: ['学校'],
        KANA: ['がっこう'],
        ENGLISH: ['school', 'schoolhouse'],
      },
      distractorPoolItemIds: [],
    },
    explanationText: null,
    isActive: true,
  };

  const pending: FlashcardArtifact['items'][number] = {
    ...structuredClone(mapped),
    id: ids.nextItem,
    skillId: null,
    skillCode: 'unmapped',
    unitSlug: null,
    lessonSlug: null,
    surfaceFormText: '駅',
    kanaDisplayText: 'えき',
    englishMeaning: 'station',
    mappingStatus: 'PENDING_LESSON_MAPPING',
    answerOptionPayload: {
      schemaVersion: 1,
      canonicalAnswers: { JAPANESE: ['駅'], KANA: ['えき'], ENGLISH: ['station'] },
      distractorPoolItemIds: [ids.item],
    },
  };

  const artifact: FlashcardArtifact = {
    schemaVersion: '1.0.0',
    deckSource: 'SYSTEM',
    deckType: 'FOUNDATION',
    contentType: 'VOCABULARY',
    decks: [
      {
        id: ids.deck,
        slug: 'n5-school',
        trackSlug: 'n5',
        unitSlug: 'school-unit',
        title: 'School vocabulary',
        description: null,
        sortOrder: 1,
        isPublished: true,
      },
      {
        id: ids.otherDeck,
        slug: 'n5-unmapped',
        trackSlug: 'n5',
        unitSlug: null,
        title: 'Pending vocabulary',
        description: null,
        sortOrder: 2,
        isPublished: true,
      },
    ],
    items: [mapped, pending],
    deckItems: [
      { deckId: ids.deck, itemId: ids.item, sortOrder: 1 },
      { deckId: ids.otherDeck, itemId: ids.nextItem, sortOrder: 1 },
    ],
  };

  const source: CanonicalFlashcardSource = {
    readArtifacts: async () => [artifact],
    readKanjiSkills: async () => [],
  };

  return {
    artifact,
    catalog,
    source,
    service: new PrepareFlashcardSeedServiceImpl(
      { getPublishedCatalog: async () => catalog },
      source,
    ),
  };
}

describe('canonical flashcard seed planning', () => {
  it('retains official attribution while leaving pending vocabulary unmapped', async () => {
    const { service } = setup();
    const first = await service.prepare();

    expect(await service.prepare()).toEqual(first);
    expect(first.counts).toEqual({
      decks: 2,
      items: 2,
      memberships: 2,
      mappedItems: 1,
      pendingItems: 1,
    });
    expect(first.items.find((row) => row.id === ids.item)).toMatchObject({
      skillId: ids.skill,
      answerOptionPayload: {
        ENGLISH: { canonicalAnswer: 'school', distractors: ['station'] },
      },
    });
    expect(first.items.find((row) => row.id === ids.nextItem)?.skillId).toBeNull();
    expect(first.decks[0]).toMatchObject({ deckSource: 'SYSTEM', deckType: 'FOUNDATION' });
    expect(first.deckItems.map((row) => row.itemId)).toEqual([ids.item, ids.nextItem]);
  });

  it('does not invent mapped attribution for unpublished syllabus skills', async () => {
    const { catalog, service } = setup();
    catalog.skills = [];

    const plan = await service.prepare();

    expect(plan.items.map((row) => row.id)).toEqual([ids.nextItem]);
    expect(plan.counts.mappedItems).toBe(0);
    expect(plan.deckItems).toEqual([{ deckId: ids.otherDeck, itemId: ids.nextItem, sortOrder: 1 }]);
  });

  it('rejects an official mapping that disagrees with the published catalog', async () => {
    const { artifact, service } = setup();
    artifact.items[0].lessonSlug = 'another-lesson';

    await expect(service.prepare()).rejects.toThrow(/attribution mismatch/);
  });

  it('rejects pending items that claim official skill or lesson ownership', async () => {
    const { artifact, service } = setup();
    artifact.items[1].skillId = ids.skill;

    await expect(service.prepare()).rejects.toThrow(/official attribution/);
  });

  it('excludes unpublished decks instead of publishing an empty shell', async () => {
    const { artifact, service } = setup();
    artifact.decks[0].isPublished = false;
    artifact.decks[1].isPublished = false;

    const plan = await service.prepare();

    expect(plan.decks).toEqual([]);
    expect(plan.items).toEqual([]);
    expect(plan.deckItems).toEqual([]);
  });

  it('excludes cross-script aliases that would make a distractor another valid answer', async () => {
    const { artifact, service } = setup();
    artifact.items[1].answerOptionPayload.canonicalAnswers.ENGLISH = ['schoolhouse'];

    const plan = await service.prepare();
    const mapped = plan.items.find((row) => row.id === ids.item)!;
    const pending = plan.items.find((row) => row.id === ids.nextItem)!;

    expect(mapped.answerOptionPayload.JAPANESE?.distractors).not.toContain('駅');
    expect(mapped.answerOptionPayload.KANA?.distractors).not.toContain('えき');
    expect(pending.answerOptionPayload.JAPANESE?.distractors).not.toContain('学校');
    expect(pending.answerOptionPayload.KANA?.distractors).not.toContain('がっこう');
  });
});

it('limits reviewed pools to named peers in legacy and both localized packages', async () => {
  const { artifact, catalog, source } = setup();

  const target = artifact.items[0];
  target.surfaceFormText = 'ボールペン';
  target.kanaDisplayText = 'ボールペン';
  target.englishMeaning = 'ballpoint pen';
  target.answerOptionPayload.canonicalAnswers = {
    JAPANESE: ['ボールペン'],
    KANA: ['ボールペン'],
    ENGLISH: ['ballpoint pen'],
  };
  target.answerOptionPayload.reviewedDistractorPoolItemIds = [ids.nextItem];

  const excluded = structuredClone(artifact.items[1]);
  excluded.id = '40000000-0000-4000-8000-000000000903';
  excluded.skillCode = 'pen';
  excluded.surfaceFormText = 'ペン';
  excluded.kanaDisplayText = 'ぺん';
  excluded.englishMeaning = 'pen';
  excluded.answerOptionPayload.canonicalAnswers = {
    JAPANESE: ['ペン'],
    KANA: ['ぺん'],
    ENGLISH: ['pen'],
  };

  artifact.items.push(excluded);
  artifact.deckItems.push({ deckId: ids.otherDeck, itemId: excluded.id, sortOrder: 2 });
  source.readLocalizationOverlay = async () => ({
    schemaVersion: '2.0.0',
    contentRevision: 3,
    translationRevision: 3,
    sourceRefs: ['test'],
    decks: {},
    unitTitles: {},
    items: {
      [target.id]: { surfaceFormText: 'ボールペン', en: 'ballpoint pen', id: 'pulpen' },
      [ids.nextItem]: { surfaceFormText: '駅', en: 'station', id: 'stasiun' },
      [excluded.id]: { surfaceFormText: 'ペン', en: 'pen', id: 'pena' },
    },
  });

  const service = new PrepareFlashcardSeedServiceImpl(
    { getPublishedCatalog: async () => catalog },
    source,
  );
  const plan = await service.prepare();
  const item = plan.items.find((entry) => entry.id === target.id)!;

  expect(item.answerOptionPayload.ENGLISH?.distractors).toEqual(['station']);

  for (const locale of ['en', 'id'] as const) {
    expect(item.localizations?.[locale]?.meaningOptions?.distractors).toEqual([
      locale === 'en' ? 'station' : 'stasiun',
    ]);
    expect(item.localizations?.[locale]?.scriptOptions.JAPANESE?.distractors).toEqual(['駅']);
    expect(item.localizations?.[locale]?.scriptOptions.KANA?.distractors).toEqual(['えき']);
  }
});

it('rejects invalid reviewed peers and never replaces unavailable peers with global options', async () => {
  const { artifact, catalog, service } = setup();

  const pool = artifact.items[1].answerOptionPayload;
  pool.reviewedDistractorPoolItemIds = [ids.nextItem];

  await expect(service.prepare()).rejects.toThrow(/Invalid reviewed distractor pool/);

  pool.reviewedDistractorPoolItemIds = [ids.item, ids.item];

  await expect(service.prepare()).rejects.toThrow(/Invalid reviewed distractor pool/);

  pool.reviewedDistractorPoolItemIds = ['40000000-0000-4000-8000-000000000904'];

  await expect(service.prepare()).rejects.toThrow(/Invalid reviewed distractor pool/);

  pool.reviewedDistractorPoolItemIds = [ids.item];
  catalog.skills = [];

  await expect(service.prepare()).rejects.toThrow(/No eligible reviewed distractor/);
});

it('excludes Japanese distractors when translated prompt meanings collide', async () => {
  const { catalog, artifact } = setup();

  const service = new PrepareFlashcardSeedServiceImpl(
    { getPublishedCatalog: async () => catalog },
    {
      readArtifacts: async () => [artifact],
      readKanjiSkills: async () => [],
      readLocalizationOverlay: async () => ({
        schemaVersion: '2.0.0',
        contentRevision: 1,
        sourceRefs: ['test'],
        decks: {},
        unitTitles: {},
        items: {
          [ids.item]: { surfaceFormText: '学校', en: 'school', id: 'tempat' },
          [ids.nextItem]: { surfaceFormText: '駅', en: 'station', id: 'tempat' },
        },
      }),
    },
  );
  const plan = await service.prepare();

  for (const value of plan.items) {
    expect(value.localizations?.id?.scriptOptions.JAPANESE?.distractors).toEqual([]);
    expect(value.localizations?.id?.meaningOptions?.distractors).toEqual([]);
    expect(value.localizations?.en?.scriptOptions.JAPANESE?.distractors).toHaveLength(1);
  }
});

it('promotes only explicit pending identities to their eligible group, preserving item IDs', async () => {
  const { catalog, service } = setup();
  const target = '40000000-0000-4000-8000-000000000099';

  catalog.skills.push({
    id: target,
    code: 'standalone',
    lessonSlug: null,
    unitSlug: null,
    trackSlug: 'n5',
    skillType: 'VOCABULARY',
    vocabularyItemIds: [ids.nextItem],
    vocabularyPendingSkillCodes: { [ids.nextItem]: 'unmapped' },
  });

  const plan = await service.prepare([
    { itemId: ids.nextItem, pendingSkillCode: 'unmapped', targetSkillId: target },
  ]);

  expect(plan.items.find((row) => row.id === ids.nextItem)?.skillId).toBe(target);
  expect(plan.counts).toMatchObject({ mappedItems: 2, pendingItems: 0 });
  expect(plan.deckItems.map((row) => row.itemId)).toEqual([ids.item, ids.nextItem]);

  await expect(
    service.prepare([{ itemId: ids.nextItem, pendingSkillCode: 'wrong', targetSkillId: target }]),
  ).rejects.toThrow(/promotion/);

  await expect(
    service.prepare([{ itemId: ids.item, pendingSkillCode: 'school', targetSkillId: target }]),
  ).rejects.toThrow(/promotion/);
});
