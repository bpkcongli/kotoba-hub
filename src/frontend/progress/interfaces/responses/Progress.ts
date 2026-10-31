import { z } from 'zod';
import { apiStatusSchema } from '@/frontend/shared/interfaces/responses';

const count = z.number().int().nonnegative();
const score = z.number().min(0).max(100);
const date = z.iso.datetime({ offset: true });
const sourceType = z.enum(['FLASHCARD', 'PRACTICE', 'LESSON_POST_STUDY']);
const status = apiStatusSchema.extend({ code: z.literal(120007000) });

export const paginationSchema = z.object({
  pageNumber: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalRecords: count,
});

export const progressOverviewSchema = z.object({
  trackedSkillsCount: count,
  masteredSkillsCount: count,
  developingSkillsCount: count,
  weakSkillsCount: count,
  averageMasteryScore: score,
  recommendedDifficultyBand: z.string().min(1),
  lastActivityAt: date.nullable(),
  lessonUnderstandingSummary: z.object({
    trackedLessonsCount: count,
    completedLessonsCount: count,
    averageUnderstandingLevel: z.number().min(0).max(10),
    maxUnderstandingLevel: z.literal(10),
  }),
  trackSummaries: z.array(
    z.object({
      trackSlug: z.string().min(1),
      trackTitle: z.string().min(1),
      trackedSkillsCount: count,
      masteredSkillsCount: count,
      averageMasteryScore: score,
      lastActivityAt: date.nullable(),
    }),
  ),
});

export const progressSessionSchema = z.object({
  sourceType,
  sourceSessionId: z.uuid().nullable(),
  sessionStatus: z.string().min(1),
  sessionTitle: z.string().min(1),
  trackSlug: z.string().nullable(),
  unitSlug: z.string().nullable(),
  startedAt: date.nullable(),
  completedAt: date.nullable(),
  lastActivityAt: date.nullable(),
  totalInteractions: count,
  correctCount: count,
  incorrectCount: count,
  averageScore: score.nullable(),
});

export const progressEventSchema = z.object({
  id: z.uuid(),
  sourceType,
  sourceSessionId: z.uuid().nullable(),
  sourceEntityId: z.uuid(),
  questionType: z.string().min(1),
  skillCode: z.string().min(1),
  skillTitle: z.string().min(1),
  trackSlug: z.string().min(1),
  unitSlug: z.string().min(1),
  lessonSlug: z.string().min(1),
  isCorrect: z.boolean(),
  numericScore: score,
  confidenceWeight: z.number().min(0).max(1).nullable(),
  responseTimeMs: count.nullable(),
  answeredAt: date,
});

export const progressOverviewResponseSchema = z.object({ status, data: progressOverviewSchema });

export const progressSessionsResponseSchema = z.object({
  status,
  data: z.object({ progressSessions: z.array(progressSessionSchema) }),
  metadata: z.object({ pagination: paginationSchema }),
});

export const progressTimelineResponseSchema = z.object({
  status,
  data: z.object({ progressEvents: z.array(progressEventSchema) }),
  metadata: z.object({ pagination: paginationSchema }),
});
