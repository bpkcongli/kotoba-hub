'use client';

import { observer } from 'mobx-react-lite';
import { NextIntlClientProvider } from 'next-intl';
import { useEffect, type ReactNode } from 'react';
import { useLocaleStore } from '@/frontend/shared/hooks';
import { uiMessages } from '@/shared/i18n';

export const UiLocaleProvider = observer(function UiLocaleProvider({
  children,
}: {
  children: ReactNode;
}) {
  const locale = useLocaleStore().preferences.uiLocale;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={uiMessages[locale]} timeZone="UTC">
      {children}
    </NextIntlClientProvider>
  );
});
