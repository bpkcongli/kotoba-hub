import type {
  DifficultyBand,
  LessonUnderstandingSnapshot,
  ProgressSourceType,
  SkillMasterySnapshot,
} from '@/backend/progress/domain/repositories/progress.repository';

export interface ProgressOverview {
  trackedSkillsCount: number;
  masteredSkillsCount: number;
  developingSkillsCount: number;
  weakSkillsCount: number;
  averageMasteryScore: number;
  recommendedDifficultyBand: DifficultyBand;
  lastActivityAt: string | null;
  lessonUnderstandingSummary: {
    trackedLessonsCount: number;
    completedLessonsCount: number;
    averageUnderstandingLevel: number;
    maxUnderstandingLevel: 10;
  };
  trackSummaries: {
    trackSlug: string;
    trackTitle: string;
    trackedSkillsCount: number;
    masteredSkillsCount: number;
    averageMasteryScore: number;
    lastActivityAt: string | null;
  }[];
}

export interface ProgressTimelineItem {
  id: string;
  sourceType: ProgressSourceType;
  sourceSessionId: string | null;
  sourceEntityId: string;
  questionType: string;
  skillCode: string;
  skillTitle: string;
  trackSlug: string;
  unitSlug: string;
  lessonSlug: string;
  isCorrect: boolean;
  numericScore: number;
  confidenceWeight: number | null;
  responseTimeMs: number | null;
  answeredAt: string;
}

export interface ProgressSessionFeedItem {
  sourceType: ProgressSourceType;
  sourceSessionId: string | null;
  sessionStatus: string;
  sessionTitle: string;
  trackSlug: string | null;
  unitSlug: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastActivityAt: string | null;
  totalInteractions: number;
  correctCount: number;
  incorrectCount: number;
  averageScore: number | null;
}

export interface ProgressPage<T> {
  items: T[];
  totalRecords: number;
}

export interface RecordLearningEventResponse {
  eventId: string;
  mastery: SkillMasterySnapshot;
  lessonUnderstanding: LessonUnderstandingSnapshot | null;
  lessonCompleted: boolean;
  replayed: boolean;
}
