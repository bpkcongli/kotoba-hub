import { flashcardController } from '@/backend/flashcards/interface/primary/rest/flashcard.controller';

export async function POST(request: Request, context: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await context.params;

  return flashcardController.submitAnswer(request, sessionId);
}
