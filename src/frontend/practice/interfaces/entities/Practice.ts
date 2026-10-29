import type { z } from 'zod';
import type {
  practiceQuestionSchema,
  practiceSessionSchema,
  practiceAnswerResultSchema,
  lessonQuizResultSchema,
} from '@/frontend/practice/interfaces/responses';

export type PracticeQuestion = z.infer<typeof practiceQuestionSchema>;

export type PracticeSession = z.infer<typeof practiceSessionSchema>;

export type PracticeAnswerResult = z.infer<typeof practiceAnswerResultSchema>;

export type LessonQuizResult = z.infer<typeof lessonQuizResultSchema>;

export type { LessonQuiz } from '@/frontend/syllabus/interfaces/entities';
