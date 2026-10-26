import { z } from 'zod';

const text = z.string().min(1).max(2000);

export const questionTypeSchema = z.enum([
  'SHORT_FREE_RESPONSE',
  'SLOT_FILL',
  'ARRANGE_TOKEN',
  'FREE_RESPONSE',
]);

export const difficultySchema = z.enum(['REMEDIAL', 'STANDARD', 'STRETCH']);

const inputMethod = z.strictObject({
  acceptsRomaji: z.literal(true),
  transformsTo: z.literal('KANA'),
});

const baseQuestion = { skillCode: text, difficultyBand: difficultySchema };

const choice = z.strictObject({ id: z.string().min(1).max(50), label: text });

const shortQuestion = z.strictObject({
  ...baseQuestion,
  questionType: z.literal('SHORT_FREE_RESPONSE'),
  gradingStrategy: z.literal('DETERMINISTIC'),
  promptPayload: z.strictObject({
    schemaVersion: z.literal(1),
    promptLanguage: z.literal('JA'),
    answerLanguage: z.literal('JA'),
    slotCount: z.literal(1),
    sentenceTemplate: text,
    blankInputMode: z.literal('ROMAJI_TO_KANA'),
    inputMethod,
  }),
  expectedAnswer: z.strictObject({ acceptedTextAnswers: z.array(text).min(1).max(20) }),
});

const slotQuestion = z.strictObject({
  ...baseQuestion,
  questionType: z.literal('SLOT_FILL'),
  gradingStrategy: z.literal('DETERMINISTIC'),
  promptPayload: z.strictObject({
    schemaVersion: z.literal(1),
    promptLanguage: z.literal('JA'),
    optionLanguage: z.literal('JA'),
    slotCount: z.literal(1),
    sentenceTemplate: text,
    options: z.array(choice).length(4),
  }),
  expectedAnswer: z.strictObject({ correctOptionId: text }),
});

const arrangeQuestion = z.strictObject({
  ...baseQuestion,
  questionType: z.literal('ARRANGE_TOKEN'),
  gradingStrategy: z.literal('DETERMINISTIC'),
  promptPayload: z.strictObject({
    schemaVersion: z.literal(1),
    promptLanguage: z.enum(['EN', 'JA']),
    answerLanguage: z.enum(['EN', 'JA']),
    direction: z.enum(['EN_TO_JA', 'JA_TO_EN']),
    sourceSentence: text,
    arrangeTokens: z.array(choice).min(2).max(30),
  }),
  expectedAnswer: z.strictObject({
    acceptedTokenOrders: z.array(z.array(text).min(2).max(30)).min(1).max(10),
  }),
});

const freeQuestion = z.strictObject({
  ...baseQuestion,
  questionType: z.literal('FREE_RESPONSE'),
  gradingStrategy: z.literal('AI'),
  promptPayload: z.strictObject({
    schemaVersion: z.literal(1),
    promptLanguage: z.literal('EN'),
    answerLanguage: z.literal('JA'),
    sourceSentence: text,
    inputMethod,
  }),
  expectedAnswer: z.strictObject({ referenceAnswer: text }),
});

export const generatedPracticeSchema = z.strictObject({
  questions: z
    .array(z.union([shortQuestion, slotQuestion, arrangeQuestion, freeQuestion]))
    .min(1)
    .max(20),
});

export const gradedAnswerSchema = z.strictObject({
  isCorrect: z.boolean(),
  numericScore: z.number().min(0).max(100),
  feedbackText: z.string().min(1).max(500),
});

export const placementSchema = z.strictObject({
  suggestedKnownSkillClaims: z
    .array(z.strictObject({ skillCode: text, confidence: z.number().min(0).max(1) }))
    .max(100),
});

export const recommendationSchema = z.strictObject({
  recommendedTrackSlug: text,
  recommendedUnitSlug: text,
  nextLessonSlug: text,
  targetSkillCodes: z.array(text).min(1).max(100),
  difficultyBand: difficultySchema,

  allowedQuestionTypes: z.array(questionTypeSchema).min(1).max(4),
});

export const contextSchema = z.strictObject({
  targetLevel: z.enum(['JLPT_N5', 'JLPT_N4', 'JLPT_N3', 'JLPT_N2']),
  currentLevel: z.enum(['BEGINNER', 'JLPT_N5', 'JLPT_N4', 'JLPT_N3', 'JLPT_N2']).nullable(),
  currentUnitSlug: text.nullable(),
  catalog: z
    .array(
      z.strictObject({
        skillCode: text,
        title: text,
        lessonSlug: text,
        unitSlug: text,
        trackSlug: text,
      }),
    )
    .min(1)
    .max(500),
  weakSkillCodes: z.array(text).max(500),
  masteredSkillCodes: z.array(text).max(500),
  recentMistakes: z
    .array(z.strictObject({ skillCode: text, summary: z.string().min(1).max(500) }))
    .max(20),
  lessonUnderstanding: z
    .array(z.strictObject({ lessonSlug: text, level: z.number().int().min(0).max(10) }))
    .max(500),
  allowedQuestionTypes: z.array(questionTypeSchema).max(4),
});
