'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { adaptUiTranslator } from '@/shared/i18n/translation';

export function useUiTranslations() {
  const translate = useTranslations();

  return useMemo(() => adaptUiTranslator(translate), [translate]);
}
