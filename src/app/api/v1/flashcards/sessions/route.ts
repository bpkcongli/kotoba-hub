import { flashcardController } from '@/backend/flashcards/interface/primary/rest/flashcard.controller';

export function POST(request: Request) {
  return flashcardController.createSession(request);
}
