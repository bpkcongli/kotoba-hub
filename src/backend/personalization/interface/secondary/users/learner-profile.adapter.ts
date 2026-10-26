import type {
  ConfirmLearnerProfileInput,
  LearnerProfilePort,
  UserProfileSnapshot,
} from '@/backend/personalization/application/ports/learner-profile.port';
import type {
  RecommendationProfilePort,
  RecommendationProfileSnapshot,
} from '@/backend/personalization/application/ports/recommendation-profile.port';
import type { LearnerProfileService } from '@/backend/users/application/services/learner-profile.service';

export class LearnerProfileAdapter implements LearnerProfilePort, RecommendationProfilePort {
  constructor(private readonly profiles: LearnerProfileService) {}

  getProfile(userId: string): Promise<RecommendationProfileSnapshot | null> {
    return this.profiles.get(userId);
  }

  confirm(input: ConfirmLearnerProfileInput): Promise<UserProfileSnapshot> {
    return this.profiles.confirm(input);
  }
}
