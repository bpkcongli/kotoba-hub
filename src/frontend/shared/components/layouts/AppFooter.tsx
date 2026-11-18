'use client';

import type { ReactNode } from 'react';
import { useUiTranslations } from '@/frontend/shared/hooks';

export function AppFooter({ children }: { children?: ReactNode }) {
  const t = useUiTranslations();

  return (
    <footer className="border-t border-border-subtle">
      <div className="mx-auto max-w-public px-4 py-6 text-body-sm text-muted-foreground md:px-6 lg:px-8">
        {children ?? t('SHARED:APP_FOOTER.PRODUCT_DESCRIPTION.LABEL')}
      </div>
    </footer>
  );
}
