'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useEffect } from 'react';
import { useFlashcardStore } from '@/frontend/flashcards/hooks';
import { Button } from '@/frontend/shared/components/atoms';
import { ErrorStatePanel } from '@/frontend/shared/components/organisms';
import { errorMessage } from '@/frontend/shared/helpers/error-message';
import { useAppSessionStore, useUiTranslations } from '@/frontend/shared/hooks';

export const FlashcardError = observer(function FlashcardError({
  title,
  retry,
}: {
  title: string;
  retry?: () => void;
}) {
  const t = useUiTranslations();

  const store = useFlashcardStore();
  const session = useAppSessionStore();

  useEffect(() => {
    if (store.accessIssue) void session.load();
  }, [store.accessIssue, session]);

  if (!store.error) return null;

  return (
    <ErrorStatePanel
      title={title}
      description={errorMessage(store.error, t)}
      action={
        <div className="space-y-3">
          {store.error.fieldErrors.length > 0 && (
            <ul className="list-inside list-disc text-body-sm">
              {store.error.fieldErrors.map((error, index) => (
                <li key={index}>{error.message}</li>
              ))}
            </ul>
          )}

          {store.accessIssue ? (
            <Button asChild>
              <Link href={store.accessIssue === 'session' ? '/login' : '/onboarding'}>
                {store.accessIssue === 'session'
                  ? t('SHARED:APP_WORKSPACE.SIGN_IN_BUTTON.LABEL')
                  : t('ONBOARDING:ONBOARDING_SCREEN.CONTINUE_ONBOARDING_BUTTON.LABEL')}
              </Link>
            </Button>
          ) : retry ? (
            <Button
              onClick={retry}
              disabled={store.isLoading || store.isStarting || store.isSubmitting}>
              {t('SHARED:RECOVERY_ACTIONS.RETRY_BUTTON.LABEL')}
            </Button>
          ) : null}
        </div>
      }
    />
  );
});
