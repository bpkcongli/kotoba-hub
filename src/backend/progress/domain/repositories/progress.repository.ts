export type ProgressSourceType = 'FLASHCARD' | 'PRACTICE' | 'LESSON_POST_STUDY';
export type DifficultyBand = 'REMEDIAL' | 'STANDARD' | 'STRETCH';
export type MasteryState = 'WEAK' | 'DEVELOPING' | 'STABLE' | 'MASTERED';

export interface ProducerSessionMetadata {
  status: string;
  title: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface ProgressEventSnapshot {
  id: string;
  userId: string;
  skillId: string;
  lessonId: string;
  unitId: string;
  trackId: string;
  sourceType: ProgressSourceType;
  sourceSessionId: string | null;
  sourceEntityId: string;
  questionType: string;
  isCorrect: boolean;
  numericScore: number;
  confidenceWeight: number | null;
  responseTimeMs: number | null;
  answeredAt: string;
  gradingMetadata: Record<string, unknown> | null;
}

export interface SkillMasterySnapshot {
  userId: string;
  skillId: string;
  lastProgressEventId: string | null;
  masteryScore: number;
  accuracyScore: number;
  recencyScore: number;
  confidenceScore: number;
  attemptsWindowSize: number;
  correctAttemptsCount: number;
  masteryState: MasteryState;
  recommendedDifficultyBand: DifficultyBand;
  lastActivityAt: string | null;
}

export interface LessonUnderstandingSnapshot {
  userId: string;
  lessonId: string;
  lastProgressEventId: string | null;
  lastQuestionId: string | null;
  currentUnderstandingLevel: number;
  lastAttemptedDifficultyLevel: number | null;
  lastCorrectDifficultyLevel: number | null;
  totalCorrectCount: number;
  totalAttemptCount: number;
  lastAttemptedAt: string | null;
  lastCorrectAt: string | null;
}

export interface ProgressWriteTransaction {
  findEvent(eventId: string): Promise<ProgressEventSnapshot | null>;

  getSkillHistory(userId: string, skillId: string): Promise<ProgressEventSnapshot[]>;

  getMastery(): Promise<SkillMasterySnapshot>;

  lockLesson(userId: string, lessonId: string): Promise<LessonUnderstandingSnapshot>;

  insertEvent(event: ProgressEventSnapshot): Promise<void>;

  saveMastery(snapshot: SkillMasterySnapshot): Promise<void>;

  saveLesson(snapshot: LessonUnderstandingSnapshot): Promise<void>;
}

export interface ProgressReadState {
  events: ProgressEventSnapshot[];
  skills: SkillMasterySnapshot[];
  lessons: LessonUnderstandingSnapshot[];
}

export interface ProgressRepository {
  findEvent(userId: string, eventId: string): Promise<ProgressEventSnapshot | null>;

  withSkillLock<T>(
    userId: string,
    skillId: string,
    work: (transaction: ProgressWriteTransaction) => Promise<T>,
  ): Promise<T>;

  readState(userId: string): Promise<ProgressReadState>;

  findLesson(userId: string, lessonId: string): Promise<LessonUnderstandingSnapshot | null>;
}
