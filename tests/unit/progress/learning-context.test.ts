import { LearningContextServiceImpl } from '@/backend/progress/application/services/impl/learning-context.service.impl';
import type { ProgressRepository } from '@/backend/progress/domain/repositories/progress.repository';
import { emptyLesson, emptyMastery, event, ids } from './fixtures';

it('exposes fresh progress snapshots and the latest 20 mistakes without raw learner answers', async () => {
  const skills = [emptyMastery(), { ...emptyMastery(ids.user, 'active'), attemptsWindowSize: 1 }];
  const lessons = [emptyLesson()];
  const events = Array.from({ length: 25 }, (_, index) =>
    event(index, {
      isCorrect: index === 24,
      gradingMetadata: { userAnswer: 'private learner text' },
    }),
  );

  const readState = jest.fn(async () => ({ skills, lessons, events }));
  const service = new LearningContextServiceImpl({ readState } as unknown as ProgressRepository);
  const result = await service.getLearningContext(ids.user);

  expect(readState).toHaveBeenCalledWith(ids.user);
  expect(result.skills).toHaveLength(1);
  expect(result.lessons).toEqual(lessons);
  expect(result.recentMistakes).toHaveLength(20);
  expect(result.recentMistakes[0].answeredAt).toBe(events[23].answeredAt);
  expect(JSON.stringify(result)).not.toContain('private learner text');

  lessons[0].currentUnderstandingLevel = 1;

  expect((await service.getLearningContext(ids.user)).lessons[0].currentUnderstandingLevel).toBe(1);
});
