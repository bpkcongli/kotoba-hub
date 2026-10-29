'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useEffect } from 'react';
import { usePracticeStore } from '@/frontend/practice/hooks';
import { Button } from '@/frontend/shared/components/atoms';
import { ErrorStatePanel } from '@/frontend/shared/components/organisms';
import { useAppSessionStore } from '@/frontend/shared/hooks';

export const PracticeError = observer(function PracticeError({
  title = 'The request could not be completed',
}: {
  title?: string;
}) {
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
        title={title}
        description={
          store.error?.message ??
          (accessIssue === 'session'
            ? 'Sign in to continue practicing.'
            : 'Complete onboarding to continue practicing.')
        }
        action={
          accessIssue ? (
            <Button asChild>
              <Link href={accessIssue === 'session' ? '/login' : '/onboarding'}>
                {accessIssue === 'session' ? 'Sign in' : 'Continue onboarding'}
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
          Support reference: {store.error.traceId}
        </p>
      )}
    </div>
  );
});
