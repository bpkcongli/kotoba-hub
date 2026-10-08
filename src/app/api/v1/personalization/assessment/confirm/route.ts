import { personalizationController } from '@/backend/personalization/interface/primary/rest/personalization.controller';

export function POST(request: Request): Promise<Response> {
  return personalizationController.confirmAssessment(request);
}
