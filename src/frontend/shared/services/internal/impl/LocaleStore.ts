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
    await this.save({ contentLocale });
  }

  async setUiLocale(uiLocale: Locale, authenticated: boolean) {
    if (this.isSaving) return;

    if (authenticated) {
      if (!(await this.save({ uiLocale }))) return;
    } else {
      this.preferences = { ...this.preferences, uiLocale };
      this.error = null;
    }

    if (typeof document !== 'undefined') {
      document.cookie = `kotobahub-ui-locale=${this.preferences.uiLocale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    }
  }

  private async save(value: Partial<UserPreferences>) {
    if (this.isSaving) return false;

    const controller = new AbortController();
    this.controller = controller;
    this.isSaving = true;
    this.error = null;

    let applied = false;

    try {
      const preferences = await this.service.patch(value, controller.signal);

      runInAction(() => {
        if (this.controller === controller && !controller.signal.aborted) {
          this.preferences = preferences;
          applied = true;
        }
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

    return applied;
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
