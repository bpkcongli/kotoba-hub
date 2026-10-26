import { z } from 'zod';

export const assessmentRequestSchema = z.strictObject({
  currentLevel: z.string().min(1).max(50).nullable().optional(),
  targetLevel: z.string().min(1).max(50),
  dailyGoalMinutes: z.number().int().min(1).max(2147483647),
  preferredScript: z.enum(['ROMAJI', 'KANA', 'MIXED']),
  weakSkillFocuses: z.array(z.string().min(1).max(100)),
  note: z.string().max(2000).nullable().optional(),
});

export type AssessmentRequestDto = z.infer<typeof assessmentRequestSchema>;
