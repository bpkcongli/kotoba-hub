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
import { Button } from '@/frontend/shared/components/atoms';
import { EmptyStatePanel, LoadingPanel } from '@/frontend/shared/components/organisms';

const selectClass =
  'min-h-11 w-full rounded-sm border border-input bg-card px-3 py-2 text-body text-foreground focus-visible:focus-ring';

export const ProgressDashboard = observer(function ProgressDashboard({
  mode = 'progress',
}: {
  mode?: 'progress' | 'dashboard';
}) {
  const store = useProgressStore();

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
            {mode === 'dashboard' ? 'Your next study step' : 'Learning progress'}
          </h1>

          <p className="text-muted-foreground">
            Review your skill mastery, lesson understanding, and recorded activity.
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
          Refresh progress
        </Button>
      </header>

      {mode === 'dashboard' && (
        <section
          className="space-y-3 rounded-md border bg-card p-5 sm:p-8"
          aria-labelledby="next-step-title">
          <h2 id="next-step-title" className="text-h3 font-semibold">
            Continue learning
          </h2>

          <p>Read a lesson, then answer its required post-study quiz to complete it.</p>

          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link href="/syllabus">View syllabus</Link>
            </Button>

            <Button asChild variant="secondary">
              <Link href="/progress">View progress</Link>
            </Button>
          </div>
        </section>
      )}

      <div className="grid items-end gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-body-sm font-medium">
          <span className="block">Track</span>

          <select
            className={selectClass}
            value={store.selectedTrackSlug}
            onChange={(event) => void store.selectTrack(event.target.value)}>
            <option value="">All tracks</option>

            {store.selectedTrackSlug &&
              !store.tracks.some((track) => track.slug === store.selectedTrackSlug) &&
              !store.overview?.trackSummaries.some(
                (track) => track.trackSlug === store.selectedTrackSlug,
              ) && <option value={store.selectedTrackSlug}>Selected track (history)</option>}

            {store.tracks.map((track) => (
              <option key={track.slug} value={track.slug}>
                {track.title}
              </option>
            ))}

            {store.overview?.trackSummaries
              .filter((summary) => !store.tracks.some((track) => track.slug === summary.trackSlug))
              .map((summary) => (
                <option key={summary.trackSlug} value={summary.trackSlug}>
                  {summary.trackTitle} (history)
                </option>
              ))}
          </select>
        </label>

        <label className="space-y-2 text-body-sm font-medium">
          <span className="block">Activity type</span>

          <select
            className={selectClass}
            value={store.sourceType}
            onChange={(event) =>
              void store.setSourceType(event.target.value as ProgressSourceType | '')
            }>
            <option value="">All activities</option>
            <option value="FLASHCARD">Flashcards</option>
            <option value="PRACTICE">Practice</option>
            <option value="LESSON_POST_STUDY">Lesson quiz</option>
          </select>
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
          title="Could not load the lesson catalog"
          error={store.catalogError}
          retry={() => void store.refresh()}
        />
      )}

      {(store.isLoading || (!store.isLoaded && !store.error)) && !store.overview && (
        <LoadingPanel label="Loading learning progress…" />
      )}

      {store.isLoading && store.overview && (
        <p role="status" className="text-body-sm text-muted-foreground">
          Refreshing progress…
        </p>
      )}

      {store.overview && (
        <>
          {store.overview.trackedSkillsCount === 0 && (
            <EmptyStatePanel
              title="No tracked progress yet"
              description="Read a lesson and answer its quiz, or practice a syllabus skill, to begin recording progress."
              action={
                <Button asChild>
                  <Link href="/syllabus">View syllabus</Link>
                </Button>
              }
            />
          )}

          <ProgressOverview overview={store.overview} />

          <WeakSkillAction overview={store.overview} />
        </>
      )}

      {mode === 'progress' && (
        <section aria-labelledby="lesson-understanding-title" className="space-y-5">
          <div className="space-y-2">
            <h2 id="lesson-understanding-title" className="text-h3 font-semibold">
              Lesson understanding
            </h2>

            <p className="text-body-sm text-muted-foreground">
              Completion starts at understanding level 1. Select a unit to check its current quiz
              status.
            </p>
          </div>

          <label className="block max-w-lg space-y-2 text-body-sm font-medium">
            <span className="block">Unit</span>

            <select
              className={selectClass}
              value={store.selectedUnitSlug}
              onChange={(event) => void store.selectUnit(event.target.value)}>
              <option value="">Choose a unit</option>

              {tracks.map((track) => (
                <optgroup key={track.slug} label={track.title}>
                  {track.units.map((unit) => (
                    <option key={unit.slug} value={unit.slug}>
                      {unit.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          {store.lessonsError && (
            <ProgressError
              previousData={store.lessonStatuses.length > 0}
              title="Could not refresh lesson understanding"
              error={store.lessonsError}
              retry={() => void store.selectUnit(store.selectedUnitSlug)}
            />
          )}

          {store.lessonsLoading && (
            <p role="status" className="text-body-sm text-muted-foreground">
              Loading lesson understanding…
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
            Recent sessions
          </h2>

          {store.sessionsError && (
            <ProgressError
              previousData={store.sessions.length > 0}
              title="Could not load recent sessions"
              error={store.sessionsError}
              retry={() => void store.loadSessions(store.sessionsOffset)}
            />
          )}

          <RecentSessions
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
                Answer history
              </h2>

              <p className="text-body-sm text-muted-foreground">
                Scores describe each answer. They are separate from your current skill mastery.
              </p>
            </div>

            {store.timelineError && (
              <ProgressError
                previousData={store.timeline.length > 0}
                title="Could not load answer history"
                error={store.timelineError}
                retry={() => void store.loadTimeline(store.timelineOffset)}
              />
            )}

            <AnswerHistory
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
