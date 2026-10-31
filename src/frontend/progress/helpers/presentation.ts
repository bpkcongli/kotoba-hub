import type { ProgressSourceType } from '@/frontend/progress/interfaces/entities';

export const SOURCE_LABELS: Record<ProgressSourceType, string> = {
  FLASHCARD: 'Flashcards',
  PRACTICE: 'Practice',
  LESSON_POST_STUDY: 'Lesson quiz',
};

export function difficultyLabel(band: string) {
  return (
    ({ REMEDIAL: 'Review', STANDARD: 'Standard', STRETCH: 'Stretch' } as Record<string, string>)[
      band
    ] ?? 'Not available'
  );
}

export function sessionStatusLabel(status: string) {
  return (
    (
      {
        GENERATED: 'Ready',
        ACTIVE: 'In progress',
        IN_PROGRESS: 'In progress',
        COMPLETED: 'Completed',
        ABANDONED: 'Ended',
        UNKNOWN: 'Status unavailable',
      } as Record<string, string>
    )[status] ?? 'Status unavailable'
  );
}

export function progressTime(value: string | null) {
  if (!value) return 'Not available';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  }).format(new Date(value));
}

export function progressNumber(value: number) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}
