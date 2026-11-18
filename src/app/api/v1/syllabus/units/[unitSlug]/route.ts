import { withLocalizedResponse } from '@/app/api/with-localized-response';
import { syllabusController } from '@/backend/syllabus/interface/primary/rest/syllabus.controller';

export const GET = withLocalizedResponse(
  async (
    request: Request,
    context: { params: Promise<{ unitSlug: string }> },
  ): Promise<Response> => {
    const { unitSlug } = await context.params;

    return syllabusController.getUnit(request, unitSlug);
  },
);
