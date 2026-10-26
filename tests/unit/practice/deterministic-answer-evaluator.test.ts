import type { PracticeQuestion } from '@/backend/practice/domain/repositories/practice.repository';
import { DeterministicAnswerEvaluator } from '@/backend/practice/domain/services/deterministic-answer-evaluator';
import { shortQuestion } from './fixtures';

type Question = Pick<PracticeQuestion, 'questionType' | 'promptPayload' | 'expectedAnswer'>;

const evaluator = new DeterministicAnswerEvaluator();

const slotQuestion: Question = {
  questionType: 'SLOT_FILL',
  promptPayload: {
    options: [
      { id: 'topic', label: 'は' },
      { id: 'subject', label: 'が' },
      { id: 'object', label: 'を' },
      { id: 'destination', label: 'に' },
    ],
  },
  expectedAnswer: { correctOptionId: 'topic' },
};

const arrangeQuestion: Question = {
  questionType: 'ARRANGE_TOKEN',
  promptPayload: {
    arrangeTokens: [
      { id: 'a', label: 'わたし' },
      { id: 'b', label: 'は' },
      { id: 'c', label: 'がくせいです' },
    ],
  },
  expectedAnswer: { acceptedTokenOrders: [['a', 'b', 'c']] },
};

describe('deterministic practice grading', () => {
  it('accepts the canonical kana answer and returns a rule-engine result', () => {
    expect(
      evaluator.evaluate(shortQuestion, { rawInputRomaji: 'wa', normalizedKana: 'は' }),
    ).toMatchObject({
      isCorrect: true,
      numericScore: 100,
      gradingSource: 'RULE_ENGINE',
      gradingMetadata: {
        gradingStrategy: 'DETERMINISTIC',
        matchedAnswerKeys: ['normalizedKana'],
        accepted: true,
      },
    });
  });

  it('normalizes Unicode width and surrounding whitespace without changing kana script', () => {
    const question: Question = {
      ...shortQuestion,
      expectedAnswer: { acceptedTextAnswers: ['ガク'] },
    };

    expect(
      evaluator.evaluate(question, { rawInputRomaji: 'gaku', normalizedKana: '　ｶﾞｸ ' }).isCorrect,
    ).toBe(true);
    expect(
      evaluator.evaluate(question, { rawInputRomaji: 'gaku', normalizedKana: 'がく' }).isCorrect,
    ).toBe(false);
  });

  it.each(['が', 'はです', 'は。', ''])(
    'does not accept a partial or different text %j',
    (text) => {
      expect(
        evaluator.evaluate(shortQuestion, { rawInputRomaji: 'wa', normalizedKana: text }),
      ).toMatchObject({
        isCorrect: false,
        numericScore: 0,
        gradingMetadata: { matchedAnswerKeys: [], accepted: false },
      });
    },
  );

  it('does not grade raw romaji in place of the submitted Japanese answer', () => {
    expect(
      evaluator.evaluate(shortQuestion, { rawInputRomaji: 'は', normalizedKana: 'が' }).isCorrect,
    ).toBe(false);
  });

  it('accepts an explicitly curated kanji alternative', () => {
    const question: Question = {
      ...shortQuestion,
      expectedAnswer: { acceptedTextAnswers: ['がっこう', '学校'] },
    };

    expect(
      evaluator.evaluate(question, {
        rawInputRomaji: 'gakko',
        normalizedKana: 'がっこ',
        normalizedKanji: '学校',
      }),
    ).toMatchObject({
      isCorrect: true,
      gradingMetadata: { matchedAnswerKeys: ['normalizedKanji'] },
    });
  });

  it('compares slot option identity rather than answer text', () => {
    expect(evaluator.evaluate(slotQuestion, { selectedOptionId: 'topic' }).isCorrect).toBe(true);
    expect(evaluator.evaluate(slotQuestion, { selectedOptionId: 'subject' })).toMatchObject({
      isCorrect: false,
      numericScore: 0,
    });
    expect(() => evaluator.evaluate(slotQuestion, { selectedOptionId: 'は' })).toThrow();
  });

  it('accepts only a curated complete token order', () => {
    expect(
      evaluator.evaluate(arrangeQuestion, { arrangedTokenIds: ['a', 'b', 'c'] }).isCorrect,
    ).toBe(true);
    expect(
      evaluator.evaluate(arrangeQuestion, { arrangedTokenIds: ['b', 'a', 'c'] }),
    ).toMatchObject({ isCorrect: false, numericScore: 0 });
  });

  it.each([
    ['a', 'a', 'c'],
    ['a', 'b'],
    ['a', 'b', 'forged'],
    ['a', 'b', 'c', 'c'],
  ])('rejects duplicated, missing, or unknown tokens %j', (...arrangedTokenIds) => {
    expect(() => evaluator.evaluate(arrangeQuestion, { arrangedTokenIds })).toThrow();
  });

  it('accepts an explicitly curated alternative token order', () => {
    expect(
      evaluator.evaluate(
        {
          ...arrangeQuestion,
          expectedAnswer: {
            acceptedTokenOrders: [
              ['a', 'b', 'c'],
              ['c', 'a', 'b'],
            ],
          },
        },
        { arrangedTokenIds: ['c', 'a', 'b'] },
      ).isCorrect,
    ).toBe(true);
  });

  it('rejects an answer shape belonging to another question type', () => {
    expect(() => evaluator.evaluate(shortQuestion, { selectedOptionId: 'topic' })).toThrow();
    expect(() => evaluator.evaluate(slotQuestion, { arrangedTokenIds: ['a', 'b', 'c'] })).toThrow();
    expect(() =>
      evaluator.evaluate(arrangeQuestion, { rawInputRomaji: 'wa', normalizedKana: 'は' }),
    ).toThrow();
  });

  it('never falls back to deterministic grading for full free response', () => {
    expect(() =>
      evaluator.evaluate(
        { ...shortQuestion, questionType: 'FREE_RESPONSE' },
        { rawInputRomaji: 'wa', normalizedKana: 'は' },
      ),
    ).toThrow();
  });
});
