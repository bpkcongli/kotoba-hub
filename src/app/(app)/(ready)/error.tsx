'use client';

import { Button } from '@/frontend/shared/components/atoms';
import { ErrorStatePanel } from '@/frontend/shared/components/organisms';
import { useUiTranslations } from '@/frontend/shared/hooks';

export default function AppError({ reset }: { reset: () => void }) {
  const t = useUiTranslations();

  return (
    <ErrorStatePanel
      title={t('SHARED:PAGE_ERROR.LOAD_ERROR.TITLE')}
      description={t('SHARED:PAGE_ERROR.LOAD_ERROR.DESCRIPTION')}
      action={<Button onClick={reset}>{t('SHARED:RECOVERY_ACTIONS.RETRY_BUTTON.LABEL')}</Button>}
    />
  );
}
