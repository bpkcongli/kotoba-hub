import type { ProgressSkillAttribution } from '@/backend/progress/application/ports/progress-catalog.port';
import { ProgressServiceImpl } from '@/backend/progress/application/services/impl/progress.service.impl';
import type { RecordLearningEventRequest } from '@/backend/progress/application/services/requests/record-learning-event.request';
import type {
  ProgressReadState,
  ProgressRepository,
} from '@/backend/progress/domain/repositories/progress.repository';
import { emptyLesson, emptyMastery, event, ids } from './fixtures';

const attribution: ProgressSkillAttribution = {
  skillId: ids.skill,
  skillCode: 'kana',
  skillTitle: 'Kana',
  lessonId: ids.lesson,
  lessonSlug: 'kana-lesson',
  lessonTitle: 'Kana lesson',
  unitId: ids.unit,
  unitSlug: 'kana-unit',
  trackId: ids.track,
  trackSlug: 'n5',
  trackTitle: 'N5',
  postStudyQuestions: [
    {
      id: ids.question,
      skillCode: 'kana',
      questionType: 'SHORT_FREE_RESPONSE',
      difficultyLevel: 1,
    },
  ],
};

function setup(state: ProgressReadState = { events: [], skills: [], lessons: [] }) {
  const repository: ProgressRepository = {
    readState: jest.fn(async () => state),
    findEvent: jest.fn(async () => null),
    findLesson: jest.fn(async () => null),
    withSkillLock: jest.fn(),
  };
  const catalog = { getPublishedAttributions: async () => [attribution] };

  return { repository, service: new ProgressServiceImpl(repository, catalog) };
}

function request(overrides: Partial<RecordLearningEventRequest> = {}): RecordLearningEventRequest {
  const value = event();

  return {
    ...value,
    eventId: value.id,
    confidenceWeight: value.confidenceWeight,
    responseTimeMs: value.responseTimeMs,
    ...overrides,
  };
}

describe('progress use cases', () => {
  it.each([
    { skillId: '90000000-0000-4000-8000-000000000001' },
    { numericScore: 101 },
    { numericScore: Number.NaN },
    { confidenceWeight: -0.1 },
    { responseTimeMs: -1 },
    { answeredAt: 'not-a-date' },
    { sourceSessionId: null },
    { postStudy: { questionId: ids.question, difficultyLevel: 1 } },
    {
      sourceType: 'LESSON_POST_STUDY' as const,
      sourceSessionId: null,
      postStudy: { questionId: ids.question, difficultyLevel: 2 },
    },
    {
      sourceType: 'LESSON_POST_STUDY' as const,
      sourceSessionId: null,
      sourceEntityId: '90000000-0000-4000-8000-000000000001',
      postStudy: { questionId: ids.question, difficultyLevel: 1 },
    },
  ])('rejects invalid learning input before persistence: %j', async (overrides) => {
    const { service, repository } = setup();

    await expect(service.recordLearningEvent(request(overrides))).rejects.toThrow();

    expect(repository.withSkillLock).not.toHaveBeenCalled();
  });

  it('returns an honest empty overview', async () => {
    const { service } = setup();

    expect(await service.getOverview(ids.user)).toEqual({
      trackedSkillsCount: 0,
      masteredSkillsCount: 0,
      developingSkillsCount: 0,
      weakSkillsCount: 0,
      averageMasteryScore: 0,
      recommendedDifficultyBand: 'STANDARD',
      lastActivityAt: null,
      lessonUnderstandingSummary: {
        trackedLessonsCount: 0,
        completedLessonsCount: 0,
        averageUnderstandingLevel: 0,
        maxUnderstandingLevel: 10,
      },
      trackSummaries: [],
    });
  });

  it('derives completion from lesson understanding and filters overview by published track', async () => {
    const { service, repository } = setup({
      events: [event()],
      skills: [
        {
          ...emptyMastery(),
          attemptsWindowSize: 1,
          masteryScore: 85,
          masteryState: 'STABLE',
          lastActivityAt: event().answeredAt,
        },
      ],
      lessons: [{ ...emptyLesson(), currentUnderstandingLevel: 1 }],
    });

    expect(await service.getOverview(ids.user)).toMatchObject({
      trackedSkillsCount: 1,
      developingSkillsCount: 1,
      masteredSkillsCount: 0,
      averageMasteryScore: 85,
      lessonUnderstandingSummary: {
        trackedLessonsCount: 1,
        completedLessonsCount: 1,
        averageUnderstandingLevel: 1,
      },
      trackSummaries: [{ trackSlug: 'n5', trackedSkillsCount: 1 }],
    });
    expect((await service.getOverview(ids.user, { trackSlug: 'n4' })).trackedSkillsCount).toBe(0);
    expect(repository.readState).toHaveBeenCalledWith(ids.user);
  });

  it('filters before pagination and groups session answers without inventing completion', async () => {
    const { service } = setup({
      events: [
        event(1),
        event(2, { isCorrect: false, numericScore: 0 }),
        event(3, { sourceType: 'FLASHCARD' }),
        event(4, { sourceType: 'LESSON_POST_STUDY', sourceSessionId: null }),
      ],
      skills: [],
      lessons: [],
    });

    const timeline = await service.getTimeline(ids.user, {
      offset: 1,
      limit: 1,
      sourceTypes: ['PRACTICE'],
      skillCodes: ['kana'],
      trackSlug: 'n5',
    });

    expect(timeline.totalRecords).toBe(2);
    expect(timeline.items.map((item) => item.id)).toEqual([event(1).id]);
    expect(timeline.items[0]).not.toHaveProperty('gradingMetadata');
    expect(timeline.items[0]).not.toHaveProperty('userId');

    const sessions = await service.getSessions(ids.user, { offset: 0, limit: 10 });

    expect(sessions.totalRecords).toBe(3);
    expect(sessions.items[0]).toMatchObject({
      sourceType: 'LESSON_POST_STUDY',
      sourceSessionId: null,
      sessionTitle: 'Kana lesson',
    });
    expect(sessions.items.find((item) => item.sourceType === 'PRACTICE')).toMatchObject({
      sessionStatus: 'UNKNOWN',
      startedAt: null,
      completedAt: null,
      totalInteractions: 2,
      correctCount: 1,
      incorrectCount: 1,
      averageScore: 50,
      lastActivityAt: event(2).answeredAt,
    });
  });

  it('counts a moved lesson under its current track while retaining historical event attribution', async () => {
    const { repository } = setup({
      events: [event(1, { gradingMetadata: { progress: { attribution } } })],
      skills: [
        { ...emptyMastery(), attemptsWindowSize: 1, masteryScore: 85, masteryState: 'STABLE' },
      ],
      lessons: [{ ...emptyLesson(), currentUnderstandingLevel: 1 }],
    });
    const service = new ProgressServiceImpl(repository, {
      getPublishedAttributions: async () => [
        {
          ...attribution,
          trackId: '50000000-0000-4000-8000-000000000002',
          trackSlug: 'n4',
          trackTitle: 'N4',
        },
      ],
    });

    expect(
      (await service.getOverview(ids.user, { trackSlug: 'n5' })).lessonUnderstandingSummary
        .completedLessonsCount,
    ).toBe(0);
    expect(
      (await service.getOverview(ids.user, { trackSlug: 'n4' })).lessonUnderstandingSummary
        .completedLessonsCount,
    ).toBe(1);

    const historical = await service.getTimeline(ids.user, {
      offset: 0,
      limit: 10,
      trackSlug: 'n5',
    });

    expect(historical.totalRecords).toBe(1);
    expect(historical.items[0].trackSlug).toBe('n5');
  });
});
