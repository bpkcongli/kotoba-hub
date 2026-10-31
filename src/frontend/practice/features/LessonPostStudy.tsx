'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useEffect } from 'react';
import {
  PracticeQuestionPanel,
  PracticeFeedback,
  PracticeError,
} from '@/frontend/practice/components/organisms';
import { usePracticeStore } from '@/frontend/practice/hooks';
import { PracticeContainerProvider } from '@/frontend/practice/providers';
import { Button } from '@/frontend/shared/components/atoms';
import { FocusModeShell } from '@/frontend/shared/components/layouts';
import { LoadingPanel } from '@/frontend/shared/components/organisms';

export const LessonPostStudyScreen = observer(function LessonPostStudyScreen({
  lessonSlug,
}: {
  lessonSlug: string;
}) {
  const store = usePracticeStore();
  const quiz = store.lessonQuiz;
  const result = store.lessonResult;

  useEffect(() => {
    void store.loadLessonQuiz(lessonSlug);

    return () => store.dispose();
  }, [store, lessonSlug]);

  const u = result?.understandingProgress;

  return (
    <FocusModeShell
      title={quiz?.isReview ? 'Lesson review' : 'Post-study quiz'}
      exitAction={
        <Button asChild variant="ghost">
          <Link href={`/syllabus/lessons/${lessonSlug}`}>Back to lesson</Link>
        </Button>
      }>
      <div className="min-w-0 space-y-6 wrap-anywhere">
        <header className="space-y-3">
          <h1 className="text-h2 font-semibold">
            {quiz?.isReview ? 'Lesson review' : 'Post-study quiz'}
          </h1>

          <p className="text-muted-foreground">One question checks your lesson understanding.</p>
        </header>

        {store.isLoading ? (
          <LoadingPanel label="Loading your lesson question…" />
        ) : !quiz ? (
          <>
            <PracticeError title="The lesson quiz could not load" />

            {!store.accessIssue && (
              <Button onClick={() => void store.loadLessonQuiz(lessonSlug)}>Try again</Button>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap justify-between gap-3 text-body-sm">
              <p>Understanding {quiz.currentUnderstandingLevel}/10</p>

              <p>Difficulty {quiz.targetDifficultyLevel}/10</p>

              <p>Target understanding: {quiz.targetUnderstandingLevel}/10</p>
            </div>

            <PracticeQuestionPanel />

            <PracticeError title="Your answer could not be confirmed" />

            {store.error?.code === 142206002 && !store.accessIssue && (
              <div className="space-y-3">
                <p className="text-body-sm text-muted-foreground">
                  Your lesson question no longer matches the active difficulty. Load the current
                  question to continue.
                </p>

                <Button onClick={() => void store.loadLessonQuiz(lessonSlug)}>
                  Load current question
                </Button>
              </div>
            )}

            {store.stage === 'feedback' && u && (
              <>
                <PracticeFeedback />

                <section
                  aria-label="Lesson result"
                  className="space-y-3 rounded-md border border-border-subtle bg-card p-5">
                  <h2 className="text-h3 font-semibold">
                    {u.postStudyQuizCompleted ? 'Lesson completed' : 'Quiz required'}
                  </h2>

                  <p>
                    Understanding {u.currentUnderstandingLevelBefore} →{' '}
                    {u.currentUnderstandingLevelAfter}/10
                  </p>

                  <p className="text-body-sm text-muted-foreground">
                    {u.postStudyQuizCompleted
                      ? 'Your lesson completion is saved. Continue reviewing to build understanding.'
                      : 'Understanding has not changed. Review the lesson and try the question again.'}
                  </p>

                  <p className="text-body-sm">
                    Next review difficulty: {u.nextReviewDifficultyLevel}/10
                  </p>
                </section>

                <div className="flex flex-wrap gap-3">
                  <Button onClick={() => void store.loadLessonQuiz(lessonSlug)}>
                    {u.postStudyQuizCompleted ? 'Review again' : 'Try another question'}
                  </Button>

                  <Button asChild variant="secondary">
                    <Link href={`/syllabus/lessons/${lessonSlug}`}>Review lesson</Link>
                  </Button>

                  <Button asChild variant="secondary">
                    <Link href="/progress">View progress</Link>
                  </Button>

                  <Button asChild variant="ghost">
                    <Link href="/syllabus">Back to syllabus</Link>
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </FocusModeShell>
  );
});

export function LessonPostStudy({ lessonSlug }: { lessonSlug: string }) {
  return (
    <PracticeContainerProvider scopeKey={`post-study:${lessonSlug}`}>
      <LessonPostStudyScreen lessonSlug={lessonSlug} />
    </PracticeContainerProvider>
  );
}
