import { Container } from 'inversify';
import type { HttpClient } from '@/frontend/shared/adapters/http-client';
import type { FeatureContainerOptions } from '@/frontend/shared/interfaces';
import { SHARED_TYPES } from '@/frontend/shared/services';
import { PracticeService, type IPracticeService } from './external';
import { PracticeStore, type IPracticeStore } from './internal';
import { PRACTICE_TYPES } from './types';

export function createPracticeContainer({ parentContainer }: FeatureContainerOptions) {
  const container = new Container({ parent: parentContainer });

  container
    .bind<IPracticeService>(PRACTICE_TYPES.Service)
    .toDynamicValue((c) => new PracticeService(c.get<HttpClient>(SHARED_TYPES.HttpClient)))
    .inSingletonScope();

  container
    .bind<IPracticeStore>(PRACTICE_TYPES.Store)
    .toDynamicValue((c) => new PracticeStore(c.get<IPracticeService>(PRACTICE_TYPES.Service)))
    .inSingletonScope()
    .onDeactivation((store) => store.dispose());

  return container;
}
