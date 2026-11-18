import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { uiTranslator, type UiMessageKey } from '@/shared/i18n';
import { localeBootstrap } from './locale-bootstrap';

export async function pageMetadata(titleKey: UiMessageKey): Promise<Metadata> {
  const { preferences } = await localeBootstrap((await headers()).get('cookie'));

  return { title: uiTranslator(preferences.uiLocale)(titleKey) };
}
