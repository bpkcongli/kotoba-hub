import { withLocalizedResponse } from '@/app/api/with-localized-response';
import { personalizationController } from '@/backend/personalization/interface/primary/rest/personalization.controller';

export const POST = withLocalizedResponse((request: Request): Promise<Response> => {
  return personalizationController.confirmAssessment(request);
});
