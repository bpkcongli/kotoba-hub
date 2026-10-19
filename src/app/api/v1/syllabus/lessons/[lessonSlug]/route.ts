import { syllabusController } from '@/backend/syllabus/interface/primary/rest/syllabus.controller';

export async function GET(
  request: Request,
  context: { params: Promise<{ lessonSlug: string }> },
): Promise<Response> {
  const { lessonSlug } = await context.params;

  return syllabusController.getLesson(request, lessonSlug);
}
