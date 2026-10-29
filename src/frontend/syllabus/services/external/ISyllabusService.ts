import type {
  SyllabusTrack,
  SyllabusUnit,
  SyllabusLesson,
  LessonQuiz,
} from '@/frontend/syllabus/interfaces/entities';

export interface ISyllabusService {
  getTracks(signal?: AbortSignal): Promise<SyllabusTrack[]>;

  getUnit(slug: string, signal?: AbortSignal): Promise<SyllabusUnit>;

  getLesson(slug: string, signal?: AbortSignal): Promise<SyllabusLesson>;

  getNextQuiz(slug: string, signal?: AbortSignal): Promise<LessonQuiz>;
}
