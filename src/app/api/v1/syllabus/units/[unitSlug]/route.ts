import { syllabusController } from '@/backend/syllabus/interface/primary/rest/syllabus.controller';

export async function GET(
  request: Request,
  context: { params: Promise<{ unitSlug: string }> },
): Promise<Response> {
  const { unitSlug } = await context.params;

  return syllabusController.getUnit(request, unitSlug);
}
