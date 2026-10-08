export interface LearnerProfileAttributes {
  id: string;
  userId: string;
  currentLevel: string | null;
  targetLevel: string;
  dailyGoalMinutes: number;
  preferredScript: 'ROMAJI' | 'KANA' | 'MIXED';
  weakSkillFocuses: string[];
  knownSkillClaims: string[];
  onboardingCompleted: boolean;
  onboardingCompletedAt: Date | null;
}

export class LearnerProfile {
  readonly id: string;
  readonly userId: string;
  readonly currentLevel: string | null;
  readonly targetLevel: string;
  readonly dailyGoalMinutes: number;
  readonly preferredScript: 'ROMAJI' | 'KANA' | 'MIXED';
  readonly weakSkillFocuses: string[];
  readonly knownSkillClaims: string[];
  readonly onboardingCompleted: boolean;
  readonly onboardingCompletedAt: Date | null;

  constructor(attributes: LearnerProfileAttributes) {
    if (attributes.onboardingCompleted && !attributes.onboardingCompletedAt) {
      throw new Error('A completed learner profile requires a completion time.');
    }

    this.id = attributes.id;
    this.userId = attributes.userId;
    this.currentLevel = attributes.currentLevel;
    this.targetLevel = attributes.targetLevel;
    this.dailyGoalMinutes = attributes.dailyGoalMinutes;
    this.preferredScript = attributes.preferredScript;
    this.weakSkillFocuses = attributes.weakSkillFocuses;
    this.knownSkillClaims = attributes.knownSkillClaims;
    this.onboardingCompleted = attributes.onboardingCompleted;
    this.onboardingCompletedAt = attributes.onboardingCompletedAt;
  }
}
