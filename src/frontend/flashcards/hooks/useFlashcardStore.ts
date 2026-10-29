'use client';

import { FLASHCARD_TYPES } from '@/frontend/flashcards/services';
import type { IFlashcardStore } from '@/frontend/flashcards/services/internal';
import { useFrontendContainer } from '@/frontend/shared/hooks';

export function useFlashcardStore() {
  return useFrontendContainer().get<IFlashcardStore>(FLASHCARD_TYPES.Store);
}
