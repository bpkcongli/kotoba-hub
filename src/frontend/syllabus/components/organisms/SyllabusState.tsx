'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';
import { Button } from '@/frontend/shared/components/atoms';
import { ErrorStatePanel, LoadingPanel } from '@/frontend/shared/components/organisms';
import { useAppSessionStore } from '@/frontend/shared/hooks';
import { useSyllabusStore } from '@/frontend/syllabus/hooks';

export const SyllabusState = observer(function SyllabusState({
  children,
  retry,
}: {
  children: ReactNode;
  retry: () => void;
}) {
  const store = useSyllabusStore();
  const session = useAppSessionStore();

  useEffect(() => {
    if (store.accessIssue) void session.load();
  }, [store.accessIssue, session]);

  if (store.isLoading || (!store.isLoaded && !store.error))
    return <LoadingPanel label="Loading syllabus…" />;

  if (store.error)
    return (
      <ErrorStatePanel
        title={
          store.accessIssue === 'session'
            ? 'Sign in to continue'
            : store.accessIssue === 'onboarding'
              ? 'Finish your study plan'
              : store.error.code === 140404001
                ? 'Unit unavailable'
                : store.error.code === 140404002
                  ? 'Lesson unavailable'
                  : 'The syllabus could not load'
        }
        description={
          store.accessIssue === 'session'
            ? 'Your session expired. Sign in again to continue.'
            : store.error.message
        }
        action={
          store.accessIssue ? (
            <Button asChild>
              <Link href={store.accessIssue === 'session' ? '/login' : '/onboarding'}>
                {store.accessIssue === 'session' ? 'Sign in' : 'Continue onboarding'}
              </Link>
            </Button>
          ) : (
            <Button onClick={retry}>Try again</Button>
          )
        }
      />
    );

  return children;
});
