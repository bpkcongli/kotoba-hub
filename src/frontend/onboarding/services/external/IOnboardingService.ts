import type {
  AssessmentDraft,
  OnboardingResult,
  SyllabusTrack,
  UserProfile,
} from '@/frontend/onboarding/interfaces/entities';
import type {
  AssessmentRequest,
  ConfirmAssessmentRequest,
} from '@/frontend/onboarding/interfaces/requests';

export interface IOnboardingService {
  getProfile(signal?: AbortSignal): Promise<UserProfile>;

  getTracks(signal?: AbortSignal): Promise<SyllabusTrack[]>;

  assess(input: AssessmentRequest, signal?: AbortSignal): Promise<AssessmentDraft>;

  confirm(input: ConfirmAssessmentRequest, signal?: AbortSignal): Promise<OnboardingResult>;
}
