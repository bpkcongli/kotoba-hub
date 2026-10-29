'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useEffect } from 'react';
import { Badge, Button } from '@/frontend/shared/components/atoms';
import { EmptyStatePanel, ErrorStatePanel } from '@/frontend/shared/components/organisms';
import { LessonContent, SyllabusState } from '@/frontend/syllabus/components/organisms';
import { useSyllabusStore } from '@/frontend/syllabus/hooks';
import { SyllabusContainerProvider } from '@/frontend/syllabus/providers';

export const LessonOverviewScreen = observer(function LessonOverviewScreen({
  lessonSlug,
}: {
  lessonSlug: string;
}) {
  const store = useSyllabusStore();

  useEffect(() => {
    void store.loadLesson(lessonSlug);

    return () => store.dispose();
  }, [store, lessonSlug]);

  const lesson = store.lesson;
  const quiz = store.quiz;

  return (
    <SyllabusState retry={() => void store.loadLesson(lessonSlug)}>
      {lesson && (
        <div className="mx-auto max-w-reading min-w-0 space-y-8 wrap-anywhere [&_a]:max-w-full [&_button]:max-w-full">
          <Button asChild variant="ghost">
            <Link href={`/syllabus/units/${lesson.unit.slug}`}>← Back to {lesson.unit.title}</Link>
          </Button>

          <header className="space-y-4">
            <p className="text-body-sm text-muted-foreground">
              {lesson.track.curriculumLevel} · {lesson.unit.title}
            </p>

            <h1 className="text-h1 font-semibold">{lesson.title}</h1>

            {lesson.learningObjective && <p className="text-body-lg">{lesson.learningObjective}</p>}

            <div className="flex flex-wrap items-center gap-3 text-body-sm">
              <Badge>
                {quiz?.currentUnderstandingLevel
                  ? 'Completed'
                  : store.readingFinished
                    ? 'Quiz required'
                    : 'Reading'}
              </Badge>

              {lesson.estimatedMinutes !== null && <span>About {lesson.estimatedMinutes} min</span>}

              {quiz && <span>Understanding {quiz.currentUnderstandingLevel}/10</span>}
            </div>

            <ul
              aria-label="Covered skills"
              className="flex flex-wrap gap-3 text-body-sm text-muted-foreground">
              {lesson.skills.map((skill) => (
                <li key={skill.code}>{skill.title}</li>
              ))}
            </ul>
          </header>

          {lesson.contentBlocks.length ? (
            <LessonContent blocks={lesson.contentBlocks} />
          ) : (
            <EmptyStatePanel
              title="Study material is unavailable"
              description="Try reloading this lesson before continuing to its quiz."
              action={
                <Button onClick={() => void store.loadLesson(lessonSlug)}>Reload lesson</Button>
              }
            />
          )}

          <section
            aria-labelledby="lesson-quiz-heading"
            className="space-y-4 rounded-md border border-border bg-card p-5 sm:p-6">
            <h2 id="lesson-quiz-heading" className="text-h2 font-semibold">
              {quiz?.isReview ? 'Review this lesson' : 'Check your understanding'}
            </h2>

            <p className="text-muted-foreground">
              Reading does not mark this lesson complete. Answer the required post-study quiz
              correctly to complete it. Each attempt has one question.
            </p>

            {quiz ? (
              <p className="text-body-sm">
                {quiz.isReview ? 'Next review' : 'Next quiz'}: difficulty{' '}
                {quiz.targetDifficultyLevel}/10 · Target understanding{' '}
                {quiz.targetUnderstandingLevel}/10
              </p>
            ) : store.quizError ? (
              <ErrorStatePanel
                title="Quiz details could not load"
                description={store.quizError.message}
                action={
                  <Button onClick={() => void store.loadQuiz(lessonSlug)}>
                    Reload quiz details
                  </Button>
                }
              />
            ) : (
              <p role="status" className="text-body-sm text-muted-foreground">
                Loading quiz details…
              </p>
            )}

            {lesson.contentBlocks.length > 0 &&
              (!store.readingFinished && !quiz?.isReview ? (
                <Button onClick={store.finishReading}>Finish reading</Button>
              ) : quiz ? (
                <Button asChild>
                  <Link href={`/syllabus/lessons/${lessonSlug}/post-study`}>
                    {quiz.isReview ? 'Review lesson quiz' : 'Start post-study quiz'}
                  </Link>
                </Button>
              ) : null)}

            <p className="text-caption text-muted-foreground">
              Your reading state is kept on this page. Only a correct quiz answer updates recorded
              completion.
            </p>
          </section>
        </div>
      )}
    </SyllabusState>
  );
});

export function LessonOverview({ lessonSlug }: { lessonSlug: string }) {
  return (
    <SyllabusContainerProvider scopeKey={`lesson:${lessonSlug}`}>
      <LessonOverviewScreen lessonSlug={lessonSlug} />
    </SyllabusContainerProvider>
  );
}
