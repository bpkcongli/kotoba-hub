import type {
  LessonUnderstandingSnapshot,
  ProgressEventSnapshot,
  SkillMasterySnapshot,
} from '@/backend/progress/domain/repositories/progress.repository';

export const ids = {
  user: '10000000-0000-4000-8000-000000000001',
  otherUser: '10000000-0000-4000-8000-000000000002',
  skill: '20000000-0000-4000-8000-000000000001',
  lesson: '30000000-0000-4000-8000-000000000001',
  unit: '40000000-0000-4000-8000-000000000001',
  track: '50000000-0000-4000-8000-000000000001',
  session: '60000000-0000-4000-8000-000000000001',
  question: '70000000-0000-4000-8000-000000000001',
};

export function event(
  index = 1,
  overrides: Partial<ProgressEventSnapshot> = {},
): ProgressEventSnapshot {
  return {
    id: `80000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    userId: ids.user,
    skillId: ids.skill,
    lessonId: ids.lesson,
    unitId: ids.unit,
    trackId: ids.track,
    sourceType: 'PRACTICE',
    sourceSessionId: ids.session,
    sourceEntityId: ids.question,
    questionType: 'SHORT_FREE_RESPONSE',
    isCorrect: true,
    numericScore: 100,
    confidenceWeight: 1,
    responseTimeMs: 1500,
    answeredAt: new Date(Date.UTC(2026, 9, 19, 0, 0, index)).toISOString(),
    gradingMetadata: null,
    ...overrides,
  };
}

export function emptyMastery(userId = ids.user, skillId = ids.skill): SkillMasterySnapshot {
  return {
    userId,
    skillId,
    lastProgressEventId: null,
    masteryScore: 0,
    accuracyScore: 0,
    recencyScore: 0,
    confidenceScore: 0,
    attemptsWindowSize: 0,
    correctAttemptsCount: 0,
    masteryState: 'WEAK',
    recommendedDifficultyBand: 'STANDARD',
    lastActivityAt: null,
  };
}

export function emptyLesson(userId = ids.user, lessonId = ids.lesson): LessonUnderstandingSnapshot {
  return {
    userId,
    lessonId,
    lastProgressEventId: null,
    lastQuestionId: null,
    currentUnderstandingLevel: 0,
    lastAttemptedDifficultyLevel: null,
    lastCorrectDifficultyLevel: null,
    totalCorrectCount: 0,
    totalAttemptCount: 0,
    lastAttemptedAt: null,
    lastCorrectAt: null,
  };
}
