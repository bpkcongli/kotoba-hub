import type { PlacementNormalizationPort } from '@/backend/personalization/application/ports/placement-normalization.port';
import type {
  RecommendationCatalogPort,
  RecommendationCatalogSkill,
} from '@/backend/personalization/application/ports/recommendation-catalog.port';
import type {
  RecommendationLearningContext,
  RecommendationProgressPort,
} from '@/backend/personalization/application/ports/recommendation-progress.port';
import type {
  PublishedOnboardingTrack,
  SyllabusCatalogPort,
} from '@/backend/personalization/application/ports/syllabus-catalog.port';
import type { AssessmentInput } from '@/backend/personalization/application/services/assessment.service';
import { AssessmentServiceImpl } from '@/backend/personalization/application/services/impl/assessment.service.impl';
import { InvalidOnboardingCatalogReference } from '@/backend/personalization/domain/exceptions/invalid-onboarding-catalog-reference';
import { PlacementNormalizationAdapter } from '@/backend/personalization/interface/secondary/ai/placement-normalization.adapter';
import { contextSchema } from '@/backend/shared/application/helpers/ai-schemas';
import type { AiProviderPort } from '@/backend/shared/application/ports/ai-provider.port';
import { AiServiceImpl } from '@/backend/shared/application/services/impl/ai.service.impl';
import type { AiRequestLogRepository } from '@/backend/shared/domain/repositories/ai-request-log.repository';
import { config, providerResult } from '../ai/fixtures';

const input: AssessmentInput = {
  userId: '6ba7b811-9dad-41d1-80b4-00c04fd430c8',
  requestId: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
  currentLevel: 'BEGINNER',
  targetLevel: 'JLPT_N5',
  dailyGoalMinutes: 20,
  preferredScript: 'MIXED',
  weakSkillFocuses: ['particles', 'listening'],
};

function fixture() {
  const tracks: PublishedOnboardingTrack[] = [
    {
      slug: 'jlpt-n5-foundation',
      curriculumLevel: 'N5',
      sortOrder: 1,
      units: [
        {
          slug: 'n5-kana',
          sortOrder: 1,
          lessons: [
            { slug: 'hiragana', sortOrder: 1, skillCodes: ['hiragana_a_row'] },
            { slug: 'particles', sortOrder: 2, skillCodes: ['particle_wa'] },
          ],
        },
      ],
    },
  ];

  const skills: RecommendationCatalogSkill[] = [
    {
      skillId: 'skill-kana',
      skillCode: 'hiragana_a_row',
      title: 'Hiragana A Row',
      skillType: 'KANA',
      lessonId: 'lesson-kana',
      lessonSlug: 'hiragana',
      unitSlug: 'n5-kana',
      trackSlug: 'jlpt-n5-foundation',
      curriculumLevel: 'N5',
      supportsObjective: true,
      supportsFreeResponse: false,
    },
    {
      skillId: 'skill-particle',
      skillCode: 'particle_wa',
      title: 'Topic Particle WA',
      skillType: 'GRAMMAR',
      lessonId: 'lesson-particle',
      lessonSlug: 'particles',
      unitSlug: 'n5-kana',
      trackSlug: 'jlpt-n5-foundation',
      curriculumLevel: 'N5',
      supportsObjective: true,
      supportsFreeResponse: true,
    },
  ];

  const state: RecommendationLearningContext = { skills: [], lessons: [], recentMistakes: [] };

  const catalog: SyllabusCatalogPort = {
    getPublishedOnboardingTracks: jest.fn(async () => tracks),
  };

  const skillCatalog: RecommendationCatalogPort = {
    getPracticeSkills: jest.fn(async () => skills),
  };

  const progress: RecommendationProgressPort = { getLearningContext: jest.fn(async () => state) };

  const normalizer: PlacementNormalizationPort = {
    summarize: jest.fn(async () => ({
      suggestedKnownSkillClaims: [{ skillCode: 'hiragana_a_row', confidence: 0.91 }],
    })),
  };

  return {
    tracks,
    skills,
    state,
    catalog,
    skillCatalog,
    progress,
    normalizer,
    service: new AssessmentServiceImpl(catalog, skillCatalog, progress, normalizer),
  };
}

