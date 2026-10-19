import { MasteryCalculator } from '@/backend/progress/domain/services/mastery-calculator';
import { event } from './fixtures';

describe('skill mastery policy', () => {
  const calculator = new MasteryCalculator();

  it('uses the latest twenty attempts, regardless of input order', () => {
    const attempts = [
      event(0, { isCorrect: false, numericScore: 0, confidenceWeight: 0 }),
      ...Array.from({ length: 20 }, (_, index) => event(index + 1)),
    ].reverse();

    expect(calculator.calculate(attempts)).toMatchObject({
      attemptsWindowSize: 20,
      correctAttemptsCount: 20,
      masteryScore: 100,
      lastProgressEventId: event(20).id,
      lastActivityAt: event(20).answeredAt,
    });
  });

  it('keeps small sample counts and gives recent answers more influence', () => {
    const olderWrong = event(1, { isCorrect: false, numericScore: 0, confidenceWeight: 0.5 });
    const newerCorrect = event(2, { confidenceWeight: 0.5 });

    const improving = calculator.calculate([newerCorrect, olderWrong]);
    const declining = calculator.calculate([
      event(1, { confidenceWeight: 0.5 }),
      event(2, { isCorrect: false, numericScore: 0, confidenceWeight: 0.5 }),
    ]);

    expect(improving).toMatchObject({
      attemptsWindowSize: 2,
      correctAttemptsCount: 1,
      accuracyScore: 50,
      recencyScore: 66.67,
      confidenceScore: 50,
      masteryScore: 53.33,
    });
    expect(declining.masteryScore).toBe(46.67);
  });

  it('allocates ten percent to confidence without overriding answer accuracy', () => {
    expect(calculator.calculate([event(1, { confidenceWeight: 0 })]).masteryScore).toBe(90);
    expect(
      calculator.calculate([
        event(1, {
          numericScore: 0,
          isCorrect: false,
          confidenceWeight: 1,
        }),
      ]).masteryScore,
    ).toBe(10);
  });

  it.each([
    [80, 0.8, 'STRETCH'],
    [50, 0.5, 'REMEDIAL'],
  ] as const)(
    'requires two distinct sessions at the inclusive %s threshold',
    (score, confidence, band) => {
      const older = event(1, {
        numericScore: score,
        confidenceWeight: confidence,
        gradingMetadata: { progress: { masteryScoreAfter: score } },
      });
      const latest = event(2, { numericScore: score, confidenceWeight: confidence });

      expect(calculator.calculate([older, latest]).recommendedDifficultyBand).toBe('STANDARD');
      expect(
        calculator.calculate([older, { ...latest, sourceSessionId: 'another-session' }])
          .recommendedDifficultyBand,
      ).toBe(band);
    },
  );

  it('does not count direct lesson reviews as sessions or discard a prior band without evidence', () => {
    const reviews = [1, 2].map((index) =>
      event(index, {
        sourceType: 'LESSON_POST_STUDY',
        sourceSessionId: null,
        gradingMetadata: { progress: { masteryScoreAfter: 100 } },
      }),
    );

    expect(calculator.calculate(reviews).recommendedDifficultyBand).toBe('STANDARD');
    expect(calculator.calculate([event()], 'REMEDIAL').recommendedDifficultyBand).toBe('REMEDIAL');
  });

  it('retains actual session evidence when an older answer arrives late', () => {
    const late = event(1, {
      sourceType: 'LESSON_POST_STUDY',
      sourceSessionId: null,
      isCorrect: false,
      numericScore: 0,
      confidenceWeight: 0,
    });
    const firstSession = event(2, {
      numericScore: 80,
      confidenceWeight: 0.8,
      gradingMetadata: { progress: { masteryScoreAfter: 80 } },
    });
    const secondSession = event(3, {
      sourceSessionId: 'another-session',
      numericScore: 80,
      confidenceWeight: 0.8,
      gradingMetadata: { progress: { masteryScoreAfter: 80 } },
    });

    const result = calculator.calculate([late, firstSession, secondSession], 'STANDARD', late.id);

    expect(result.masteryScore).toBeLessThan(80);
    expect(result.recommendedDifficultyBand).toBe('STRETCH');
  });
});
