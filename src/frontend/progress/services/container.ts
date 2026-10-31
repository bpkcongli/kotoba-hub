import { Container } from 'inversify';
import type { HttpClient } from '@/frontend/shared/adapters/http-client';
import type { FeatureContainerOptions } from '@/frontend/shared/interfaces';
import { SHARED_TYPES } from '@/frontend/shared/services';
import { SyllabusService } from '@/frontend/syllabus/services/external';
import { ProgressService, type IProgressService } from './external';
import { ProgressStore, type IProgressStore } from './internal';
import { PROGRESS_TYPES } from './types';

export function createProgressContainer({ parentContainer }: FeatureContainerOptions) {
  const container = new Container({ parent: parentContainer });

  container
    .bind<IProgressService>(PROGRESS_TYPES.Service)
    .toDynamicValue(
      (context) => new ProgressService(context.get<HttpClient>(SHARED_TYPES.HttpClient)),
    )
    .inSingletonScope();

  container
    .bind<IProgressStore>(PROGRESS_TYPES.Store)
    .toDynamicValue(
      (context) =>
        new ProgressStore(
          context.get<IProgressService>(PROGRESS_TYPES.Service),
          new SyllabusService(context.get<HttpClient>(SHARED_TYPES.HttpClient)),
        ),
    )
    .inSingletonScope()
    .onDeactivation((store) => store.dispose());

  return container;
}
