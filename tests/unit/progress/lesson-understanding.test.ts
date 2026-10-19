import { LessonUnderstandingCalculator } from '@/backend/progress/domain/services/lesson-understanding-calculator';
import { emptyLesson, event } from './fixtures';

describe('post-study lesson understanding', () => {
  const calculator = new LessonUnderstandingCalculator();
  const attempt = (index: number, correct = true) =>
    event(index, {
      sourceType: 'LESSON_POST_STUDY',
      sourceSessionId: null,
      isCorrect: correct,
      numericScore: correct ? 100 : 0,
    });

  it('keeps a lesson incomplete after a wrong answer, then completes it on 0 -> 1', () => {
    const wrong = calculator.advance(emptyLesson(), attempt(1, false), 1);
    const correct = calculator.advance(wrong, attempt(2), 1);

    expect(wrong).toMatchObject({
      currentUnderstandingLevel: 0,
      totalAttemptCount: 1,
      totalCorrectCount: 0,
      lastCorrectAt: null,
      lastCorrectDifficultyLevel: null,
    });
    expect(correct).toMatchObject({
      currentUnderstandingLevel: 1,
      totalAttemptCount: 2,
      totalCorrectCount: 1,
      lastCorrectDifficultyLevel: 1,
      lastCorrectAt: attempt(2).answeredAt,
    });
  });

  it('advances one level per correct review and caps understanding at ten', () => {
    let snapshot = emptyLesson();

    for (let index = 1; index <= 12; index += 1) {
      snapshot = calculator.advance(snapshot, attempt(index), Math.min(index, 10));

      expect(snapshot.currentUnderstandingLevel).toBe(Math.min(index, 10));
    }

    const wrong = calculator.advance(snapshot, attempt(13, false), 10);

    expect(wrong).toMatchObject({
      currentUnderstandingLevel: 10,
      totalAttemptCount: 13,
      totalCorrectCount: 12,
      lastCorrectDifficultyLevel: 10,
      lastCorrectAt: attempt(12).answeredAt,
      lastAttemptedAt: attempt(13).answeredAt,
    });
  });

  it('rejects skipped difficulty and chronological regressions', () => {
    expect(() => calculator.advance(emptyLesson(), attempt(1), 2)).toThrow();

    const first = calculator.advance(emptyLesson(), attempt(2), 1);

    expect(() => calculator.advance(first, attempt(1), 2)).toThrow();
    expect(first.currentUnderstandingLevel).toBe(1);
  });
});
