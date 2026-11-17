export const SHARED_TYPES = {
  // Shared adapters
  HttpClient: Symbol('HttpClient'),

  // External services
  AppSessionService: Symbol('AppSessionService'),
  LocaleService: Symbol('LocaleService'),

  // Internal services
  AppSessionStore: Symbol('AppSessionStore'),
  LocaleStore: Symbol('LocaleStore'),
};
