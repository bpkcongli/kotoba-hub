import type { RecommendationCatalogSkill } from '@/backend/personalization/application/ports/recommendation-catalog.port';
import type { RecommendationLearningContext } from '@/backend/personalization/application/ports/recommendation-progress.port';
import { RecommendationServiceImpl } from '@/backend/personalization/application/services/impl/recommendation.service.impl';
import { RecommendationUnavailable } from '@/backend/personalization/domain/exceptions/recommendation-unavailable';
import { contextSchema } from '@/backend/shared/application/helpers/ai-schemas';

const skill = (
  index: number,
  overrides: Partial<RecommendationCatalogSkill> = {},
): RecommendationCatalogSkill => ({
  skillId: `skill-${index}`,
  skillCode: `particles-${index}`,
  title: `Particles ${index}`,
  skillType: 'GRAMMAR',
  lessonId: `lesson-${index}`,
  lessonSlug: `lesson-${index}`,
  unitSlug: 'unit-n5',
  trackSlug: 'jlpt-n5',
  curriculumLevel: 'N5',
  supportsObjective: true,
  supportsFreeResponse: true,
  ...overrides,
});

function fixture() {
  const profile = {
    appAccess: 'APP_READY' as 'APP_READY' | 'ONBOARDING_REQUIRED',
    learnerProfile: {
      currentLevel: 'BEGINNER',
      targetLevel: 'JLPT_N5',
      weakSkillFocuses: [] as string[],
      knownSkillClaims: [] as string[],
    },
  };

  const skills = [skill(1), skill(2), skill(3)];

  const state: RecommendationLearningContext = {
    skills: [],
    lessons: [],
    recentMistakes: [],
  };

  const profiles = { getProfile: jest.fn(async () => profile) };

  const progress = { getLearningContext: jest.fn(async () => state) };

  const service = new RecommendationServiceImpl(
    profiles,
    {
      getPracticeSkills: async () => skills,
    },
    progress,
  );

  return { service, profile, skills, state, profiles, progress };
}

