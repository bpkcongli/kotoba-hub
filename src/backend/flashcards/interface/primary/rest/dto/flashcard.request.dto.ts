import { z } from 'zod';
import { paginationRequestSchema } from '@/backend/shared/interface/primary/rest/dto/pagination.request.dto';

const slug = z
  .string()
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const contentType = z.enum(['KANJI', 'KANA', 'VOCABULARY']);

export const listFlashcardDecksRequestSchema = paginationRequestSchema
  .extend({
    deckSource: z.enum(['SYSTEM', 'CUSTOM', 'ALL']).default('ALL'),
    contentType: z.enum(['KANJI', 'KANA', 'VOCABULARY', 'ALL']).default('ALL'),
    unitSlug: slug.optional(),
    deckTypes: z
      .string()
      .min(1)
      .max(5000)
      .refine(
        (value) =>
          value
            .split(',')
            .every((type) => type.length > 0 && type.length <= 50 && !type.includes('\u0000')),
        'deckTypes must be a comma-separated list of deck types.',
      )
      .transform((value) => [...new Set(value.split(','))])
      .optional(),
  })
  .strict();

export const createFlashcardDeckRequestSchema = z.strictObject({
  title: z.string().trim().min(1).max(255),
  description: z.string().nullable().optional(),
  deckType: z.string().trim().min(1).max(50),
  contentType,
  unitSlug: slug.nullable().optional(),
  items: z.array(z.uuid()).default([]),
});

export const createFlashcardSessionRequestSchema = z.strictObject({
  deckId: z.uuid(),
  questionScriptMode: z.string().min(1).max(50),
  answerScriptMode: z.string().min(1).max(50),
});

export const submitFlashcardAnswerRequestSchema = z.strictObject({
  itemId: z.uuid(),
  selectedOptionId: z.string().min(1).max(100),
  responseTimeMs: z.number().int().min(0).max(2147483647).nullable().optional(),
});

export const flashcardSessionPathSchema = z.strictObject({ sessionId: z.uuid() });

export type ListFlashcardDecksRequestDto = z.infer<typeof listFlashcardDecksRequestSchema>;
export type CreateFlashcardDeckRequestDto = z.infer<typeof createFlashcardDeckRequestSchema>;
export type CreateFlashcardSessionRequestDto = z.infer<typeof createFlashcardSessionRequestSchema>;
export type SubmitFlashcardAnswerRequestDto = z.infer<typeof submitFlashcardAnswerRequestSchema>;
export type FlashcardSessionPathDto = z.infer<typeof flashcardSessionPathSchema>;
