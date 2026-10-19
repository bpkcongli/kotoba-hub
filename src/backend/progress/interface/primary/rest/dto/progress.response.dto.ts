import type {
  ProgressOverview,
  ProgressSessionFeedItem,
  ProgressTimelineItem,
} from '@/backend/progress/application/services/responses/progress.response';

export interface ProgressOverviewResponseDto {
  trackedSkillsCount: number;
  masteredSkillsCount: number;
  developingSkillsCount: number;
  weakSkillsCount: number;
  averageMasteryScore: number;
  recommendedDifficultyBand: string;
  lastActivityAt: string | null;
  lessonUnderstandingSummary: {
    trackedLessonsCount: number;
    completedLessonsCount: number;
    averageUnderstandingLevel: number;
    maxUnderstandingLevel: number;
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

export interface ProgressTimelineItemDto {
  id: string;
  sourceType: string;
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

export interface ProgressSessionItemDto {
  sourceType: string;
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

export interface ProgressTimelineResponseDto {
  progressEvents: ProgressTimelineItemDto[];
}

export interface ProgressSessionsResponseDto {
  progressSessions: ProgressSessionItemDto[];
}

export function toProgressOverviewDto(value: ProgressOverview): ProgressOverviewResponseDto {
  return {
    trackedSkillsCount: value.trackedSkillsCount,
    masteredSkillsCount: value.masteredSkillsCount,
    developingSkillsCount: value.developingSkillsCount,
    weakSkillsCount: value.weakSkillsCount,
    averageMasteryScore: value.averageMasteryScore,
    recommendedDifficultyBand: value.recommendedDifficultyBand,
    lastActivityAt: value.lastActivityAt,
    lessonUnderstandingSummary: {
      trackedLessonsCount: value.lessonUnderstandingSummary.trackedLessonsCount,
      completedLessonsCount: value.lessonUnderstandingSummary.completedLessonsCount,
      averageUnderstandingLevel: value.lessonUnderstandingSummary.averageUnderstandingLevel,
      maxUnderstandingLevel: value.lessonUnderstandingSummary.maxUnderstandingLevel,
    },
    trackSummaries: value.trackSummaries.map((track) => ({
      trackSlug: track.trackSlug,
      trackTitle: track.trackTitle,
      trackedSkillsCount: track.trackedSkillsCount,
      masteredSkillsCount: track.masteredSkillsCount,
      averageMasteryScore: track.averageMasteryScore,
      lastActivityAt: track.lastActivityAt,
    })),
  };
}

export function toProgressTimelineDto(value: ProgressTimelineItem): ProgressTimelineItemDto {
  return {
    id: value.id,
    sourceType: value.sourceType,
    sourceSessionId: value.sourceSessionId,
    sourceEntityId: value.sourceEntityId,
    questionType: value.questionType,
    skillCode: value.skillCode,
    skillTitle: value.skillTitle,
    trackSlug: value.trackSlug,
    unitSlug: value.unitSlug,
    lessonSlug: value.lessonSlug,
    isCorrect: value.isCorrect,
    numericScore: value.numericScore,
    confidenceWeight: value.confidenceWeight,
    responseTimeMs: value.responseTimeMs,
    answeredAt: value.answeredAt,
  };
}

export function toProgressSessionDto(value: ProgressSessionFeedItem): ProgressSessionItemDto {
  return {
    sourceType: value.sourceType,
    sourceSessionId: value.sourceSessionId,
    sessionStatus: value.sessionStatus,
    sessionTitle: value.sessionTitle,
    trackSlug: value.trackSlug,
    unitSlug: value.unitSlug,
    startedAt: value.startedAt,
    completedAt: value.completedAt,
    lastActivityAt: value.lastActivityAt,
    totalInteractions: value.totalInteractions,
    correctCount: value.correctCount,
    incorrectCount: value.incorrectCount,
    averageScore: value.averageScore,
  };
}
