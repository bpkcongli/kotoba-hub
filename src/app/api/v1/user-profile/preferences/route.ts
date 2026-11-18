import { withLocalizedResponse } from '@/app/api/with-localized-response';
import { userPreferencesController } from '@/backend/users/interface/primary/rest/user-preferences.controller';

export const GET = withLocalizedResponse((request: Request) =>
  userPreferencesController.handle(request),
);

export const PATCH = withLocalizedResponse((request: Request) =>
  userPreferencesController.handle(request),
);
