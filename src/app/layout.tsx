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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
