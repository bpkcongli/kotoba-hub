import { userPreferencesController } from '@/backend/users/interface/primary/rest/user-preferences.controller';

export const GET = (request: Request) => userPreferencesController.handle(request);
export const PATCH = (request: Request) => userPreferencesController.handle(request);
