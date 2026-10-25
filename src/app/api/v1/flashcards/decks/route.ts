import { flashcardController } from '@/backend/flashcards/interface/primary/rest/flashcard.controller';

export function GET(request: Request) {
  return flashcardController.listDecks(request);
}

export function POST(request: Request) {
  return flashcardController.createDeck(request);
}
