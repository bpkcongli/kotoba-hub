import { createTranslator } from 'next-intl';
import type { Locale } from '@/shared/locale';
import { mergeUiMessages } from './merge-messages';
import en from './messages/en.json';
import id from './messages/id.json';
import { adaptUiTranslator } from './translation';

export const uiMessages: Record<Locale, typeof en> = {
  en,
  id: mergeUiMessages(en, id),
};

export function uiTranslator(locale: Locale) {
  return adaptUiTranslator(createTranslator({ locale, messages: uiMessages[locale] }));
}

export type { UiMessageKey, UiTranslator } from './translation';
