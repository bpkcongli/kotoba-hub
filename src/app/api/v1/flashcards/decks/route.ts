import { withLocalizedResponse } from '@/app/api/with-localized-response';
import { flashcardController } from '@/backend/flashcards/interface/primary/rest/flashcard.controller';

export const GET = withLocalizedResponse((request: Request) => {
  return flashcardController.listDecks(request);
});

export const POST = withLocalizedResponse((request: Request) => {
  return flashcardController.createDeck(request);
});
