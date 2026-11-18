'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/frontend/shared/components/atoms';
import { ErrorStatePanel } from '@/frontend/shared/components/organisms';
import { errorMessage } from '@/frontend/shared/helpers/error-message';
import { useAppSessionStore, useUiTranslations } from '@/frontend/shared/hooks';
import type { StoreError } from '@/frontend/shared/interfaces';

export function ProgressError({
  error,
  retry,
  title,
  previousData = false,
}: {
  error: StoreError;
  retry: () => void;
  title?: string;
  previousData?: boolean;
}) {
  const t = useUiTranslations();

  return (
    <div className="space-y-2">
      <ErrorStatePanel
        title={title ?? t('PROGRESS:PROGRESS_ERROR.REFRESH_ERROR.TITLE')}
        description={errorMessage(error, t)}
        action={
          <Button variant="secondary" onClick={retry}>
            {t('SHARED:RECOVERY_ACTIONS.RETRY_BUTTON.LABEL')}
          </Button>
        }
      />

      {previousData && (
        <p className="text-body-sm text-muted-foreground">
          {t('PROGRESS:PROGRESS_ERROR.PREVIOUS_DATA_NOTICE.DESCRIPTION')}
        </p>
      )}

      {error.fieldErrors.length > 0 && (
        <ul className="text-body-sm">
          {error.fieldErrors.map((field, index) => (
            <li key={index}>{field.message}</li>
          ))}
        </ul>
      )}

      {error.traceId && (
        <p className="text-caption text-muted-foreground">
          {t('SHARED:ERROR_DETAILS.TRACE_REFERENCE.LABEL')} {error.traceId}
        </p>
      )}
    </div>
  );
}

export function ProgressAccessIssue({ issue }: { issue: 'session' | 'onboarding' }) {
  const t = useUiTranslations();

  const session = useAppSessionStore();

  useEffect(() => {
    void session.load();
  }, [issue, session]);

  return (
    <ErrorStatePanel
      title={
        issue === 'session'
          ? t('PROGRESS:ACCESS_ERROR.ANONYMOUS_ACCESS.TITLE')
          : t('PROGRESS:ACCESS_ERROR.ONBOARDING_ACCESS.TITLE')
      }
      description={
        issue === 'session'
          ? t('PROGRESS:ACCESS_ERROR.ANONYMOUS_ACCESS.DESCRIPTION')
          : t('PROGRESS:ACCESS_ERROR.ONBOARDING_ACCESS.DESCRIPTION')
      }
      action={
        <Button asChild>
          <Link href={issue === 'session' ? '/login' : '/onboarding'}>
            {issue === 'session'
              ? t('PROGRESS:ACCESS_ERROR.SIGN_IN_BUTTON.LABEL')
              : t('ONBOARDING:ONBOARDING_SCREEN.CONTINUE_ONBOARDING_BUTTON.LABEL')}
          </Link>
        </Button>
      }
    />
  );
}
