import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/noto-sans-jp';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import './globals.css';
import { uiTranslator } from '@/shared/i18n';
import { localeBootstrap } from './locale-bootstrap';
import { Providers } from './providers';

export async function generateMetadata(): Promise<Metadata> {
  const { preferences } = await localeBootstrap((await headers()).get('cookie'));
  const t = uiTranslator(preferences.uiLocale);

  return {
    title: {
      default: `KotobaHub — ${t('SHARED:SITE_METADATA.PAGE.TITLE')}`,
      template: '%s | KotobaHub',
    },
    description: t('SHARED:SITE_METADATA.PAGE.DESCRIPTION'),
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const bootstrap = await localeBootstrap((await headers()).get('cookie'));

  return (
    <html lang={bootstrap.preferences.uiLocale}>
      <body className="bg-background font-sans text-foreground antialiased">
        <Providers bootstrap={bootstrap}>{children}</Providers>
      </body>
    </html>
  );
}
