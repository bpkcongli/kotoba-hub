'use client';

import Link from 'next/link';
import { Button } from '@/frontend/shared/components/atoms';
import { AppShell, PublicHeader } from '@/frontend/shared/components/layouts';
import { useUiTranslations } from '@/frontend/shared/hooks';

export function NotFoundPanel() {
  const t = useUiTranslations();

  return (
    <AppShell variant="public" header={<PublicHeader />} contentWidth="reading">
      <div className="space-y-4">
        <h1 className="text-h1 font-semibold">{t('SHARED:NOT_FOUND_PAGE.PAGE.TITLE')}</h1>

        <p className="text-muted-foreground">{t('SHARED:NOT_FOUND_PAGE.PAGE.DESCRIPTION')}</p>

        <Button asChild>
          <Link href="/">{t('SHARED:NOT_FOUND_PAGE.RETURN_HOME_BUTTON.LABEL')}</Link>
        </Button>
      </div>
    </AppShell>
  );
}
