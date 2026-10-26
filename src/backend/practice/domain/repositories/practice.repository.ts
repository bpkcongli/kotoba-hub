import type {
  AiContextBundle,
  AiDifficultyBand,
  AiQuestionType,
} from '@/backend/shared/application/services/requests/ai-request';

export type UserAnswer =
  | { rawInputRomaji: string; normalizedKana: string; normalizedKanji?: string | null }
  | { selectedOptionId: string }
  | { arrangedTokenIds: string[] };

export interface PracticeQuestion {
  id: string;
  skillId: string;
  skillCode: string;
  questionType: AiQuestionType;
  gradingStrategy: 'DETERMINISTIC' | 'AI';
  difficultyBand: AiDifficultyBand;
  promptPayload: Record<string, unknown>;
  expectedAnswer: Record<string, unknown>;
  sortOrder: number;
}

export interface Recommendation {
  context: AiContextBundle;
  difficultyBand: AiDifficultyBand;
  questionMix: { WEAK: number; REINFORCEMENT: number; STRETCH: number };
}

export interface PracticeSession {
  id: string;
  userId: string;
  status: 'GENERATED' | 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';
  difficultyBand: AiDifficultyBand;
  questionMix: Recommendation['questionMix'];
  recommendation: Recommendation;
  questions: PracticeQuestion[];
  answeredQuestionsCount: number;
  startedAt: string;
  completedAt: string | null;
}

export interface ProgressImpact {
  progressEventId: string;
  skillCode: string;
  masteryScore: number;
  masteryState: string;
  recommendedDifficultyBand: string;
}

export interface Grade {
  isCorrect: boolean;
  numericScore: number;
  feedbackText: string | null;
  gradingSource: 'RULE_ENGINE' | 'AI_PROVIDER';
  gradingMetadata: Record<string, unknown>;
}

export interface AnswerResult extends Grade {
  sessionId: string;
  questionId: string;
  answerId: string;
  sessionProgress: { answeredQuestionsCount: number; totalQuestions: number; isCompleted: boolean };
  nextQuestionId: string | null;
  progressImpact: ProgressImpact | null;
}

export interface UnderstandingProgress {
  currentUnderstandingLevelBefore: number;
  currentUnderstandingLevelAfter: number;
  targetDifficultyLevel: number;
  maxUnderstandingLevel: 10;
  postStudyQuizCompleted: boolean;
  nextReviewDifficultyLevel: number;
}

export interface LessonAnswerResult {
  lessonSlug: string;
  questionId: string;
  isCorrect: boolean;
  numericScore: number;
  feedbackText: string | null;
  gradingSource: 'RULE_ENGINE';
  understandingProgress: UnderstandingProgress;
  progressImpact: ProgressImpact;
}

export interface StoredAnswer {
  id: string;
  eventId: string;
  questionId: string;
  sessionId: string;
  skillId: string;
  skillCode: string;
  userAnswer: UserAnswer;
  responseTimeMs: number | null;
  answeredAt: string;
  result: AnswerResult;
  progressRecorded: boolean;
  producerSession: { status: string; title: string; startedAt: string; completedAt: string | null };
}

export interface LessonReceipt {
  id: string;
  userId: string;
  key: string;
  fingerprint: string;
  eventId: string;
  answeredAt: string;
  lessonSlug: string;
  questionId: string;
  skillId: string;
  skillCode: string;
  difficultyLevel: number;
  understandingBefore: number;
  grade: Grade;
  responseTimeMs: number | null;
  result: LessonAnswerResult | null;
}

export interface PracticeTransaction {
  session: PracticeSession;

  findAnswer(questionId: string): Promise<StoredAnswer | null>;

  saveAnswer(answer: StoredAnswer): Promise<void>;
}

export interface PracticeRepository {
  createSession(session: PracticeSession): Promise<void>;

  withSessionLock<T>(
    userId: string,
    sessionId: string,
    work: (tx: PracticeTransaction) => Promise<T>,
  ): Promise<T>;

  saveProgressResult(answerId: string, result: AnswerResult): Promise<AnswerResult>;

  findLessonReceipt(userId: string, key: string): Promise<LessonReceipt | null>;

  createLessonReceipt(receipt: LessonReceipt): Promise<LessonReceipt>;

  saveLessonResult(id: string, result: LessonAnswerResult): Promise<LessonAnswerResult>;
}
