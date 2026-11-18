import { z } from 'zod';
import { localeSchema } from '@/shared/locale';

const text = z.string().min(1).max(2000);

export const practiceTextAnswerSchema = z.strictObject({
  rawInputRomaji: z.string().max(2000),
  normalizedKana: text,
  normalizedKanji: text.nullable().optional(),
});

export const practiceUserAnswerSchema = z.union([
  practiceTextAnswerSchema,
  z.strictObject({ selectedOptionId: z.string().min(1).max(100) }),
  z.strictObject({ arrangedTokenIds: z.array(z.string().min(1).max(100)).min(1).max(30) }),
]);

const responseTimeMs = z.number().int().min(0).max(2147483647).nullable().optional();

export const generatePracticeSessionRequestSchema = z.union([
  z.strictObject({ questionCount: z.number().int().min(1).max(10).default(5) }),
  z.strictObject({
    questionCount: z.number().int().min(1).max(10).default(5),
    contentFormat: z.literal('localized'),
    contentLocale: localeSchema.optional(),
  }),
]);

export const practiceSessionPathSchema = z.strictObject({ sessionId: z.uuid() });

export const submitPracticeAnswerRequestSchema = z.strictObject({
  questionId: z.uuid(),
  userAnswer: practiceUserAnswerSchema,
  responseTimeMs,
});

export const lessonPostStudyNextRequestSchema = z.union([
  z.strictObject({ lessonSlug: z.string().min(1).max(255) }),
  z.strictObject({
    lessonSlug: z.string().min(1).max(255),
    contentFormat: z.literal('localized'),
    contentLocale: localeSchema.optional(),
  }),
]);

const legacyLessonAnswerSchema = z.strictObject({
  lessonSlug: z.string().min(1).max(255),
  questionId: z.uuid(),
  userAnswer: practiceTextAnswerSchema,
  responseTimeMs,
});

export const lessonPostStudyAnswerRequestSchema = z.union([
  legacyLessonAnswerSchema,
  legacyLessonAnswerSchema.extend({ contentFormat: z.literal('localized'), deliveryId: z.uuid() }),
]);

export const idempotencyKeySchema = z.uuid();

export type GeneratePracticeSessionRequestDto = z.infer<
  typeof generatePracticeSessionRequestSchema
>;

export type SubmitPracticeAnswerRequestDto = z.infer<typeof submitPracticeAnswerRequestSchema>;

export type LessonPostStudyNextRequestDto = z.infer<typeof lessonPostStudyNextRequestSchema>;

export type LessonPostStudyAnswerRequestDto = z.infer<typeof lessonPostStudyAnswerRequestSchema>;
