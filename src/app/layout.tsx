import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource-variable/noto-sans-jp';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: 'KotobaHub — Your Japanese study space',
    template: '%s | KotobaHub',
  },
  description:
    'A structured Japanese study space with lessons, practice, and progress, one step at a time.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background font-sans text-foreground antialiased">
        <a
          href="#main-content"
          className="sr-only fixed top-4 left-4 z-50 rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground focus:not-sr-only focus-visible:focus-ring">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
