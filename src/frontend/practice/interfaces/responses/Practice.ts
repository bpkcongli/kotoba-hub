import { z } from 'zod';
import { apiStatusSchema } from '@/frontend/shared/interfaces/responses';
import { nextQuizSchema } from '@/frontend/syllabus/interfaces/responses';

const id = z.uuid();
const level = z.number().int().min(0).max(10);
const difficulty = z.enum(['REMEDIAL', 'STANDARD', 'STRETCH']);
const text = z.string().min(1);
const option = z.object({ id: text, label: text });
const inputMethod = z.object({ acceptsRomaji: z.literal(true), transformsTo: z.literal('KANA') });

const questionBase = z.object({
  id,
  skillCode: text,
  difficultyBand: difficulty,
  sortOrder: z.number().int(),
});

const shortPrompt = z.object({
  schemaVersion: z.literal(1),
  promptLanguage: z.literal('JA'),
  answerLanguage: z.literal('JA'),
  slotCount: z.literal(1),
  sentenceTemplate: text,
  sentenceTemplateHtml: text,
  blankInputMode: z.literal('ROMAJI_TO_KANA'),
  placeholder: z.string().nullish(),
  inputMethod,
});

export const practiceQuestionSchema = z.discriminatedUnion('questionType', [
  questionBase.extend({
    questionType: z.literal('SHORT_FREE_RESPONSE'),
    gradingStrategy: z.literal('DETERMINISTIC'),
    promptPayload: shortPrompt,
  }),

  questionBase.extend({
    questionType: z.literal('SLOT_FILL'),
    gradingStrategy: z.literal('DETERMINISTIC'),
    promptPayload: z.object({
      schemaVersion: z.literal(1),
      promptLanguage: z.literal('JA'),
      optionLanguage: z.literal('JA'),
      slotCount: z.literal(1),
      sentenceTemplate: text,
      options: z
        .array(option)
        .length(4)
        .refine((a) => new Set(a.map((o) => o.id)).size === a.length),
    }),
  }),

  questionBase.extend({
    questionType: z.literal('ARRANGE_TOKEN'),
    gradingStrategy: z.literal('DETERMINISTIC'),
    promptPayload: z.object({
      schemaVersion: z.literal(1),
      promptLanguage: z.enum(['JA', 'EN']),
      answerLanguage: z.enum(['JA', 'EN']),
      direction: z.enum(['EN_TO_JA', 'JA_TO_EN']),
      sourceSentence: text,
      arrangeTokens: z
        .array(option)
        .min(1)
        .max(30)
        .refine((a) => new Set(a.map((o) => o.id)).size === a.length),
    }),
  }),

  questionBase.extend({
    questionType: z.literal('FREE_RESPONSE'),
    gradingStrategy: z.literal('AI'),
    promptPayload: z.object({
      schemaVersion: z.literal(1),
      promptLanguage: z.literal('EN'),
      answerLanguage: z.literal('JA'),
      sourceSentence: text,
      inputMethod,
    }),
  }),
]);

export const practiceSessionSchema = z
  .object({
    id,
    status: z.enum(['GENERATED', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED']),
    difficultyBand: difficulty,
    questionMix: z.object({
      WEAK: z.number().min(0).max(1),
      REINFORCEMENT: z.number().min(0).max(1),
      STRETCH: z.number().min(0).max(1),
    }),
    totalQuestions: z.number().int().min(1).max(10),
    answeredQuestionsCount: z.number().int().nonnegative(),
    startedAt: z.iso.datetime({ offset: true }),
    questions: z.array(practiceQuestionSchema).min(1).max(10),
  })
  .refine(
    (s) =>
      s.questions.length === s.totalQuestions &&
      new Set(s.questions.map((q) => q.id)).size === s.totalQuestions,
  );

const impact = z
  .object({
    progressEventId: id,
    skillCode: text,
    masteryScore: z.number().min(0).max(100),
    masteryState: z.enum(['WEAK', 'DEVELOPING', 'STABLE', 'MASTERED']),
    recommendedDifficultyBand: difficulty,
  })
  .nullable();

const grade = z.object({
  isCorrect: z.boolean(),
  numericScore: z.number().min(0).max(100),
  feedbackText: z.string().nullable(),
  gradingSource: z.enum(['RULE_ENGINE', 'AI_PROVIDER']),
});

export const practiceAnswerResultSchema = grade.extend({
  sessionId: id,
  questionId: id,
  answerId: id,
  gradingMetadata: z.object({
    gradingStrategy: z.enum(['DETERMINISTIC', 'AI']),
    matchedAnswerKeys: z.array(z.string()).optional(),
    accepted: z.boolean().optional(),
  }),
  sessionProgress: z.object({
    answeredQuestionsCount: z.number().int().nonnegative(),
    totalQuestions: z.number().int().positive(),
    isCompleted: z.boolean(),
  }),
  nextQuestionId: id.nullable(),
  progressImpact: impact,
});

export const lessonQuizResultSchema = grade.extend({
  lessonSlug: text,
  questionId: id,
  gradingSource: z.literal('RULE_ENGINE'),
  understandingProgress: z.object({
    currentUnderstandingLevelBefore: level,
    currentUnderstandingLevelAfter: level,
    targetDifficultyLevel: z.number().int().min(1).max(10),
    maxUnderstandingLevel: z.literal(10),
    postStudyQuizCompleted: z.boolean(),
    nextReviewDifficultyLevel: z.number().int().min(1).max(10),
  }),
  progressImpact: impact,
});

const status = apiStatusSchema.extend({ code: z.literal(120006000) });
export const practiceSessionResponseSchema = z.object({ status, data: practiceSessionSchema });
export const practiceAnswerResponseSchema = z.object({ status, data: practiceAnswerResultSchema });
export const lessonQuestionResponseSchema = z.object({ status, data: nextQuizSchema });
export const lessonAnswerResponseSchema = z.object({ status, data: lessonQuizResultSchema });
