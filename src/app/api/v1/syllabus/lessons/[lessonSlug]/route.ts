import { withLocalizedResponse } from '@/app/api/with-localized-response';
import { syllabusController } from '@/backend/syllabus/interface/primary/rest/syllabus.controller';

export const GET = withLocalizedResponse(
  async (
    request: Request,
    context: { params: Promise<{ lessonSlug: string }> },
  ): Promise<Response> => {
    const { lessonSlug } = await context.params;

    return syllabusController.getLesson(request, lessonSlug);
  },
);
