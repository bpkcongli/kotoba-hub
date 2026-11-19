import { MasteryCalculator } from '@/backend/progress/domain/services/mastery-calculator';
import { event, ids } from './fixtures';

const members = [ids.question, ids.skill];
const calculator = new MasteryCalculator();

const attempt = (index: number, member = members[0], score = 100) =>
  event(index, {
    sourceType: 'FLASHCARD',
    lessonId: null,
    unitId: null,
    numericScore: score,
    isCorrect: score === 100,
    gradingMetadata: { flashcardItemId: member },
  });

describe('vocabulary group mastery', () => {
  it('keeps an unseen member at zero regardless of repetitions of another word', () => {
    const history = Array.from({ length: 25 }, (_, i) => attempt(i + 1));

    expect(calculator.calculate(history, 'STANDARD', undefined, members)).toMatchObject({
      masteryScore: 50,
      masteryState: 'WEAK',
      attemptsWindowSize: 20,
      recommendedDifficultyBand: 'STANDARD',
    });
  });

  it('weights members equally and uses the latest 20 attempts for each member', () => {
    const history = [
      attempt(1, members[0], 0),
      ...Array.from({ length: 20 }, (_, i) => attempt(i + 2)),
      attempt(30, members[1], 100),
    ];

    expect(calculator.calculate(history, 'STANDARD', undefined, members).masteryScore).toBe(100);

    expect(
      calculator.calculate([...history, attempt(31, members[1], 0)], 'STANDARD', undefined, members)
        .masteryScore,
    ).toBeLessThan(80);
  });

  it('ignores evidence without a member identity and evidence from a different activity', () => {
    const history = [
      attempt(1),
      attempt(2, 'foreign'),
      event(3, { gradingMetadata: { flashcardItemId: members[1] } }),
    ];

    expect(calculator.calculate(history, 'STANDARD', undefined, members).masteryScore).toBe(50);
  });

  it('uses group scores across distinct sessions before raising the difficulty band', () => {
    const history = [
      {
        ...attempt(1),
        gradingMetadata: { flashcardItemId: members[0], progress: { masteryScoreAfter: 50 } },
      },
      {
        ...attempt(2, members[1]),
        gradingMetadata: { flashcardItemId: members[1], progress: { masteryScoreAfter: 100 } },
      },
      { ...attempt(3), sourceSessionId: ids.question },
    ];

    expect(
      calculator.calculate(history, 'STANDARD', history[2].id, members).recommendedDifficultyBand,
    ).toBe('STRETCH');
  });

  it('rejects empty and duplicate membership', () => {
    expect(() => calculator.calculate([attempt(1)], 'STANDARD', undefined, [])).toThrow();
    expect(() =>
      calculator.calculate([attempt(1)], 'STANDARD', undefined, [members[0], members[0]]),
    ).toThrow();
  });
});
