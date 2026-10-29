import { Container } from 'inversify';
import type { HttpClient } from '@/frontend/shared/adapters/http-client';
import type { FeatureContainerOptions } from '@/frontend/shared/interfaces';
import { SHARED_TYPES } from '@/frontend/shared/services';
import { OnboardingService, type IOnboardingService } from './external';
import { OnboardingStore, type IOnboardingStore } from './internal';
import { ONBOARDING_TYPES } from './types';

export function createOnboardingContainer({ parentContainer }: FeatureContainerOptions): Container {
  const container = new Container({ parent: parentContainer });

  container
    .bind<IOnboardingService>(ONBOARDING_TYPES.OnboardingService)
    .toDynamicValue(
      (context) => new OnboardingService(context.get<HttpClient>(SHARED_TYPES.HttpClient)),
    )
    .inSingletonScope();

  container
    .bind<IOnboardingStore>(ONBOARDING_TYPES.OnboardingStore)
    .toDynamicValue(
      (context) =>
        new OnboardingStore(context.get<IOnboardingService>(ONBOARDING_TYPES.OnboardingService)),
    )
    .inSingletonScope()
    .onDeactivation((store) => store.dispose());

  return container;
}
