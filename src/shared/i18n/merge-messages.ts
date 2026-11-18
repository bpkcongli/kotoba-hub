import type { AbstractIntlMessages } from 'next-intl';

export function mergeUiMessages<TMessages extends AbstractIntlMessages>(
  fallback: TMessages,
  localized: AbstractIntlMessages,
): TMessages {
  return Object.fromEntries(
    Object.entries(fallback).map(([key, value]) => {
      const translation = localized[key];

      return [
        key,
        typeof value === 'string'
          ? typeof translation === 'string'
            ? translation
            : value
          : mergeUiMessages(value, typeof translation === 'object' ? translation : {}),
      ];
    }),
  ) as TMessages;
}