describe('practice recommendation', () => {
  it('provides the default mix and valid published context for a new learner', async () => {
    const { service, profiles, progress } = fixture();

    const result = await service.getRecommendation('owner');

    expect(profiles.getProfile).toHaveBeenCalledWith('owner');
    expect(progress.getLearningContext).toHaveBeenCalledWith('owner');
    expect(contextSchema.safeParse(result.context).success).toBe(true);
    expect(result.questionMix).toEqual({ WEAK: 0.6, REINFORCEMENT: 0.3, STRETCH: 0.1 });
    expect(result.difficultyBand).toBe('STANDARD');
    expect(result.context.lessonUnderstanding).toEqual([
      { lessonSlug: 'lesson-1', level: 0 },
      { lessonSlug: 'lesson-2', level: 0 },
      { lessonSlug: 'lesson-3', level: 0 },
    ]);
  });

  it('uses fresh mastery and understanding after each interaction', async () => {
    const { service, state } = fixture();

    await service.getRecommendation('owner');

    state.skills.push({
      skillId: 'skill-3',
      masteryState: 'WEAK',
      recommendedDifficultyBand: 'REMEDIAL',
    });
    state.lessons.push({ lessonId: 'lesson-3', currentUnderstandingLevel: 4 });

    const result = await service.getRecommendation('owner');

    expect(result.context.catalog[0].skillCode).toBe('particles-3');
    expect(result.context.weakSkillCodes).toEqual(['particles-3']);
    expect(result.context.lessonUnderstanding[0]).toEqual({ lessonSlug: 'lesson-3', level: 4 });
    expect(result.difficultyBand).toBe('REMEDIAL');
  });

  it('does not turn confirmed known-skill claims into measured mastery', async () => {
    const { service, profile } = fixture();
    profile.learnerProfile.knownSkillClaims = ['particles-1'];

    const result = await service.getRecommendation('owner');

    expect(result.context.catalog[0].skillCode).toBe('particles-2');
    expect(result.context.masteredSkillCodes).toEqual([]);
  });

  it('respects measured weakness even when a skill was claimed known', async () => {
    const { service, profile, state } = fixture();
    profile.learnerProfile.knownSkillClaims = ['particles-3'];
    state.skills.push({
      skillId: 'skill-3',
      masteryState: 'WEAK',
      recommendedDifficultyBand: 'STANDARD',
    });

    expect((await service.getRecommendation('owner')).context.catalog[0].skillCode).toBe(
      'particles-3',
    );
  });

  it('treats focus labels as preferences and never invents skill codes', async () => {
    const { service, profile } = fixture();
    profile.learnerProfile.weakSkillFocuses = ['particles', 'listening'];

    const { context } = await service.getRecommendation('owner');

    expect(context.weakSkillCodes).toEqual(['particles-1', 'particles-2', 'particles-3']);
    expect(context.catalog.map((item) => item.skillCode)).not.toContain('listening');
  });

  it('maps the particles focus to singular names used by the canonical catalog', async () => {
    const { service, profile, skills } = fixture();
    skills[0] = skill(1, { skillCode: 'n5_verb_ichidan', title: 'Ichidan verbs' });
    skills[1] = skill(2, { skillCode: 'n5_topic_particle_wa', title: 'Topic Particle WA' });
    profile.learnerProfile.weakSkillFocuses = ['particles'];

    const result = await service.getRecommendation('owner');

    expect(result.context.catalog[0].skillCode).toBe('n5_topic_particle_wa');
    expect(result.context.weakSkillCodes).toContain('n5_topic_particle_wa');
    expect(result.context.weakSkillCodes).not.toContain('n5_verb_ichidan');
  });

  it('excludes levels beyond the target, inactive activity support, and stale progress', async () => {
    const { service, skills, state } = fixture();
    skills.push(
      skill(4, { curriculumLevel: 'N4' }),
      skill(5, {
        supportsObjective: false,
        supportsFreeResponse: false,
      }),
    );
    state.skills.push({
      skillId: 'unpublished',
      masteryState: 'MASTERED',
      recommendedDifficultyBand: 'STRETCH',
    });
    state.recentMistakes.push({
      skillId: 'unpublished',
      questionType: 'FREE_RESPONSE',
      answeredAt: '2026-10-26T00:00:00Z',
    });

    const { context } = await service.getRecommendation('owner');

    expect(context.catalog).toHaveLength(3);
    expect(context.masteredSkillCodes).toEqual([]);
    expect(context.recentMistakes).toEqual([]);
  });

  it('allows only types supported by every selected skill', async () => {
    const { service, skills } = fixture();
    skills[0].supportsFreeResponse = false;
    skills[1].supportsObjective = false;

    const { context } = await service.getRecommendation('owner');

    expect(context.allowedQuestionTypes).toEqual([
      'SHORT_FREE_RESPONSE',
      'SLOT_FILL',
      'ARRANGE_TOKEN',
    ]);
    expect(context.catalog.map((item) => item.skillCode)).toEqual(['particles-1', 'particles-3']);
  });

  it('supports a free-response-only published catalog', async () => {
    const { service, skills } = fixture();
    skills.forEach((item) => {
      item.supportsObjective = false;
    });

    expect((await service.getRecommendation('owner')).context.allowedQuestionTypes).toEqual([
      'FREE_RESPONSE',
    ]);
  });

  it('bounds the catalog and mistake context before sending it to AI', async () => {
    const { service, skills, state } = fixture();
    skills.splice(0, skills.length, ...Array.from({ length: 100 }, (_, index) => skill(index)));
    state.recentMistakes = Array.from({ length: 40 }, () => ({
      skillId: 'skill-1',
      questionType: 'SHORT_FREE_RESPONSE',
      answeredAt: '2026-10-26T00:00:00Z',
    }));

    const { context } = await service.getRecommendation('owner');

    expect(context.catalog).toHaveLength(40);
    expect(context.recentMistakes).toHaveLength(20);
    expect(contextSchema.safeParse(context).success).toBe(true);
  });

  it('requires APP_READY and available published practice content', async () => {
    const { service, profile, skills, progress } = fixture();
    profile.appAccess = 'ONBOARDING_REQUIRED';

    await expect(service.getRecommendation('owner')).rejects.toBeInstanceOf(
      RecommendationUnavailable,
    );
    expect(progress.getLearningContext).not.toHaveBeenCalled();

    profile.appAccess = 'APP_READY';
    skills.splice(0);

    await expect(service.getRecommendation('owner')).rejects.toBeInstanceOf(
      RecommendationUnavailable,
    );
  });
});
