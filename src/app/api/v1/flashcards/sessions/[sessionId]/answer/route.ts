import { withLocalizedResponse } from '@/app/api/with-localized-response';
import { flashcardController } from '@/backend/flashcards/interface/primary/rest/flashcard.controller';

export const POST = withLocalizedResponse(
  async (request: Request, context: { params: Promise<{ sessionId: string }> }) => {
    const { sessionId } = await context.params;

    return flashcardController.submitAnswer(request, sessionId);
  },
);
