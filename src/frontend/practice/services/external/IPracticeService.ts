import type {
  PracticeSession,
  PracticeAnswerResult,
  LessonQuiz,
  LessonQuizResult,
} from '@/frontend/practice/interfaces/entities';
import type {
  GeneratePracticeRequest,
  PracticeAnswerRequest,
  LessonAnswerRequest,
} from '@/frontend/practice/interfaces/requests';

export interface IPracticeService {
  generateSession(request: GeneratePracticeRequest, signal?: AbortSignal): Promise<PracticeSession>;

  submitAnswer(
    sessionId: string,
    request: PracticeAnswerRequest,
    signal?: AbortSignal,
  ): Promise<PracticeAnswerResult>;

  getLessonQuestion(lessonSlug: string, signal?: AbortSignal): Promise<LessonQuiz>;

  submitLessonAnswer(
    request: LessonAnswerRequest,
    idempotencyKey: string,
    signal?: AbortSignal,
  ): Promise<LessonQuizResult>;
}
