import { Container } from 'inversify';
import { AxiosHttpClient, type HttpClient } from '@/frontend/shared/adapters/http-client';
import type {
  FeatureContainerOptions,
  FrontendContainerOptions,
} from '@/frontend/shared/interfaces';
import { LocaleService, type ILocaleService } from './external';
import { AppSessionService, type IAppSessionService } from './external';
import { LocaleStore, type ILocaleStore } from './internal';
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

  // Shared adapters
  container
    .bind<HttpClient>(SHARED_TYPES.HttpClient)
    .toConstantValue(new AxiosHttpClient(configuration));

  // External services
  container
    .bind<IAppSessionService>(SHARED_TYPES.AppSessionService)
    .toDynamicValue(
      (context) => new AppSessionService(context.get<HttpClient>(SHARED_TYPES.HttpClient)),
    )
    .inSingletonScope();
  container
    .bind<ILocaleService>(SHARED_TYPES.LocaleService)
    .toDynamicValue((c) => new LocaleService(c.get<HttpClient>(SHARED_TYPES.HttpClient)))
    .inSingletonScope();

  // Internal services
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
  container
    .bind<ILocaleStore>(SHARED_TYPES.LocaleStore)
    .toDynamicValue(
      (c) =>
        new LocaleStore(
          c.get<ILocaleService>(SHARED_TYPES.LocaleService),
          configuration.bootstrap?.preferences,
          configuration.bootstrap?.localizedSyllabus,
        ),
    )
    .inSingletonScope()
    .onDeactivation((store) => store.dispose());

  return container;
}

export function createFeatureContainer({ parentContainer }: FeatureContainerOptions): Container {
  return new Container({ parent: parentContainer });
}
