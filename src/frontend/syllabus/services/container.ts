import { Container } from 'inversify';
import type { HttpClient } from '@/frontend/shared/adapters/http-client';
import type { FeatureContainerOptions } from '@/frontend/shared/interfaces';
import { SHARED_TYPES } from '@/frontend/shared/services';
import { SyllabusService, type ISyllabusService } from './external';
import { SyllabusStore, type ISyllabusStore } from './internal';
import { SYLLABUS_TYPES } from './types';

export function createSyllabusContainer({ parentContainer }: FeatureContainerOptions) {
  const container = new Container({ parent: parentContainer });

  container
    .bind<ISyllabusService>(SYLLABUS_TYPES.Service)
    .toDynamicValue((c) => new SyllabusService(c.get<HttpClient>(SHARED_TYPES.HttpClient)))
    .inSingletonScope();

  container
    .bind<ISyllabusStore>(SYLLABUS_TYPES.Store)
    .toDynamicValue((c) => new SyllabusStore(c.get<ISyllabusService>(SYLLABUS_TYPES.Service)))
    .inSingletonScope()
    .onDeactivation((store) => store.dispose());

  return container;
}
