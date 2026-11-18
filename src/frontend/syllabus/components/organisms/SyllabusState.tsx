'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useEffect, type ReactNode } from 'react';
import { Button } from '@/frontend/shared/components/atoms';
import { ErrorStatePanel, LoadingPanel } from '@/frontend/shared/components/organisms';
import { errorMessage } from '@/frontend/shared/helpers/error-message';
import { useAppSessionStore, useUiTranslations } from '@/frontend/shared/hooks';
import { useSyllabusStore } from '@/frontend/syllabus/hooks';

export const SyllabusState = observer(function SyllabusState({
  children,
  retry,
}: {
  children: ReactNode;
  retry: () => void;
}) {
  const t = useUiTranslations();

  const store = useSyllabusStore();
  const session = useAppSessionStore();

  useEffect(() => {
    if (store.accessIssue) void session.load();
  }, [store.accessIssue, session]);

  if (store.isLoading || (!store.isLoaded && !store.error))
    return <LoadingPanel label={t('SYLLABUS:SYLLABUS_STATE.WORKSPACE.LOADING_LABEL')} />;

  if (store.error)
    return (
      <ErrorStatePanel
        title={
          store.accessIssue === 'session'
            ? t('SYLLABUS:SYLLABUS_STATE.ANONYMOUS_ACCESS.TITLE')
            : store.accessIssue === 'onboarding'
              ? t('SYLLABUS:SYLLABUS_STATE.ONBOARDING_ACCESS.TITLE')
              : store.error.code === 140404001
                ? t('SYLLABUS:SYLLABUS_STATE.UNAVAILABLE_UNIT.TITLE')
                : store.error.code === 140404002
                  ? t('SYLLABUS:SYLLABUS_STATE.UNAVAILABLE_LESSON.TITLE')
                  : t('SYLLABUS:SYLLABUS_STATE.LOAD_ERROR.TITLE')
        }
        description={
          store.accessIssue === 'session'
            ? t('ONBOARDING:ONBOARDING_SCREEN.EXPIRED_SESSION_NOTICE.DESCRIPTION')
            : errorMessage(store.error, t)
        }
        action={
          store.accessIssue ? (
            <Button asChild>
              <Link href={store.accessIssue === 'session' ? '/login' : '/onboarding'}>
                {store.accessIssue === 'session'
                  ? t('SHARED:APP_WORKSPACE.SIGN_IN_BUTTON.LABEL')
                  : t('ONBOARDING:ONBOARDING_SCREEN.CONTINUE_ONBOARDING_BUTTON.LABEL')}
              </Link>
            </Button>
          ) : (
            <Button onClick={retry}>{t('SHARED:RECOVERY_ACTIONS.RETRY_BUTTON.LABEL')}</Button>
          )
        }
      />
    );

  return children;
});
