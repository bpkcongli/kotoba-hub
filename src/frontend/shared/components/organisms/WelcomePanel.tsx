'use client';

import { ArrowDown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/frontend/shared/components/atoms';
import { AppFooter, AppShell, PublicHeader } from '@/frontend/shared/components/layouts';
import { useUiTranslations } from '@/frontend/shared/hooks';

const learningSteps = [
  {
    title: 'SHARED:LANDING_PAGE.SYLLABUS_STEP.TITLE',
    description: 'SHARED:LANDING_PAGE.SYLLABUS_STEP.DESCRIPTION',
  },
  {
    title: 'SHARED:LANDING_PAGE.PRACTICE_STEP.TITLE',
    description: 'SHARED:LANDING_PAGE.PRACTICE_STEP.DESCRIPTION',
  },
  {
    title: 'SHARED:LANDING_PAGE.PROGRESS_STEP.TITLE',
    description: 'SHARED:LANDING_PAGE.PROGRESS_STEP.DESCRIPTION',
  },
] as const;

export function WelcomePanel() {
  const t = useUiTranslations();

  return (
    <AppShell
      variant="public"
      header={
        <PublicHeader
          actions={
            <Button asChild variant="ghost">
              <Link href="/login">{t('SHARED:APP_WORKSPACE.SIGN_IN_BUTTON.LABEL')}</Link>
            </Button>
          }
        />
      }
      footer={<AppFooter />}>
      <div className="py-4 md:py-8">
        <section aria-labelledby="welcome-heading" className="max-w-reading">
          <p className="mb-4 text-body-sm font-semibold text-muted-foreground">
            {t('SHARED:LANDING_PAGE.HERO.EYEBROW')}
          </p>

          <h1
            id="welcome-heading"
            className="max-w-xl text-h1 font-bold tracking-tight md:text-display">
            {t('SHARED:LANDING_PAGE.HERO.TITLE')}
          </h1>

          <p className="mt-6 max-w-xl text-body-lg text-muted-foreground">
            {t('SHARED:LANDING_PAGE.HERO.DESCRIPTION')}
          </p>

          <Button asChild className="mt-8">
            <Link href="/login">{t('AUTH:LOGIN_SCREEN.GOOGLE_SIGN_IN_BUTTON.LABEL')}</Link>
          </Button>

          <p className="mt-4 text-body-sm text-muted-foreground">
            {t('SHARED:LANDING_PAGE.SIGN_IN_BUTTON.HELP_TEXT')}
          </p>

          <a
            href="#learning-approach"
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md text-body-sm text-muted-foreground focus-visible:focus-ring">
            {t('SHARED:LANDING_PAGE.LEARNING_APPROACH_LINK.LABEL')}{' '}
            <ArrowDown aria-hidden="true" className="size-4" />
          </a>
        </section>

        <section
          id="learning-approach"
          aria-labelledby="approach-heading"
          className="mt-16 scroll-mt-8 border-t border-border-subtle pt-8">
          <h2 id="approach-heading" className="text-h2 font-semibold">
            {t('SHARED:LANDING_PAGE.LEARNING_APPROACH_SECTION.TITLE')}
          </h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {learningSteps.map((step, index) => (
              <li key={step.title}>
                <span
                  aria-hidden="true"
                  className="mb-4 flex size-11 items-center justify-center rounded-md bg-secondary text-body-sm font-semibold">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-h3 font-semibold">{t(step.title)}</h3>
                <p className="mt-3 text-body text-muted-foreground">{t(step.description)}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </AppShell>
  );
}
