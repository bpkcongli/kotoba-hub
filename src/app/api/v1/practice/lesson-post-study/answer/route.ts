import { practiceController } from '@/backend/practice/interface/primary/rest/practice.controller';

export async function POST(request: Request) {
  return practiceController.submitLessonAnswer(request);
}
