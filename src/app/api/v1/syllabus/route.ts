import { withLocalizedResponse } from '@/app/api/with-localized-response';
import { syllabusController } from '@/backend/syllabus/interface/primary/rest/syllabus.controller';

export const GET = withLocalizedResponse(async (request: Request): Promise<Response> => {
  return syllabusController.listTracks(request);
});
