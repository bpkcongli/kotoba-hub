import { PrepareSyllabusSeedServiceImpl } from '@/backend/syllabus/application/services/impl/prepare-syllabus-seed.service.impl';
import {
  stableMappingId,
  temporarySortOrders,
} from '@/backend/syllabus/interface/secondary/persistence/drizzle-syllabus-importer';
import { SeedSyllabusCatalogRepository } from '@/backend/syllabus/interface/secondary/seed/seed-syllabus-catalog.repository';

describe('syllabus seed plan', () => {
  it.each([
    { sortOrder: undefined },
    { sortOrder: 0 },
    { sortOrder: 1.5 },
    { isPublished: undefined },
    { sourceRefs: [] },
    { sourceRefs: [{ provider: 'KOTOBAHUB_INTERNAL' }] },
    {
      sourceRefs: [{ provider: 'EXTERNAL', category: 'CURATED_QUESTION', externalId: 'question' }],
    },
    {
      sourceRefs: [
        {
          provider: 'EXTERNAL',
          category: 'CURATED_QUESTION',
          externalId: 'question',
          sourceUrl: 'invalid-url',
        },
      ],
    },
  ])('excludes a bank with invalid seed metadata %j', async (invalidMetadata) => {
    const source = structuredClone(await new SeedSyllabusCatalogRepository().getTracks());
    const lesson = source[0].units[1].lessons.find(
      (item) => item.slug === 'copula-affirmative-and-questions',
    )!;
    Object.assign(lesson.postStudyQuestions![0], invalidMetadata);

    const plan = await new PrepareSyllabusSeedServiceImpl({
      getTracks: async () => source,
    }).prepare();

    expect(plan.rejectedLessons).toEqual(
      expect.arrayContaining([expect.objectContaining({ slug: lesson.slug })]),
    );
    expect(
      plan.tracks
        .flatMap((track) => track.units)
        .flatMap((unit) => unit.lessons)
        .some((item) => item.id === lesson.id),
    ).toBe(false);
  });

  it('keeps only ready lesson subtrees and normalizes legacy paragraph blocks', async () => {
    const plan = await new PrepareSyllabusSeedServiceImpl(
      new SeedSyllabusCatalogRepository(),
    ).prepare();

    expect(plan.tracks.map((track) => track.curriculumLevel)).toEqual(['N5']);
    expect(plan.tracks[0].units.map((unit) => unit.slug)).toEqual([
      'n5-self-introduction-and-copula',
      'n5-core-particles-and-sentence-order',
      'n5-daily-verbs-and-routines',
    ]);
    expect(plan.counts).toEqual({
      tracks: 1,
      units: 3,
      lessons: 9,
      skills: 35,
      contentBlocks: 137,
      questions: 90,
      mappings: 35,
    });
    expect(plan.rejectedLessons).toHaveLength(73);

    const paragraph = plan.tracks[0].units[0].lessons[0].contentBlocks.find(
      (block) => block.blockType === 'PARAGRAPH',
    );

    expect(paragraph?.content).toHaveProperty('body');
    expect((paragraph?.content?.body as string).startsWith('<p>')).toBe(true);
  });

  it('keeps mapping IDs stable and admits newly ready lessons on a later plan', async () => {
    const source = structuredClone(await new SeedSyllabusCatalogRepository().getTracks());
    const lesson = source[0].units[1].lessons.find(
      (item) => item.slug === 'copula-affirmative-and-questions',
    );

    expect(lesson).toBeDefined();

    lesson!.isPublished = false;

    const draft = await new PrepareSyllabusSeedServiceImpl({
      getTracks: async () => source,
    }).prepare();

    lesson!.isPublished = true;

    const curated = await new PrepareSyllabusSeedServiceImpl({
      getTracks: async () => source,
    }).prepare();

    expect(curated.counts.lessons).toBe(draft.counts.lessons + 1);

    const first = curated.tracks[0].units[0].lessons[0];
    const id = stableMappingId(curated.tracks[0].units[0].id, first.id, first.skills[0].id);

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(id).toBe(stableMappingId(curated.tracks[0].units[0].id, first.id, first.skills[0].id));
    expect(id).not.toBe(
      stableMappingId(curated.tracks[0].units[0].id, first.id, first.skills[1].id),
    );
  });

  it('excludes newly invalid quiz metadata until it is corrected on a later run', async () => {
    const source = structuredClone(await new SeedSyllabusCatalogRepository().getTracks());
    const ready = await new PrepareSyllabusSeedServiceImpl({
      getTracks: async () => source,
    }).prepare();
    const slug = ready.tracks[0].units[0].lessons[0].slug;
    const lesson = source
      .flatMap((track) => track.units)
      .flatMap((unit) => unit.lessons)
      .find((item) => item.slug === slug)!;
    lesson.postStudyQuestions![0].promptPayload.promptLanguage = 'EN';

    const invalid = await new PrepareSyllabusSeedServiceImpl({
      getTracks: async () => source,
    }).prepare();

    expect(invalid.counts.lessons).toBe(ready.counts.lessons - 1);
    expect(invalid.rejectedLessons).toEqual(
      expect.arrayContaining([expect.objectContaining({ slug })]),
    );

    lesson.postStudyQuestions![0].promptPayload.promptLanguage = 'JA';

    const corrected = await new PrepareSyllabusSeedServiceImpl({
      getTracks: async () => source,
    }).prepare();

    expect(corrected.counts).toEqual(ready.counts);
    expect(corrected.tracks[0].units[0].lessons[0].id).toBe(ready.tracks[0].units[0].lessons[0].id);
  });

  it('stages unique sort orders below every stored value across repeated reruns', () => {
    const rows = [{ sortOrder: 1 }, { sortOrder: 2 }, { sortOrder: -4 }, { sortOrder: -5 }];

    const staged = temporarySortOrders(rows);

    expect(new Set(staged).size).toBe(rows.length);
    expect(staged.every((value) => value < -5)).toBe(true);

    const next = temporarySortOrders(staged.map((sortOrder) => ({ sortOrder })));

    expect(next.every((value) => value < Math.min(...staged))).toBe(true);
    expect(temporarySortOrders([])).toEqual([]);
    expect(() => temporarySortOrders([{ sortOrder: -2_147_483_648 }])).toThrow(/integer range/);
  });

  it.each(['other_lesson_skill', 'n5_non_grammar_skill'])(
    'rejects grammar block attribution to %s',
    async (skillCode) => {
      const source = structuredClone(await new SeedSyllabusCatalogRepository().getTracks());
      const ready = await new PrepareSyllabusSeedServiceImpl({
        getTracks: async () => source,
      }).prepare();
      const slug = ready.tracks[0].units[0].lessons[0].slug;
      const lesson = source
        .flatMap((track) => track.units)
        .flatMap((unit) => unit.lessons)
        .find((item) => item.slug === slug)!;
      if (skillCode === 'n5_non_grammar_skill') {
        lesson.skills.push({
          ...lesson.skills[0],
          id: 'non-grammar',
          code: skillCode,
          skillType: 'VOCABULARY',
        });
      }
      lesson.contentBlocks.push({
        id: 'invalid-grammar-block',
        blockType: 'GRAMMAR_STRUCTURE',
        content: { skillCode, ALL: '<p>Use this grammar.</p>' },
        sortOrder: 500,
        isPublished: true,
      });

      const invalid = await new PrepareSyllabusSeedServiceImpl({
        getTracks: async () => source,
      }).prepare();

      expect(invalid.rejectedLessons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            slug,
            reason: expect.stringContaining('no published grammar skill'),
          }),
        ]),
      );
      expect(invalid.counts.lessons).toBe(ready.counts.lessons - 1);
    },
  );
});
