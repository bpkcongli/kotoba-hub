import { syllabusController } from '@/backend/syllabus/interface/primary/rest/syllabus.controller';

export async function GET(request: Request): Promise<Response> {
  return syllabusController.listTracks(request);
}