describe('personalization assessment draft', () => {
  it.each([undefined, null, '', '   '])(
    'builds a structured draft without normalization for note %p',
    async (note) => {
      const { service, normalizer, progress } = fixture();

      const result = await service.assess({ ...input, note });

      expect(result).toEqual({
        draftProfile: {
          currentLevel: 'BEGINNER',
          targetLevel: 'JLPT_N5',
          dailyGoalMinutes: 20,
          preferredScript: 'MIXED',
          weakSkillFocuses: ['particles', 'listening'],
        },
        suggestedKnownSkillClaims: [],
        recommendation: {
          recommendedTrackSlug: 'jlpt-n5-foundation',
          recommendedUnitSlug: 'n5-kana',
          nextLessonSlug: 'hiragana',
        },
        aiNormalizationUsed: false,
      });
      expect(normalizer.summarize).not.toHaveBeenCalled();
      expect(progress.getLearningContext).toHaveBeenCalledWith(input.userId);
    },
  );

  it('maps AI suggestions to canonical titles without replacing structured choices or advancing the lesson', async () => {
    const { service, normalizer } = fixture();

    const result = await service.assess({ ...input, note: 'I know hiragana.' });

    expect(result.suggestedKnownSkillClaims).toEqual([
      { skillCode: 'hiragana_a_row', title: 'Hiragana A Row', source: 'ai_note', confidence: 0.91 },
    ]);
    expect(result.aiNormalizationUsed).toBe(true);
    expect(result.draftProfile.currentLevel).toBe('BEGINNER');
    expect(result.draftProfile.weakSkillFocuses).toEqual(['particles', 'listening']);
    expect(result.recommendation.nextLessonSlug).toBe('hiragana');
    expect(normalizer.summarize).toHaveBeenCalledWith(
      expect.objectContaining({
        note: 'I know hiragana.',
        metadata: expect.objectContaining({
          requestId: input.requestId,
          userId: input.userId,
          sourceEntityType: 'PERSONALIZATION_ASSESSMENT',
        }),
      }),
    );

    const aiInput = jest.mocked(normalizer.summarize).mock.calls[0][0];

    expect(contextSchema.safeParse(aiInput.context).success).toBe(true);
    expect(aiInput.context.catalog.map((skill) => skill.skillCode)).toEqual([
      'hiragana_a_row',
      'particle_wa',
    ]);
    expect(aiInput.context.masteredSkillCodes).toEqual([]);
  });

  it('normalizes through the real AI adapter and validator with request observability', async () => {
    const { catalog, skillCatalog, progress } = fixture();

    const provider: AiProviderPort = {
      name: 'TEST_PROVIDER',
      generate: jest.fn(async () =>
        providerResult({
          suggestedKnownSkillClaims: [{ skillCode: 'hiragana_a_row', confidence: 0.91 }],
        }),
      ),
    };

    const logs: AiRequestLogRepository = {
      start: jest.fn(async () => {}),
      recordAttempt: jest.fn(async () => {}),
      complete: jest.fn(async () => {}),
    };

    const getAiService = jest.fn(
      () => new AiServiceImpl(provider, logs, config({ apiKey: undefined })),
    );
    const service = new AssessmentServiceImpl(
      catalog,
      skillCatalog,
      progress,
      new PlacementNormalizationAdapter(getAiService),
    );

    await service.assess(input);

    expect(getAiService).not.toHaveBeenCalled();
    expect(provider.generate).not.toHaveBeenCalled();
    expect(logs.start).not.toHaveBeenCalled();

    const result = await service.assess({ ...input, note: 'private learner note' });

    expect(result.suggestedKnownSkillClaims).toEqual([
      { skillCode: 'hiragana_a_row', title: 'Hiragana A Row', source: 'ai_note', confidence: 0.91 },
    ]);
    expect(provider.generate).toHaveBeenCalledTimes(1);
    expect(logs.start).toHaveBeenCalledWith(
      expect.objectContaining({
        requestKey: input.requestId,
        userId: input.userId,
        sourceEntityType: 'PERSONALIZATION_ASSESSMENT',
        operationName: 'SUMMARIZE_PLACEMENT',
      }),
    );
    expect(logs.recordAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ schemaParseSuccess: true }),
    );
    expect(logs.complete).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ requestStatus: 'SUCCEEDED' }),
    );
    expect(JSON.stringify(jest.mocked(logs.start).mock.calls)).not.toContain(
      'private learner note',
    );
  });

  it('respects the target catalog and the current level when multiple tracks are published', async () => {
    const { service, tracks, skills, normalizer } = fixture();

    tracks.push({
      slug: 'jlpt-n4-expansion',
      curriculumLevel: 'N4',
      sortOrder: 2,
      units: [
        {
          slug: 'n4-grammar',
          sortOrder: 1,
          lessons: [{ slug: 'n4-plain-past', sortOrder: 1, skillCodes: ['n4_plain_past'] }],
        },
      ],
    });
    skills.push({
      ...skills[1],
      skillId: 'skill-n4',
      skillCode: 'n4_plain_past',
      title: 'Plain Past',
      lessonId: 'lesson-n4',
      lessonSlug: 'n4-plain-past',
      unitSlug: 'n4-grammar',
      trackSlug: 'jlpt-n4-expansion',
      curriculumLevel: 'N4',
    });

    await service.assess({ ...input, note: 'I know hiragana.' });
    const { context } = jest.mocked(normalizer.summarize).mock.calls[0][0];

    expect(context.catalog.map((skill) => skill.skillCode)).not.toContain('n4_plain_past');

    const startingAtN4 = await service.assess({
      ...input,
      currentLevel: 'JLPT_N4',
      targetLevel: 'JLPT_N4',
    });

    expect(startingAtN4.recommendation).toEqual({
      recommendedTrackSlug: 'jlpt-n4-expansion',
      recommendedUnitSlug: 'n4-grammar',
      nextLessonSlug: 'n4-plain-past',
    });

    const startingWithoutLevel = await service.assess({
      ...input,
      currentLevel: null,
      targetLevel: 'JLPT_N4',
    });

    expect(startingWithoutLevel.recommendation.nextLessonSlug).toBe('hiragana');
  });

  it('uses existing learner progress for the next lesson and reads fresh state on reassessment', async () => {
    const { service, state } = fixture();

    expect((await service.assess(input)).recommendation.nextLessonSlug).toBe('hiragana');

    state.lessons.push({ lessonId: 'lesson-kana', currentUnderstandingLevel: 1 });

    expect((await service.assess(input)).recommendation.nextLessonSlug).toBe('particles');
  });

  it('uses measured mastery to skip covered lessons while keeping AI claims as suggestions', async () => {
    const { service, state, normalizer } = fixture();
    state.skills.push({
      skillId: 'skill-kana',
      masteryState: 'MASTERED',
      recommendedDifficultyBand: 'STRETCH',
    });

    const result = await service.assess({ ...input, note: 'I know hiragana.' });

    expect(result.recommendation.nextLessonSlug).toBe('particles');

    const { context } = jest.mocked(normalizer.summarize).mock.calls[0][0];

    expect(context.masteredSkillCodes).toEqual(['hiragana_a_row']);
    expect(result.suggestedKnownSkillClaims[0].source).toBe('ai_note');
  });

  it('keeps a real lesson available for review when all published lessons are covered', async () => {
    const { service, state } = fixture();
    state.lessons.push(
      { lessonId: 'lesson-kana', currentUnderstandingLevel: 10 },
      { lessonId: 'lesson-particle', currentUnderstandingLevel: 10 },
    );

    expect((await service.assess(input)).recommendation.nextLessonSlug).toBe('hiragana');
  });

  it.each(['targetLevel', 'currentLevel'] as const)(
    'rejects an unpublished %s before calling AI',
    async (field) => {
      const { service, normalizer } = fixture();

      await expect(
        service.assess({ ...input, [field]: 'JLPT_N3', note: 'I know everything.' }),
      ).rejects.toBeInstanceOf(InvalidOnboardingCatalogReference);

      expect(normalizer.summarize).not.toHaveBeenCalled();
    },
  );

  it('does not return AI claims that are absent from the published syllabus', async () => {
    const { service, normalizer } = fixture();
    jest.mocked(normalizer.summarize).mockResolvedValueOnce({
      suggestedKnownSkillClaims: [{ skillCode: 'invented-skill', confidence: 1 }],
    });

    await expect(service.assess({ ...input, note: 'I know this.' })).rejects.toThrow();
  });

  it('propagates normalization failure instead of reporting successful normalization', async () => {
    const { service, normalizer } = fixture();
    jest.mocked(normalizer.summarize).mockRejectedValueOnce(new Error('provider failure'));

    await expect(service.assess({ ...input, note: 'I know hiragana.' })).rejects.toThrow();
  });

  it('keeps stale progress outside the published catalog out of the AI context', async () => {
    const { service, state, normalizer } = fixture();
    state.skills.push({
      skillId: 'removed-skill',
      masteryState: 'MASTERED',
      recommendedDifficultyBand: 'STRETCH',
    });
    state.recentMistakes.push({
      skillId: 'removed-skill',
      questionType: 'FREE_RESPONSE',
      answeredAt: '2026-10-26T00:00:00Z',
    });
    state.lessons.push({ lessonId: 'removed-lesson', currentUnderstandingLevel: 10 });

    await service.assess({ ...input, note: 'I know hiragana.' });
    const { context } = jest.mocked(normalizer.summarize).mock.calls[0][0];

    expect(context.masteredSkillCodes).toEqual([]);
    expect(context.recentMistakes).toEqual([]);
    expect(context.lessonUnderstanding.map((lesson) => lesson.lessonSlug)).not.toContain(
      'removed-lesson',
    );
  });
});
