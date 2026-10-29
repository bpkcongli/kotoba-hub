import type { AssessmentProfile } from '@/frontend/onboarding/interfaces/entities';

export interface AssessmentRequest extends AssessmentProfile {
  note?: string | null;
}

export interface ConfirmAssessmentRequest extends AssessmentProfile {
  knownSkillClaims: string[];
}
