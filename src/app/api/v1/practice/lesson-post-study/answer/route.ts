import { withLocalizedResponse } from '@/app/api/with-localized-response';
import { practiceController } from '@/backend/practice/interface/primary/rest/practice.controller';

export const POST = withLocalizedResponse(async (request: Request) => {
  return practiceController.submitLessonAnswer(request);
});
