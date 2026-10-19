import { PrepareSyllabusSeedServiceImpl } from '@/backend/syllabus/application/services/impl/prepare-syllabus-seed.service.impl';
import { SyllabusCatalogServiceImpl } from '@/backend/syllabus/application/services/impl/syllabus-catalog.service.impl';
import type { SyllabusSeedPlan } from '@/backend/syllabus/application/services/prepare-syllabus-seed.service';
import type { SyllabusCatalogService } from '@/backend/syllabus/application/services/syllabus-catalog.service';
import {
  toLessonDto,
  toUnitDto,
} from '@/backend/syllabus/interface/primary/rest/dto/syllabus.response.dto';
import { SeedSyllabusCatalogRepository } from '@/backend/syllabus/interface/secondary/seed/seed-syllabus-catalog.repository';

let plan: SyllabusSeedPlan;
let catalog: SyllabusCatalogService;

beforeAll(async () => {
  plan = await new PrepareSyllabusSeedServiceImpl(new SeedSyllabusCatalogRepository()).prepare();
  catalog = new SyllabusCatalogServiceImpl({ getTracks: async () => plan.tracks });
});

describe('syllabus catalog', () => {
  it('exposes only published tracks and descendants in stable order', async () => {
    const tracks = await catalog.getPublishedOnboardingTracks();

    expect(tracks.map((track) => track.curriculumLevel)).toEqual(['N5']);
    expect(tracks[0].units).toHaveLength(3);
    expect(tracks[0].units[0].lessons[0].skillCodes).toContain('n5_copula_affirmative');
    expect(tracks.every((track) => track.units.every((unit) => unit.lessons.length > 0))).toBe(
      true,
    );
  });

  it('maps unit data without leaking seed-only fields', async () => {
    const result = await catalog.getPublishedUnit('n5-self-introduction-and-copula');

    expect(result).not.toBeNull();

    const dto = toUnitDto(result!, catalog, true, false);

    expect(dto.lessons[0].skills).toEqual([]);
    expect(dto.unitSkills).toEqual([]);
    expect(dto).not.toHaveProperty('isPublished');
    expect(dto.lessons[0]).not.toHaveProperty('postStudyQuestions');

    const withSkills = toUnitDto(result!, catalog, true, true);

    expect(withSkills.unitSkills.map((mapping) => mapping.sortOrder)).toEqual(
      withSkills.unitSkills.map((_, index) => index + 1),
    );
  });

  it('validates a complete canonical bank and retrieves one difficulty level', async () => {
    const result = await catalog.getPublishedLesson('copula-affirmative-and-questions');

    expect(result).not.toBeNull();

    catalog.assertPostStudyBank(result!.lesson);
    const question = await catalog.getCanonicalPostStudyQuestion(
      'copula-affirmative-and-questions',
      4,
    );

    expect(question?.question.difficultyLevel).toBe(4);
    expect(question?.question.skillCode).toBe('n5_copula_question_ka');

    const dto = toLessonDto(result!, catalog, true, true);

    expect(dto.postStudyQuiz.bankQuestionCount).toBe(10);
    expect(dto.contentBlocks[0]).toHaveProperty('content.body');
    expect(dto).not.toHaveProperty('postStudyQuestions');
  });

  it('orders persisted unit skill mappings by sort order without mutating the source', async () => {
    const result = await catalog.getPublishedUnit('n5-self-introduction-and-copula');
    const mapping = {
      skillCode: 'n5_copula_affirmative',
      lessonSlug: 'copula-affirmative-and-questions',
      isPrimary: true,
    };
    const storedMappings = [
      { ...mapping, sortOrder: 3 },
      { ...mapping, sortOrder: 1 },
      { ...mapping, sortOrder: 2 },
    ];

    const dto = toUnitDto(
      { ...result!, unit: { ...result!.unit, unitSkillMappings: storedMappings } },
      catalog,
      true,
      true,
    );

    expect(dto.unitSkills.map((item) => item.sortOrder)).toEqual([1, 2, 3]);
    expect(storedMappings.map((item) => item.sortOrder)).toEqual([3, 1, 2]);
  });

  it('excludes incomplete lesson subtrees and reports exact import counts', async () => {
    expect(await catalog.getPublishedLesson('hiragana-vowels-and-k-row')).toBeNull();
    expect(await catalog.getPublishedUnit('n5-kana-basics')).toBeNull();
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
  });
});
