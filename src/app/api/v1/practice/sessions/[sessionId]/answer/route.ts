import { practiceController } from '@/backend/practice/interface/primary/rest/practice.controller';

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;

  return practiceController.submitAnswer(request, sessionId);
}
