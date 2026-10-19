import type {
  ConfirmLearnerProfileInput,
  LearnerProfilePort,
  UserProfileSnapshot,
} from '@/backend/personalization/application/ports/learner-profile.port';
import type { LearnerProfileService } from '@/backend/users/application/services/learner-profile.service';

export class LearnerProfileAdapter implements LearnerProfilePort {
  constructor(private readonly profiles: LearnerProfileService) {}

  confirm(input: ConfirmLearnerProfileInput): Promise<UserProfileSnapshot> {
    return this.profiles.confirm(input);
  }
}
