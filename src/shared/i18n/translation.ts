import type { TranslationValues } from 'next-intl';
import type en from './messages/en.json';

type MessagePaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${MessagePaths<T[K]>}`;
}[keyof T & string];

export type UiMessageKey = {
  [Domain in keyof typeof en]: `${Domain}:${MessagePaths<(typeof en)[Domain]>}`;
}[keyof typeof en];

export interface UiTranslator {
  (key: UiMessageKey, values?: TranslationValues): string;
  has(key: string): key is UiMessageKey;
}

interface IntlTranslator<TPath extends string> {
  (key: TPath, values?: TranslationValues): string;
  has(key: TPath): boolean;
}

export function adaptUiTranslator<TPath extends string>(
  translate: IntlTranslator<TPath>,
): UiTranslator {
  const t = (key: UiMessageKey, values?: TranslationValues) =>
    translate(key.replace(':', '.') as TPath, values);

  t.has = (key: string): key is UiMessageKey =>
    /^[A-Z][A-Z_]*:[A-Z][A-Z_]*(?:\.[A-Z][A-Z_]*){2,}$/.test(key) &&
    translate.has(key.replace(':', '.') as TPath);

  return t;
}
