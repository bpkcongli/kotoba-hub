import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/noto-sans-jp';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import './globals.css';
import { localeBootstrap } from './locale-bootstrap';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'KotobaHub — Your Japanese study space',
    template: '%s | KotobaHub',
  },
  description:
    'A structured Japanese study space with lessons, practice, and progress, one step at a time.',
};

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
