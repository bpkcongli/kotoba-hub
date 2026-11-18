'use client';

import { observer } from 'mobx-react-lite';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useAppSessionStore, useLocaleStore, useUiTranslations } from '@/frontend/shared/hooks';

export const UiLanguage = observer(function UiLanguage() {
  const t = useUiTranslations();

  const locale = useLocaleStore();
  const session = useAppSessionStore();
  const router = useRouter();

  const [isRefreshing, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      <label className="flex flex-wrap items-center gap-2 text-body-sm">
        <span className="sr-only sm:not-sr-only">
          {t('SHARED:LANGUAGE_SWITCHER.INTERFACE_LANGUAGE_SELECT.LABEL')}
        </span>

        <select
          className="min-h-11 max-w-full rounded-md border border-muted-foreground bg-card px-3 text-foreground outline-none focus-visible:focus-ring"
          value={locale.preferences.uiLocale}
          disabled={locale.isSaving || isRefreshing || session.snapshot === null}
          onChange={async (event) => {
            const previous = locale.preferences.uiLocale;

            await locale.setUiLocale(
              event.target.value === 'id' ? 'id' : 'en',
              session.snapshot?.isAuthenticated ?? false,
            );

            if (previous !== locale.preferences.uiLocale) startTransition(() => router.refresh());
          }}>
          <option value="en" lang="en">
            English
          </option>
          <option value="id" lang="id">
            Bahasa Indonesia
          </option>
        </select>
      </label>

      {locale.error && (
        <p role="alert" className="text-body-sm text-destructive">
          {t('SHARED:LANGUAGE_SWITCHER.INTERFACE_LANGUAGE_SELECT.ERROR_MESSAGE')}
        </p>
      )}
    </div>
  );
});
