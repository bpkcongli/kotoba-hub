import Link from 'next/link';
import {
  SOURCE_LABELS,
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
  if (!pagination) return null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="secondary"
        disabled={loading || offset === 0}
        onClick={() => onPage(Math.max(0, offset - pagination.pageSize))}>
        Previous {kind}
      </Button>

      <span className="text-body-sm text-muted-foreground">
        Page {pagination.pageNumber} · {pagination.totalRecords} {kind}
      </span>

      <Button
        variant="secondary"
        disabled={loading || offset + pagination.pageSize >= pagination.totalRecords}
        onClick={() => onPage(offset + pagination.pageSize)}>
        Next {kind}
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
}: {
  items: ProgressSession[];
  failed?: boolean;
  pagination: ProgressPagination | null;
  offset: number;
  loading: boolean;
  onPage: (offset: number) => void;
}) {
  return (
    <div className="space-y-5" aria-busy={loading}>
      {loading && (
        <p role="status" className="text-body-sm text-muted-foreground">
          Loading recent sessions…
        </p>
      )}

      {!items.length && failed ? null : !items.length && !loading ? (
        <EmptyStatePanel
          title="No sessions to show"
          description="Learning activities that contribute to your syllabus progress will appear here."
        />
      ) : (
        <ul className="divide-y divide-border-subtle rounded-md border bg-card px-5 sm:px-8">
          {items.map((item, index) => (
            <li
              key={`${item.sourceType}:${item.sourceSessionId}:${item.lastActivityAt}:${index}`}
              className="space-y-2 py-5">
              <h3 className="font-semibold">{item.sessionTitle}</h3>

              <p className="text-body-sm">
                {SOURCE_LABELS[item.sourceType]} · {sessionStatusLabel(item.sessionStatus)}
              </p>

              <p className="text-body-sm text-muted-foreground">
                {item.correctCount} correct · {item.incorrectCount} incorrect ·{' '}
                {item.totalInteractions} interactions
              </p>

              <p className="text-body-sm">
                Average answer score:{' '}
                {item.averageScore === null
                  ? 'Not available'
                  : `${progressNumber(item.averageScore)}/100`}
              </p>

              <p className="text-caption text-muted-foreground">
                {progressTime(item.lastActivityAt)}
              </p>

              {item.unitSlug && (
                <Button asChild variant="ghost">
                  <Link href={`/syllabus/units/${encodeURIComponent(item.unitSlug)}`}>
                    Review unit
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
}: {
  items: ProgressEvent[];
  failed?: boolean;
  pagination: ProgressPagination | null;
  offset: number;
  loading: boolean;
  onPage: (offset: number) => void;
}) {
  return (
    <div className="space-y-5" aria-busy={loading}>
      {loading && (
        <p role="status" className="text-body-sm text-muted-foreground">
          Loading answer history…
        </p>
      )}

      {!items.length && failed ? null : !items.length && !loading ? (
        <EmptyStatePanel
          title="No answers to show"
          description="Your recorded answers will appear here after a learning activity."
        />
      ) : (
        <ol className="divide-y divide-border-subtle rounded-md border bg-card px-5 sm:px-8">
          {items.map((item) => (
            <li key={item.id} className="space-y-2 py-5">
              <h3 className="font-semibold">{item.skillTitle}</h3>

              <p className="text-body-sm">
                {SOURCE_LABELS[item.sourceType]} · {item.isCorrect ? 'Correct' : 'Incorrect'} ·
                Answer score {progressNumber(item.numericScore)}/100
              </p>

              <p className="text-caption text-muted-foreground">{progressTime(item.answeredAt)}</p>

              <Button asChild variant="ghost">
                <Link href={`/syllabus/lessons/${encodeURIComponent(item.lessonSlug)}`}>
                  Review lesson
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
