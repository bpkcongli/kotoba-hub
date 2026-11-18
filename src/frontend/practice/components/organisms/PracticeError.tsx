'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useEffect } from 'react';
import { usePracticeStore } from '@/frontend/practice/hooks';
import { Button } from '@/frontend/shared/components/atoms';
import { ErrorStatePanel } from '@/frontend/shared/components/organisms';
import { errorMessage } from '@/frontend/shared/helpers/error-message';
import { useAppSessionStore, useUiTranslations } from '@/frontend/shared/hooks';

export const PracticeError = observer(function PracticeError({ title }: { title?: string }) {
  const t = useUiTranslations();

  const store = usePracticeStore();
  const session = useAppSessionStore();

  useEffect(() => {
    if (store.accessIssue) void session.load();
  }, [store.accessIssue, session]);

  const accessIssue =
    store.accessIssue ??
    (session.snapshot?.authorization.appAccess === 'ANONYMOUS'
      ? 'session'
      : session.snapshot?.authorization.appAccess === 'ONBOARDING_REQUIRED'
        ? 'onboarding'
        : null);

  if (!store.error && !accessIssue) return null;

  return (
    <div className="space-y-3">
      <ErrorStatePanel
        title={title ?? t('SHARED:CLIENT_ERRORS.REQUEST_ERROR.TITLE')}
        description={
          (store.error ? errorMessage(store.error, t) : undefined) ??
          (accessIssue === 'session'
            ? t('PRACTICE:PRACTICE_ERROR.ANONYMOUS_ACCESS.DESCRIPTION')
            : t('PRACTICE:PRACTICE_ERROR.ONBOARDING_ACCESS.DESCRIPTION'))
        }
        action={
          accessIssue ? (
            <Button asChild>
              <Link href={accessIssue === 'session' ? '/login' : '/onboarding'}>
                {accessIssue === 'session'
                  ? t('SHARED:APP_WORKSPACE.SIGN_IN_BUTTON.LABEL')
                  : t('ONBOARDING:ONBOARDING_SCREEN.CONTINUE_ONBOARDING_BUTTON.LABEL')}
              </Link>
            </Button>
          ) : undefined
        }
      />

      {store.error?.fieldErrors.map((e, i) => (
        <p key={i} className="text-body-sm">
          {e.message}
        </p>
      ))}

      {store.error?.traceId && (
        <p className="text-caption break-all text-muted-foreground">
          {t('SHARED:ERROR_DETAILS.SUPPORT_REFERENCE.LABEL')} {store.error.traceId}
        </p>
      )}
    </div>
  );
});
