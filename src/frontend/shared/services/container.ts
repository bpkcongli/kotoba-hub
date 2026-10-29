import { Container } from 'inversify';
import { AxiosHttpClient, type HttpClient } from '@/frontend/shared/adapters/http-client';
import type {
  FeatureContainerOptions,
  FrontendContainerOptions,
} from '@/frontend/shared/interfaces';
import { AppSessionService, type IAppSessionService } from './external';
import { AppSessionStore, type IAppSessionStore } from './internal';
import { SHARED_TYPES } from './types';

export function createFrontendContainer(
  options: Partial<FrontendContainerOptions> = {},
): Container {
  const configuration: FrontendContainerOptions = {
    apiBasePath: '/api/v1',
    requestTimeoutMs: 15000,
    ...options,
  };

  const container = new Container();

  container
    .bind<HttpClient>(SHARED_TYPES.HttpClient)
    .toConstantValue(new AxiosHttpClient(configuration));

  container
    .bind<IAppSessionService>(SHARED_TYPES.AppSessionService)
    .toDynamicValue(
      (context) => new AppSessionService(context.get<HttpClient>(SHARED_TYPES.HttpClient)),
    )
    .inSingletonScope();

  container
    .bind<IAppSessionStore>(SHARED_TYPES.AppSessionStore)
    .toDynamicValue(
      (context) =>
        new AppSessionStore(
          context.get<IAppSessionService>(SHARED_TYPES.AppSessionService),
          configuration.bootstrap?.session,
        ),
    )
    .inSingletonScope()
    .onDeactivation((store) => store.dispose());

  return container;
}

export function createFeatureContainer({ parentContainer }: FeatureContainerOptions): Container {
  return new Container({ parent: parentContainer });
}
