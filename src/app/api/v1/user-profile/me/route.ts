import { userProfileController } from '@/backend/users/interface/primary/rest/user-profile.controller';

export function GET(request: Request): Promise<Response> {
  return userProfileController.getUserProfile(request);
}
