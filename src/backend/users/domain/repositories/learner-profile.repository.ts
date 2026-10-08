import type { LearnerProfile } from '@/backend/users/domain/entities/learner-profile';

export interface LearnerProfileInput {
  userId: string;
  currentLevel: string | null;
  targetLevel: string;
  dailyGoalMinutes: number;
  preferredScript: 'ROMAJI' | 'KANA' | 'MIXED';
  weakSkillFocuses: string[];
  knownSkillClaims: string[];
}

export interface LearnerProfileRepository {
  findProfile(userId: string): Promise<LearnerProfile | null>;

  confirm(input: LearnerProfileInput): Promise<LearnerProfile>;
}
