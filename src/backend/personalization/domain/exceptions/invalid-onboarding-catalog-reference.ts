export interface InvalidCatalogReference {
  field: string;
  message: string;
}

export class InvalidOnboardingCatalogReference extends Error {
  constructor(readonly details: InvalidCatalogReference[]) {
    super('Invalid onboarding catalog reference.');
  }
}
