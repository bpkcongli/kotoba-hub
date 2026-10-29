import type { PracticeQuestion, PracticeSession } from '@/frontend/practice/interfaces/entities';

const id = (n: number) => `b0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const types = ['SHORT_FREE_RESPONSE', 'SLOT_FILL', 'ARRANGE_TOKEN', 'FREE_RESPONSE'] as const;

/** Development examples exercise input variants; they do not represent the published catalog. */
export function practiceQuestionFixture(
  questionType: PracticeQuestion['questionType'] = 'SHORT_FREE_RESPONSE',
  index = 0,
): PracticeQuestion {
  const base = {
    id: id(index + 1),
    skillCode: 'n5_particles_wa_ga_o',
    difficultyBand: 'STANDARD' as const,
    sortOrder: index + 1,
  };
  const inputMethod = { acceptsRomaji: true, transformsTo: 'KANA' } as const;

  switch (questionType) {
    case 'SHORT_FREE_RESPONSE':
      return {
        ...base,
        questionType,
        gradingStrategy: 'DETERMINISTIC',
        promptPayload: {
          schemaVersion: 1,
          promptLanguage: 'JA',
          answerLanguage: 'JA',
          slotCount: 1,
          sentenceTemplate: 'わたし___がくせいです。',
          sentenceTemplateHtml:
            '<p>わたし<span class="question-blank">___</span>がくせいです。</p>',
          blankInputMode: 'ROMAJI_TO_KANA',
          placeholder: 'Answer here',
          inputMethod,
        },
      };

    case 'SLOT_FILL':
      return {
        ...base,
        questionType,
        gradingStrategy: 'DETERMINISTIC',
        promptPayload: {
          schemaVersion: 1,
          promptLanguage: 'JA',
          optionLanguage: 'JA',
          slotCount: 1,
          sentenceTemplate: 'わたし___がくせいです。',
          options: [
            { id: 'a', label: 'は' },
            { id: 'b', label: 'が' },
            { id: 'c', label: 'を' },
            { id: 'd', label: 'に' },
          ],
        },
      };

    case 'ARRANGE_TOKEN':
      return {
        ...base,
        questionType,
        gradingStrategy: 'DETERMINISTIC',
        promptPayload: {
          schemaVersion: 1,
          promptLanguage: 'EN',
          answerLanguage: 'JA',
          direction: 'EN_TO_JA',
          sourceSentence: 'I am a student.',
          arrangeTokens: [
            { id: 't3', label: 'がくせい' },
            { id: 't1', label: 'わたし' },
            { id: 't4', label: 'です' },
            { id: 't2', label: 'は' },
          ],
        },
      };

    case 'FREE_RESPONSE':
      return {
        ...base,
        questionType,
        gradingStrategy: 'AI',
        promptPayload: {
          schemaVersion: 1,
          promptLanguage: 'EN',
          answerLanguage: 'JA',
          sourceSentence: 'I am a student.',
          inputMethod,
        },
      };
  }
}

export function practiceSessionFixture(
  patch: Partial<PracticeSession> & { questionCount?: number } = {},
): PracticeSession {
  const { questionCount = 5, ...overrides } = patch;
  const questions =
    patch.questions ??
    Array.from({ length: questionCount }, (_, i) =>
      practiceQuestionFixture(types[i % types.length], i),
    );

  return {
    id: id(100),
    status: 'GENERATED',
    difficultyBand: 'STANDARD',
    questionMix: { WEAK: 0.6, REINFORCEMENT: 0.3, STRETCH: 0.1 },
    totalQuestions: questions.length,
    answeredQuestionsCount: 0,
    startedAt: '2026-10-30T03:00:00.000Z',
    questions,
    ...overrides,
  };
}
