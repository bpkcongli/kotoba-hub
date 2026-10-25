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
