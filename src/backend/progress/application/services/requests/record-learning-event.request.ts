import type {
  ProducerSessionMetadata,
  ProgressSourceType,
} from '@/backend/progress/domain/repositories/progress.repository';

export interface RecordLearningEventRequest {
  eventId: string;
  userId: string;
  skillId: string;
  sourceType: ProgressSourceType;
  sourceSessionId: string | null;
  sourceEntityId: string;
  questionType: string;
  isCorrect: boolean;
  numericScore: number;
  confidenceWeight?: number | null;
  responseTimeMs?: number | null;
  answeredAt: string;
  gradingMetadata?: Record<string, unknown> | null;
  producerSession?: ProducerSessionMetadata;
  postStudy?: { questionId: string; difficultyLevel: number };
}
