'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/frontend/shared/components/atoms';
import { ErrorStatePanel } from '@/frontend/shared/components/organisms';
import { useAppSessionStore } from '@/frontend/shared/hooks';
import type { StoreError } from '@/frontend/shared/interfaces';

export function ProgressError({
  error,
  retry,
  title = 'Could not refresh progress',
  previousData = false,
}: {
  error: StoreError;
  retry: () => void;
  title?: string;
  previousData?: boolean;
}) {
  return (
    <div className="space-y-2">
      <ErrorStatePanel
        title={title}
        description={error.message}
        action={
          <Button variant="secondary" onClick={retry}>
            Try again
          </Button>
        }
      />

      {previousData && (
        <p className="text-body-sm text-muted-foreground">
          Showing previously loaded data. This section could not be refreshed.
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
        <p className="text-caption text-muted-foreground">Reference: {error.traceId}</p>
      )}
    </div>
  );
}

export function ProgressAccessIssue({ issue }: { issue: 'session' | 'onboarding' }) {
  const session = useAppSessionStore();

  useEffect(() => {
    void session.load();
  }, [issue, session]);

  return (
    <ErrorStatePanel
      title={
        issue === 'session'
          ? 'Sign in to view your progress'
          : 'Finish onboarding to view your progress'
      }
      description={
        issue === 'session'
          ? 'Your session has expired. Sign in again to continue.'
          : 'Confirm your learner profile before continuing.'
      }
      action={
        <Button asChild>
          <Link href={issue === 'session' ? '/login' : '/onboarding'}>
            {issue === 'session' ? 'Sign in again' : 'Continue onboarding'}
          </Link>
        </Button>
      }
    />
  );
}
