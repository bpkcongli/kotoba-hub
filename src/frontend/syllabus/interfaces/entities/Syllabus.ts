import type { z } from 'zod';
import type {
  trackSchema,
  unitSchema,
  lessonSchema,
  nextQuizSchema,
  contentBlockSchema,
} from '@/frontend/syllabus/interfaces/responses';

export type SyllabusTrack = z.infer<typeof trackSchema>;

export type SyllabusUnit = z.infer<typeof unitSchema>;

export type SyllabusLesson = z.infer<typeof lessonSchema>;

export type LessonQuiz = z.infer<typeof nextQuizSchema>;

export type LessonContentBlock = z.infer<typeof contentBlockSchema>;
