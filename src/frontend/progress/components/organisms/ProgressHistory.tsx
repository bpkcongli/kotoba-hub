'use client';

import Link from 'next/link';
import {
  SOURCE_MESSAGE_KEYS,
  sessionStatusLabel,
  progressTime,
  progressNumber,
} from '@/frontend/progress/helpers';
import type {
  ProgressEvent,
  ProgressPagination,
  ProgressSession,
} from '@/frontend/progress/interfaces/entities';
import { Button } from '@/frontend/shared/components/atoms';
import { EmptyStatePanel } from '@/frontend/shared/components/organisms';
import { useUiTranslations } from '@/frontend/shared/hooks';
import type { Locale } from '@/shared/locale';

function Pagination({
  pagination,
  offset,
  loading,
  onPage,
  kind,
}: {
  pagination: ProgressPagination | null;
  offset: number;
  loading: boolean;
  onPage: (offset: number) => void;
  kind: 'sessions' | 'answers';
}) {
  const t = useUiTranslations();

  if (!pagination) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="secondary"
        disabled={loading || offset === 0}
        onClick={() => onPage(Math.max(0, offset - pagination.pageSize))}>
        {t('PROGRESS:HISTORY_PAGINATION.PREVIOUS_PAGE_BUTTON.LABEL')} {kind}
      </Button>

      <span className="text-body-sm text-muted-foreground">
        {t('PROGRESS:HISTORY_PAGINATION.CURRENT_PAGE.LABEL')} {pagination.pageNumber} ·{' '}
        {pagination.totalRecords} {kind}
      </span>

      <Button
        variant="secondary"
        disabled={loading || offset + pagination.pageSize >= pagination.totalRecords}
        onClick={() => onPage(offset + pagination.pageSize)}>
        {t('PROGRESS:HISTORY_PAGINATION.NEXT_PAGE_BUTTON.LABEL')} {kind}
      </Button>
    </div>
  );
}

export function RecentSessions({
  items,
  pagination,
  offset,
  loading,
  onPage,
  failed = false,
  locale = 'en',
}: {
  items: ProgressSession[];
  failed?: boolean;
  locale?: Locale;
  pagination: ProgressPagination | null;
  offset: number;
  loading: boolean;
  onPage: (offset: number) => void;
}) {
  const t = useUiTranslations();

  return (
    <div className="space-y-5" aria-busy={loading}>
      {loading && (
        <p role="status" className="text-body-sm text-muted-foreground">
          {t('PROGRESS:RECENT_SESSIONS.SESSION_LIST.LOADING_LABEL')}
        </p>
      )}

      {!items.length && failed ? null : !items.length && !loading ? (
        <EmptyStatePanel
          title={t('PROGRESS:RECENT_SESSIONS.EMPTY_SESSION_LIST.TITLE')}
          description={t('PROGRESS:RECENT_SESSIONS.EMPTY_SESSION_LIST.DESCRIPTION')}
        />
      ) : (
        <ul className="divide-y divide-border-subtle rounded-md border bg-card px-5 sm:px-8">
          {items.map((item, index) => (
            <li
              key={`${item.sourceType}:${item.sourceSessionId}:${item.lastActivityAt}:${index}`}
              className="space-y-2 py-5">
              <h3 className="font-semibold">{item.sessionTitle}</h3>

              <p className="text-body-sm">
                {t(SOURCE_MESSAGE_KEYS[item.sourceType])} ·{' '}
                {sessionStatusLabel(item.sessionStatus, locale)}
              </p>

              <p className="text-body-sm text-muted-foreground">
                {item.correctCount} {t('SHARED:ANSWER_STATUS.CORRECT.COUNT_UNIT_LABEL')}{' '}
                {item.incorrectCount} {t('PROGRESS:RECENT_SESSIONS.INCORRECT_COUNT.UNIT_LABEL')}{' '}
                {item.totalInteractions}{' '}
                {t('PROGRESS:RECENT_SESSIONS.INTERACTION_COUNT.UNIT_LABEL')}
              </p>

              <p className="text-body-sm">
                {t('PROGRESS:RECENT_SESSIONS.AVERAGE_ANSWER_SCORE.LABEL')}{' '}
                {item.averageScore === null
                  ? t('SHARED:VALUE_FORMATTING.UNAVAILABLE_VALUE.LABEL')
                  : `${progressNumber(item.averageScore, locale)}/100`}
              </p>

              <p className="text-caption text-muted-foreground">
                {progressTime(item.lastActivityAt, locale)}
              </p>

              {item.unitSlug && (
                <Button asChild variant="ghost">
                  <Link href={`/syllabus/units/${encodeURIComponent(item.unitSlug)}`}>
                    {t('PROGRESS:RECENT_SESSIONS.REVIEW_UNIT_BUTTON.LABEL')}
                  </Link>
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Pagination
        pagination={pagination}
        offset={offset}
        loading={loading}
        onPage={onPage}
        kind="sessions"
      />
    </div>
  );
}

export function AnswerHistory({
  items,
  pagination,
  offset,
  loading,
  onPage,
  failed = false,
  locale = 'en',
}: {
  items: ProgressEvent[];
  failed?: boolean;
  locale?: Locale;
  pagination: ProgressPagination | null;
  offset: number;
  loading: boolean;
  onPage: (offset: number) => void;
}) {
  const t = useUiTranslations();

  return (
    <div className="space-y-5" aria-busy={loading}>
      {loading && (
        <p role="status" className="text-body-sm text-muted-foreground">
          {t('PROGRESS:ANSWER_HISTORY.ANSWER_LIST.LOADING_LABEL')}
        </p>
      )}

      {!items.length && failed ? null : !items.length && !loading ? (
        <EmptyStatePanel
          title={t('PROGRESS:ANSWER_HISTORY.EMPTY_ANSWER_LIST.TITLE')}
          description={t('PROGRESS:ANSWER_HISTORY.EMPTY_ANSWER_LIST.DESCRIPTION')}
        />
      ) : (
        <ol className="divide-y divide-border-subtle rounded-md border bg-card px-5 sm:px-8">
          {items.map((item) => (
            <li key={item.id} className="space-y-2 py-5">
              <h3 className="font-semibold">{item.skillTitle}</h3>

              <p className="text-body-sm">
                {t(SOURCE_MESSAGE_KEYS[item.sourceType])} ·{' '}
                {item.isCorrect
                  ? t('SHARED:ANSWER_STATUS.CORRECT.LABEL')
                  : t('SHARED:ANSWER_STATUS.INCORRECT.LABEL')}{' '}
                {t('PROGRESS:ANSWER_HISTORY.ANSWER_SCORE.LABEL')}{' '}
                {progressNumber(item.numericScore, locale)}/100
              </p>

              <p className="text-caption text-muted-foreground">
                {progressTime(item.answeredAt, locale)}
              </p>

              <Button asChild variant="ghost">
                <Link href={`/syllabus/lessons/${encodeURIComponent(item.lessonSlug)}`}>
                  {t('SHARED:LEARNING_ACTIONS.REVIEW_LESSON_LINK.LABEL')}
                </Link>
              </Button>
            </li>
          ))}
        </ol>
      )}

      <Pagination
        pagination={pagination}
        offset={offset}
        loading={loading}
        onPage={onPage}
        kind="answers"
      />
    </div>
  );
}
