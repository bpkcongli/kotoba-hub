'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/frontend/shared/components/atoms';
import { ErrorStatePanel, LoadingPanel } from '@/frontend/shared/components/organisms';
import { useAppSessionStore } from '@/frontend/shared/hooks';
import { LessonRichText } from '@/frontend/syllabus/components/organisms';
import { useSyllabusStore } from '@/frontend/syllabus/hooks';
import { SyllabusContainerProvider } from '@/frontend/syllabus/providers';

export const LessonPostStudyScreen = observer(function LessonPostStudyScreen({
  lessonSlug,
}: {
  lessonSlug: string;
}) {
  const store = useSyllabusStore();
  const session = useAppSessionStore();

  useEffect(() => {
    void store.loadQuiz(lessonSlug);

    return () => store.dispose();
  }, [store, lessonSlug]);

  useEffect(() => {
    if (store.accessIssue) void session.load();
  }, [store.accessIssue, session]);

  const quiz = store.quiz;

  return (
    <div className="mx-auto max-w-reading min-w-0 space-y-8 wrap-anywhere [&_a]:max-w-full [&_button]:max-w-full">
      <Button asChild variant="ghost">
        <Link href={`/syllabus/lessons/${lessonSlug}`}>← Back to lesson</Link>
      </Button>

      <header className="space-y-3">
        <h1 className="text-h1 font-semibold">
          {quiz?.isReview ? 'Lesson review' : 'Post-study quiz'}
        </h1>

        <p className="text-muted-foreground">One question checks your lesson understanding.</p>
      </header>

      {store.quizError ? (
        <ErrorStatePanel
          title="The lesson quiz could not load"
          description={store.quizError.message}
          action={
            store.accessIssue ? (
              <Button asChild>
                <Link href={store.accessIssue === 'session' ? '/login' : '/onboarding'}>
                  {store.accessIssue === 'session' ? 'Sign in' : 'Continue onboarding'}
                </Link>
              </Button>
            ) : (
              <Button onClick={() => void store.loadQuiz(lessonSlug)}>Try again</Button>
            )
          }
        />
      ) : !quiz ? (
        <LoadingPanel label="Loading your lesson question…" />
      ) : (
        <>
          <section
            aria-label="Lesson question"
            className="space-y-6 rounded-md border border-border-subtle bg-card p-5 sm:p-8">
            <div className="flex flex-wrap justify-between gap-3 text-body-sm">
              <span>Understanding {quiz.currentUnderstandingLevel}/10</span>

              <span>Difficulty {quiz.targetDifficultyLevel}/10</span>
            </div>

            <h2 className="text-h3 font-semibold">Fill in the missing kana</h2>

            <p lang="ja" className="font-japanese text-h2 leading-relaxed wrap-break-word">
              {quiz.question.promptPayload.sentenceTemplate}
            </p>

            {quiz.question.promptPayload.hintTexts?.map((hint, index) => (
              <LessonRichText key={index} html={hint} />
            ))}

            <p className="text-body-sm text-muted-foreground">
              Target understanding: {quiz.targetUnderstandingLevel}/10
            </p>
          </section>

          <div role="status" className="space-y-2 rounded-md bg-secondary p-5">
            <h2 className="font-semibold">Answer submission is not available yet</h2>

            <p className="text-body-sm text-muted-foreground">
              Your lesson question is ready. Answer entry and feedback are being added in a later
              update. Your understanding and lesson completion have not changed.
            </p>
          </div>
        </>
      )}
    </div>
  );
});

export function LessonPostStudy({ lessonSlug }: { lessonSlug: string }) {
  return (
    <SyllabusContainerProvider scopeKey={`post-study:${lessonSlug}`}>
      <LessonPostStudyScreen lessonSlug={lessonSlug} />
    </SyllabusContainerProvider>
  );
}
