import { withLocalizedResponse } from '@/app/api/with-localized-response';
import { progressController } from '@/backend/progress/interface/primary/rest/progress.controller';

export const GET = withLocalizedResponse((request: Request): Promise<Response> => {
  return progressController.getSessions(request);
});
