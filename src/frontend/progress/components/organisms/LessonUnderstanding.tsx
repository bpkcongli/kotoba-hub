import Link from 'next/link';
import type { LessonProgress } from '@/frontend/progress/interfaces/entities';
import { Badge, Button, Progress } from '@/frontend/shared/components/atoms';
import { EmptyStatePanel } from '@/frontend/shared/components/organisms';

export function LessonUnderstanding({ lessons }: { lessons: LessonProgress[] }) {
  if (!lessons.length)
    return (
      <EmptyStatePanel
        title="Choose a unit to view lesson progress"
        description="See each lesson’s current understanding and next quiz difficulty."
      />
    );

  const completedCount = lessons.filter((lesson) => lesson.isReview).length;

  return (
    <div className="space-y-3">
      <p className="text-body-sm text-muted-foreground">
        {completedCount} completed · {lessons.length - completedCount} quiz required in this unit
      </p>

      <ul className="divide-y divide-border-subtle rounded-md border bg-card px-5 sm:px-8">
        {lessons.map((lesson) => (
          <li key={lesson.lessonSlug} className="space-y-4 py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold">{lesson.title}</h3>

              <Badge variant="outline">{lesson.isReview ? 'Completed' : 'Quiz required'}</Badge>
            </div>

            <div className="space-y-2">
              <p className="text-body-sm">Understanding {lesson.currentUnderstandingLevel} of 10</p>

              <Progress
                label={`${lesson.title} understanding`}
                value={lesson.currentUnderstandingLevel}
                max={10}
              />

              <p className="text-body-sm text-muted-foreground">
                {lesson.isReview ? 'Next review' : 'Required quiz'} difficulty:{' '}
                {lesson.targetDifficultyLevel} of 10
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="secondary">
                <Link href={`/syllabus/lessons/${encodeURIComponent(lesson.lessonSlug)}`}>
                  Review lesson
                </Link>
              </Button>

              <Button asChild>
                <Link
                  href={`/syllabus/lessons/${encodeURIComponent(lesson.lessonSlug)}/post-study`}>
                  {lesson.isReview ? 'Review quiz' : 'Start post-study quiz'}
                </Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
