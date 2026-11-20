'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import {
  ProgressAccessIssue,
  ProgressError,
  ProgressOverview,
  WeakSkillAction,
  RecentSessions,
  AnswerHistory,
  LessonUnderstanding,
} from '@/frontend/progress/components/organisms';
import { useProgressStore, useProgressRefresh } from '@/frontend/progress/hooks';
import type { ProgressSourceType } from '@/frontend/progress/interfaces/entities';
import { Button, Select } from '@/frontend/shared/components/atoms';
import { EmptyStatePanel, LoadingPanel } from '@/frontend/shared/components/organisms';
import { useLocaleStore, useUiTranslations } from '@/frontend/shared/hooks';

export const ProgressDashboard = observer(function ProgressDashboard({
  mode = 'progress',
}: {
  mode?: 'progress' | 'dashboard';
}) {
  const t = useUiTranslations();

  const store = useProgressStore();
  const uiLocale = useLocaleStore().preferences.uiLocale;

  useProgressRefresh(store);

  if (store.accessIssue) return <ProgressAccessIssue issue={store.accessIssue} />;

  const tracks = store.selectedTrackSlug
    ? store.selectedTrack
      ? [store.selectedTrack]
      : []
    : store.tracks;

  return (
    <div className="min-w-0 space-y-8 wrap-anywhere">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-h2 font-bold tracking-tight md:text-h1">
            {mode === 'dashboard'
              ? t('PROGRESS:PROGRESS_DASHBOARD.PAGE.DASHBOARD_TITLE')
              : t('PROGRESS:PROGRESS_DASHBOARD.PAGE.PROGRESS_TITLE')}
          </h1>

          <p className="text-muted-foreground">
            {t('PROGRESS:PROGRESS_DASHBOARD.PAGE.DESCRIPTION')}
          </p>
        </div>

        <Button
          variant="secondary"
          disabled={
            store.isLoading ||
            store.sessionsLoading ||
            store.timelineLoading ||
            store.lessonsLoading
          }
          onClick={() => void store.refresh()}>
          {t('PROGRESS:PROGRESS_DASHBOARD.REFRESH_BUTTON.LABEL')}
        </Button>
      </header>

      {mode === 'dashboard' && (
        <section
          className="space-y-3 rounded-md border bg-card p-5 sm:p-8"
          aria-labelledby="next-step-title">
          <h2 id="next-step-title" className="text-h3 font-semibold">
            {t('PROGRESS:PROGRESS_DASHBOARD.CONTINUE_LEARNING_SECTION.TITLE')}
          </h2>

          <p>{t('PROGRESS:PROGRESS_DASHBOARD.CONTINUE_LEARNING_SECTION.DESCRIPTION')}</p>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/syllabus">
                {t('PROGRESS:PROGRESS_DASHBOARD.VIEW_SYLLABUS_BUTTON.LABEL')}
              </Link>
            </Button>

            <Button asChild variant="secondary">
              <Link href="/progress">
                {t('SHARED:LEARNING_ACTIONS.VIEW_PROGRESS_BUTTON.LABEL')}
              </Link>
            </Button>
          </div>
        </section>
      )}

      <div className="grid items-end gap-4 sm:grid-cols-2">
        <label className="field-stack text-body-sm font-medium">
          <span className="block">{t('PROGRESS:PROGRESS_DASHBOARD.TRACK_SELECT.LABEL')}</span>

          <Select
            className="rounded-sm"
            value={store.selectedTrackSlug}
            onChange={(event) => void store.selectTrack(event.target.value)}>
            <option value="">
              {t('PROGRESS:PROGRESS_DASHBOARD.TRACK_SELECT.ALL_OPTION_LABEL')}
            </option>

            {store.selectedTrackSlug &&
              !store.tracks.some((track) => track.slug === store.selectedTrackSlug) &&
              !store.overview?.trackSummaries.some(
                (track) => track.trackSlug === store.selectedTrackSlug,
              ) && (
                <option value={store.selectedTrackSlug}>
                  {t('PROGRESS:PROGRESS_DASHBOARD.TRACK_SELECT.SELECTED_HISTORY_OPTION_LABEL')}
                </option>
              )}

            {store.tracks.map((track) => (
              <option key={track.slug} value={track.slug}>
                {track.title}
              </option>
            ))}

            {store.overview?.trackSummaries
              .filter((summary) => !store.tracks.some((track) => track.slug === summary.trackSlug))
              .map((summary) => (
                <option key={summary.trackSlug} value={summary.trackSlug}>
                  {summary.trackTitle} {t('PROGRESS:PROGRESS_DASHBOARD.HISTORICAL_TRACK.SUFFIX')}
                </option>
              ))}
          </Select>
        </label>

        <label className="field-stack text-body-sm font-medium">
          <span className="block">
            {t('PROGRESS:PROGRESS_DASHBOARD.ACTIVITY_TYPE_SELECT.LABEL')}
          </span>

          <Select
            className="rounded-sm"
            value={store.sourceType}
            onChange={(event) =>
              void store.setSourceType(event.target.value as ProgressSourceType | '')
            }>
            <option value="">
              {t('PROGRESS:PROGRESS_DASHBOARD.ACTIVITY_TYPE_SELECT.ALL_OPTION_LABEL')}
            </option>
            <option value="FLASHCARD">{t('SHARED:APP_NAVIGATION.FLASHCARDS_LINK.LABEL')}</option>
            <option value="PRACTICE">{t('SHARED:APP_NAVIGATION.PRACTICE_LINK.LABEL')}</option>
            <option value="LESSON_POST_STUDY">
              {t('PROGRESS:PROGRESS_DASHBOARD.ACTIVITY_TYPE_SELECT.LESSON_QUIZ_OPTION_LABEL')}
            </option>
          </Select>
        </label>
      </div>

      {store.error && (
        <ProgressError
          previousData={!!store.overview}
          error={store.error}
          retry={() => void store.refresh()}
        />
      )}

      {store.catalogError && (
        <ProgressError
          previousData={store.tracks.length > 0}
          title={t('PROGRESS:PROGRESS_DASHBOARD.CATALOG_ERROR.TITLE')}
          error={store.catalogError}
          retry={() => void store.refresh()}
        />
      )}

      {(store.isLoading || (!store.isLoaded && !store.error)) && !store.overview && (
        <LoadingPanel label={t('PROGRESS:PROGRESS_DASHBOARD.OVERVIEW.LOADING_LABEL')} />
      )}

      {store.isLoading && store.overview && (
        <p role="status" className="text-body-sm text-muted-foreground">
          {t('PROGRESS:PROGRESS_DASHBOARD.OVERVIEW.REFRESHING_LABEL')}
        </p>
      )}

      {store.overview && (
        <>
          {store.overview.trackedSkillsCount === 0 && (
            <EmptyStatePanel
              title={t('PROGRESS:PROGRESS_DASHBOARD.EMPTY_OVERVIEW.TITLE')}
              description={t('PROGRESS:PROGRESS_DASHBOARD.EMPTY_OVERVIEW.DESCRIPTION')}
              action={
                <Button asChild>
                  <Link href="/syllabus">
                    {t('PROGRESS:PROGRESS_DASHBOARD.VIEW_SYLLABUS_BUTTON.LABEL')}
                  </Link>
                </Button>
              }
            />
          )}

          <ProgressOverview overview={store.overview} locale={uiLocale} />

          <WeakSkillAction overview={store.overview} />
        </>
      )}

      {mode === 'progress' && (
        <section aria-labelledby="lesson-understanding-title" className="space-y-5">
          <div className="space-y-2">
            <h2 id="lesson-understanding-title" className="text-h3 font-semibold">
              {t('PROGRESS:PROGRESS_DASHBOARD.LESSON_UNDERSTANDING_SECTION.TITLE')}
            </h2>

            <p className="text-body-sm text-muted-foreground">
              {t('PROGRESS:PROGRESS_DASHBOARD.LESSON_UNDERSTANDING_SECTION.DESCRIPTION')}
            </p>
          </div>

          <label className="field-stack max-w-lg text-body-sm font-medium">
            <span className="block">{t('SHARED:CATALOG_ENTITIES.UNIT.LABEL')}</span>

            <Select
              className="rounded-sm"
              value={store.selectedUnitSlug}
              onChange={(event) => void store.selectUnit(event.target.value)}>
              <option value="">{t('PROGRESS:PROGRESS_DASHBOARD.UNIT_SELECT.PLACEHOLDER')}</option>

              {tracks.map((track) => (
                <optgroup key={track.slug} label={track.title}>
                  {track.units.map((unit) => (
                    <option key={unit.slug} value={unit.slug}>
                      {unit.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          </label>

          {store.lessonsError && (
            <ProgressError
              previousData={store.lessonStatuses.length > 0}
              title={t('PROGRESS:PROGRESS_DASHBOARD.LESSON_UNDERSTANDING_ERROR.TITLE')}
              error={store.lessonsError}
              retry={() => void store.selectUnit(store.selectedUnitSlug)}
            />
          )}

          {store.lessonsLoading && (
            <p role="status" className="text-body-sm text-muted-foreground">
              {t('PROGRESS:PROGRESS_DASHBOARD.LESSON_UNDERSTANDING.LOADING_LABEL')}
            </p>
          )}

          <div aria-busy={store.lessonsLoading}>
            {(!store.lessonsError || store.lessonStatuses.length > 0) && (
              <LessonUnderstanding lessons={store.lessonStatuses} />
            )}
          </div>
        </section>
      )}

      <div className={mode === 'progress' ? 'grid items-start gap-8 lg:grid-cols-2' : 'space-y-8'}>
        <section aria-labelledby="recent-sessions-title" className="space-y-5">
          <h2 id="recent-sessions-title" className="text-h3 font-semibold">
            {t('PROGRESS:PROGRESS_DASHBOARD.RECENT_SESSIONS_SECTION.TITLE')}
          </h2>

          {store.sessionsError && (
            <ProgressError
              previousData={store.sessions.length > 0}
              title={t('PROGRESS:PROGRESS_DASHBOARD.RECENT_SESSIONS_ERROR.TITLE')}
              error={store.sessionsError}
              retry={() => void store.loadSessions(store.sessionsOffset)}
            />
          )}

          <RecentSessions
            locale={uiLocale}
            failed={!!store.sessionsError}
            items={store.sessions}
            pagination={store.sessionsPagination}
            offset={store.sessionsOffset}
            loading={store.sessionsLoading || (!store.sessionsPagination && !store.sessionsError)}
            onPage={(offset) => void store.loadSessions(offset)}
          />
        </section>

        {mode === 'progress' && (
          <section aria-labelledby="answer-history-title" className="space-y-5">
            <div className="space-y-2">
              <h2 id="answer-history-title" className="text-h3 font-semibold">
                {t('PROGRESS:PROGRESS_DASHBOARD.ANSWER_HISTORY_SECTION.TITLE')}
              </h2>

              <p className="text-body-sm text-muted-foreground">
                {t('PROGRESS:PROGRESS_DASHBOARD.ANSWER_HISTORY_SECTION.DESCRIPTION')}
              </p>
            </div>

            {store.timelineError && (
              <ProgressError
                previousData={store.timeline.length > 0}
                title={t('PROGRESS:PROGRESS_DASHBOARD.ANSWER_HISTORY_ERROR.TITLE')}
                error={store.timelineError}
                retry={() => void store.loadTimeline(store.timelineOffset)}
              />
            )}

            <AnswerHistory
              locale={uiLocale}
              failed={!!store.timelineError}
              items={store.timeline}
              pagination={store.timelinePagination}
              offset={store.timelineOffset}
              loading={store.timelineLoading || (!store.timelinePagination && !store.timelineError)}
              onPage={(offset) => void store.loadTimeline(offset)}
            />
          </section>
        )}
      </div>
    </div>
  );
});
