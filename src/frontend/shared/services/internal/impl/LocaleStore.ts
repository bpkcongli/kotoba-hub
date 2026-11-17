import { makeAutoObservable, runInAction } from 'mobx';
import { presentError } from '@/frontend/shared/helpers';
import type { StoreError } from '@/frontend/shared/interfaces';
import type { ILocaleService } from '@/frontend/shared/services/external/ILocaleService';
import type { ILocaleStore } from '@/frontend/shared/services/internal/ILocaleStore';
import { defaultPreferences, type Locale, type UserPreferences } from '@/shared/locale';

export class LocaleStore implements ILocaleStore {
  preferences: UserPreferences;
  isSaving = false;
  error: StoreError | null = null;

  private controller: AbortController | null = null;

  constructor(
    private readonly service: ILocaleService,
    initial?: UserPreferences,
    public localizedSyllabus = false,
  ) {
    this.preferences = initial ?? { ...defaultPreferences };

    makeAutoObservable<this, 'service' | 'controller'>(
      this,
      { service: false, controller: false },
      { autoBind: true },
    );
  }

  get contentQuery() {
    return this.localizedSyllabus
      ? { contentFormat: 'localized' as const, contentLocale: this.preferences.contentLocale }
      : {};
  }

  hydrate(preferences: UserPreferences, localizedSyllabus: boolean) {
    this.dispose();
    this.preferences = preferences;
    this.localizedSyllabus = localizedSyllabus;
    this.error = null;
  }

  async setContentLocale(contentLocale: Locale) {
    if (this.isSaving) return;

    const controller = new AbortController();
    this.controller = controller;
    this.isSaving = true;
    this.error = null;

    try {
      const preferences = await this.service.patch({ contentLocale }, controller.signal);

      runInAction(() => {
        if (this.controller === controller && !controller.signal.aborted)
          this.preferences = preferences;
      });
    } catch (error) {
      runInAction(() => {
        if (this.controller === controller && !controller.signal.aborted)
          this.error = presentError(error);
      });
    } finally {
      runInAction(() => {
        if (this.controller === controller) {
          this.controller = null;
          this.isSaving = false;
        }
      });
    }
  }

  reset() {
    this.dispose();
    this.preferences = { ...defaultPreferences };
    this.localizedSyllabus = false;
    this.error = null;
  }

  dispose() {
    this.controller?.abort();
    this.controller = null;
    this.isSaving = false;
  }
}
