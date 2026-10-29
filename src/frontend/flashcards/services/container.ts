import { Container } from 'inversify';
import type { HttpClient } from '@/frontend/shared/adapters/http-client';
import type { FeatureContainerOptions } from '@/frontend/shared/interfaces';
import { SHARED_TYPES } from '@/frontend/shared/services';
import { FlashcardService, type IFlashcardService } from './external';
import { FlashcardStore, type IFlashcardStore } from './internal';
import { FLASHCARD_TYPES } from './types';

export function createFlashcardContainer({ parentContainer }: FeatureContainerOptions) {
  const container = new Container({ parent: parentContainer });

  container
    .bind<IFlashcardService>(FLASHCARD_TYPES.Service)
    .toDynamicValue((c) => new FlashcardService(c.get<HttpClient>(SHARED_TYPES.HttpClient)))
    .inSingletonScope();

  container
    .bind<IFlashcardStore>(FLASHCARD_TYPES.Store)
    .toDynamicValue((c) => new FlashcardStore(c.get<IFlashcardService>(FLASHCARD_TYPES.Service)))
    .inSingletonScope()
    .onDeactivation((store) => store.dispose());

  return container;
}
