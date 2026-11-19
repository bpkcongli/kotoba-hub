import type { ProgressSkillAttribution } from '@/backend/progress/application/ports/progress-catalog.port';
import { ProgressServiceImpl } from '@/backend/progress/application/services/impl/progress.service.impl';
import type { RecordLearningEventRequest } from '@/backend/progress/application/services/requests/record-learning-event.request';
import type {
  ProgressRepository,
  ProgressEventSnapshot,
} from '@/backend/progress/domain/repositories/progress.repository';
import { emptyMastery, event, ids } from './fixtures';

function setup() {
  const state = { events: [] as ProgressEventSnapshot[], skills: [emptyMastery()], lessons: [] };

  const transaction = {
    findEvent: async (id: string) => state.events.find((e) => e.id === id) ?? null,
    getSkillHistory: async () => state.events,
    getMastery: async () => state.skills[0],
    lockLesson: jest.fn(),
    insertEvent: async (e: ProgressEventSnapshot) => {
      state.events.push(e);
    },
    saveMastery: async (value: ReturnType<typeof emptyMastery>) => {
      state.skills[0] = value;
    },
    saveLesson: jest.fn(),
  };

  const repository: ProgressRepository = {
    findEvent: async (_user, id) => transaction.findEvent(id),
    withSkillLock: async (_user, _skill, work) => work(transaction),
    readState: async () => state,
    findLesson: async () => null,
  };

  const group: ProgressSkillAttribution = {
    skillId: ids.skill,
    skillCode: 'supplies',
    skillTitle: 'Supplies',
    lessonId: null,
    lessonSlug: null,
    lessonTitle: null,
    unitId: null,
    unitSlug: null,
    trackId: ids.track,
    trackSlug: 'n5',
    trackTitle: 'N5',
    postStudyQuestions: [],
    vocabularyItemIds: [ids.question, ids.lesson],
  };

  const catalog = { getPublishedAttributions: jest.fn(async () => [group]) };
  const service = new ProgressServiceImpl(repository, catalog);

  const fixture = event(1, {
    sourceType: 'FLASHCARD',
    questionType: 'MULTIPLE_CHOICE',
    lessonId: null,
    unitId: null,
    gradingMetadata: { flashcardItemId: ids.question },
  });
  const request: RecordLearningEventRequest = { ...fixture, eventId: fixture.id };

  return { service, transaction, catalog, state, request };
}

it('writes group progress without lesson understanding and replays after unpublication', async () => {
  const { service, transaction, catalog, state, request } = setup();

  const first = await service.recordLearningEvent(request);

  expect(first).toMatchObject({
    mastery: { masteryScore: 50 },
    lessonUnderstanding: null,
    lessonCompleted: false,
  });
  expect(state.events[0]).toMatchObject({ lessonId: null, unitId: null, trackId: ids.track });
  expect(transaction.lockLesson).not.toHaveBeenCalled();
  expect(transaction.saveLesson).not.toHaveBeenCalled();

  catalog.getPublishedAttributions.mockResolvedValue([]);

  expect(await service.recordLearningEvent(request)).toMatchObject({
    eventId: first.eventId,
    replayed: true,
    mastery: first.mastery,
  });
  expect(state.events).toHaveLength(1);

  expect((await service.getTimeline(ids.user, { offset: 0, limit: 10 })).items[0]).toMatchObject({
    lessonSlug: null,
    unitSlug: null,
  });
  expect((await service.getOverview(ids.user)).lessonUnderstandingSummary.trackedLessonsCount).toBe(
    0,
  );
});

it.each(['PRACTICE', 'LESSON_POST_STUDY', 'foreign-item'])(
  'rejects unsupported group evidence: %s',
  async (kind) => {
    const { service, request, state } = setup();

    if (kind === 'foreign-item') request.gradingMetadata = { flashcardItemId: ids.unit };
    else request.sourceType = kind as 'PRACTICE' | 'LESSON_POST_STUDY';

    await expect(service.recordLearningEvent(request)).rejects.toThrow(/member flashcard/);

    expect(state.events).toEqual([]);
  },
);
