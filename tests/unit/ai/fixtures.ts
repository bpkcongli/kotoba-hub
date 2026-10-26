import type { AiProviderResult } from '@/backend/shared/application/ports/ai-provider.port';
import type {
  AiContextBundle,
  AiRuntimeConfig,
  GeneratePracticeSessionInput,
  GradePracticeAnswerInput,
  SummarizePlacementInput,
} from '@/backend/shared/application/services/requests/ai-request';
import type { GeneratedPracticeSession } from '@/backend/shared/application/services/responses/ai-response';

export function config(overrides: Partial<AiRuntimeConfig> = {}): AiRuntimeConfig {
  return {
    provider: 'OPENAI',
    apiKey: 'sk-test-private-key',
    generationModel: 'test-generation',
    lightweightModel: 'test-lightweight',
    timeoutMs: 1000,
    maxRetries: 0,
    maxOutputTokens: 1024,
    maxInputChars: 40000,
    retryDelayMs: 0,
    modelCosts: {
      'test-generation': {
        inputPerMillionUsd: 1,
        cachedInputPerMillionUsd: 0.5,
        outputPerMillionUsd: 2,
      },
      'test-lightweight': {
        inputPerMillionUsd: 1,
        cachedInputPerMillionUsd: 0.5,
        outputPerMillionUsd: 2,
      },
    },
    ...overrides,
  };
}

export function context(): AiContextBundle {
  return {
    targetLevel: 'JLPT_N5',
    currentLevel: 'BEGINNER',
    currentUnitSlug: 'n5-kana-basics',
    catalog: [
      {
        skillCode: 'hiragana_a_row',
        title: 'Hiragana A Row',
        lessonSlug: 'hiragana-row-a',
        unitSlug: 'n5-kana-basics',
        trackSlug: 'jlpt-n5-foundation',
      },
    ],
    weakSkillCodes: ['hiragana_a_row'],
    masteredSkillCodes: [],
    recentMistakes: [{ skillCode: 'hiragana_a_row', summary: 'Confused あ with お.' }],
    lessonUnderstanding: [{ lessonSlug: 'hiragana-row-a', level: 1 }],
    allowedQuestionTypes: ['SHORT_FREE_RESPONSE', 'SLOT_FILL', 'ARRANGE_TOKEN', 'FREE_RESPONSE'],
  };
}

export function generationInput(): GeneratePracticeSessionInput {
  return {
    metadata: { requestId: '70000000-0000-4000-8000-000000000001' },
    context: context(),
    questionCount: 1,
    difficultyBand: 'STANDARD',
  };
}

export function placementInput(): SummarizePlacementInput {
  return { ...generationInput(), note: 'private learner note: I know hiragana.' };
}

export function gradingInput(): GradePracticeAnswerInput {
  return {
    metadata: { requestId: '70000000-0000-4000-8000-000000000002' },
    context: context(),
    question: {
      skillCode: 'hiragana_a_row',
      questionType: 'FREE_RESPONSE',
      sourceSentence: 'I am a student.',
      referenceAnswer: 'わたしはがくせいです。',
    },
    userAnswer: {
      rawInputRomaji: 'private learner answer',
      normalizedKana: 'わたしはがくせいです。',
      normalizedKanji: null,
    },
  };
}

export function shortQuestion(): Extract<
  GeneratedPracticeSession['questions'][number],
  { questionType: 'SHORT_FREE_RESPONSE' }
> {
  return {
    skillCode: 'hiragana_a_row',
    difficultyBand: 'STANDARD',
    questionType: 'SHORT_FREE_RESPONSE',
    gradingStrategy: 'DETERMINISTIC',
    promptPayload: {
      schemaVersion: 1,
      promptLanguage: 'JA',
      answerLanguage: 'JA',
      slotCount: 1,
      sentenceTemplate: '___さです。',
      blankInputMode: 'ROMAJI_TO_KANA',
      inputMethod: { acceptsRomaji: true, transformsTo: 'KANA' },
    },
    expectedAnswer: { acceptedTextAnswers: ['あ'] },
  };
}

export function slotQuestion(): Extract<
  GeneratedPracticeSession['questions'][number],
  { questionType: 'SLOT_FILL' }
> {
  return {
    skillCode: 'hiragana_a_row',
    difficultyBand: 'STANDARD',
    questionType: 'SLOT_FILL',
    gradingStrategy: 'DETERMINISTIC',
    promptPayload: {
      schemaVersion: 1,
      promptLanguage: 'JA',
      optionLanguage: 'JA',
      slotCount: 1,
      sentenceTemplate: '___さです。',
      options: ['あ', 'い', 'う', 'え'].map((label, index) => ({ id: `o${index}`, label })),
    },
    expectedAnswer: { correctOptionId: 'o0' },
  };
}

export function arrangeQuestion(): Extract<
  GeneratedPracticeSession['questions'][number],
  { questionType: 'ARRANGE_TOKEN' }
> {
  return {
    skillCode: 'hiragana_a_row',
    difficultyBand: 'STANDARD',
    questionType: 'ARRANGE_TOKEN',
    gradingStrategy: 'DETERMINISTIC',
    promptPayload: {
      schemaVersion: 1,
      promptLanguage: 'EN',
      answerLanguage: 'JA',
      direction: 'EN_TO_JA',
      sourceSentence: 'It is morning.',
      arrangeTokens: [
        { id: 't1', label: 'あさ' },
        { id: 't2', label: 'です' },
      ],
    },
    expectedAnswer: { acceptedTokenOrders: [['t1', 't2']] },
  };
}

export function freeQuestion(): Extract<
  GeneratedPracticeSession['questions'][number],
  { questionType: 'FREE_RESPONSE' }
> {
  return {
    skillCode: 'hiragana_a_row',
    difficultyBand: 'STANDARD',
    questionType: 'FREE_RESPONSE',
    gradingStrategy: 'AI',
    promptPayload: {
      schemaVersion: 1,
      promptLanguage: 'EN',
      answerLanguage: 'JA',
      sourceSentence: 'I am a student.',
      inputMethod: { acceptsRomaji: true, transformsTo: 'KANA' },
    },
    expectedAnswer: { referenceAnswer: 'わたしはがくせいです。' },
  };
}

export function providerResult(output: unknown): AiProviderResult {
  return {
    outputText: JSON.stringify(output),
    providerRequestId: 'provider-request-test',
    usage: { inputTokens: 100, cachedInputTokens: 20, outputTokens: 50, totalTokens: 150 },
  };
}

export const placementOutput = {
  suggestedKnownSkillClaims: [{ skillCode: 'hiragana_a_row', confidence: 0.9 }],
};

export const gradingOutput = {
  isCorrect: true,
  numericScore: 100,
  feedbackText: 'Your sentence expresses the requested meaning.',
};

export const recommendationOutput = {
  recommendedTrackSlug: 'jlpt-n5-foundation',
  recommendedUnitSlug: 'n5-kana-basics',
  nextLessonSlug: 'hiragana-row-a',
  targetSkillCodes: ['hiragana_a_row'],
  difficultyBand: 'STANDARD',
  allowedQuestionTypes: ['SHORT_FREE_RESPONSE'],
};
