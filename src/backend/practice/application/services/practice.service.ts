import type {
  AnswerResult,
  LessonAnswerResult,
  PracticeSession,
  UserAnswer,
} from '@/backend/practice/domain/repositories/practice.repository';

export interface SubmitPracticeAnswerRequest {
  questionId: string;
  userAnswer: UserAnswer;
  responseTimeMs?: number | null;
}

export interface SubmitLessonAnswerRequest extends SubmitPracticeAnswerRequest {
  lessonSlug: string;
  idempotencyKey?: string;
}

export interface LessonNextResult {
  lessonSlug: string;
  currentUnderstandingLevel: number;
  targetUnderstandingLevel: number;
  targetDifficultyLevel: number;
  isReview: boolean;
  question: {
    id: string;
    skillCode: string;
    questionType: 'SHORT_FREE_RESPONSE';
    gradingStrategy: 'DETERMINISTIC';
    difficultyLevel: number;
    promptPayload: Record<string, unknown>;
  };
}

export interface PracticeService {
  generateSession(userId: string, questionCount?: number): Promise<PracticeSession>;

  submitAnswer(
    userId: string,
    sessionId: string,
    request: SubmitPracticeAnswerRequest,
  ): Promise<AnswerResult>;

  nextLessonQuestion(userId: string, lessonSlug: string): Promise<LessonNextResult>;

  submitLessonAnswer(
    userId: string,
    request: SubmitLessonAnswerRequest,
  ): Promise<LessonAnswerResult>;
}
