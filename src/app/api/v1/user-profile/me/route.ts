import { withLocalizedResponse } from '@/app/api/with-localized-response';
import { userProfileController } from '@/backend/users/interface/primary/rest/user-profile.controller';

export const GET = withLocalizedResponse((request: Request): Promise<Response> => {
  return userProfileController.getUserProfile(request);
});
