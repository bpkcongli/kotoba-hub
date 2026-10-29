'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/frontend/shared/components/atoms';
import { EmptyStatePanel } from '@/frontend/shared/components/organisms';
import { SyllabusState } from '@/frontend/syllabus/components/organisms';
import { useSyllabusStore } from '@/frontend/syllabus/hooks';
import { SyllabusContainerProvider } from '@/frontend/syllabus/providers';

export const SyllabusMapScreen = observer(function SyllabusMapScreen() {
  const store = useSyllabusStore();

  useEffect(() => {
    void store.loadMap();

    return () => store.dispose();
  }, [store]);

  return (
    <SyllabusState retry={() => void store.loadMap()}>
      <div className="min-w-0 space-y-8 wrap-anywhere [&_a]:max-w-full [&_button]:max-w-full">
        <header className="space-y-3">
          <p className="text-body-sm font-semibold text-muted-foreground">Your learning path</p>

          <h1 className="text-h1 font-semibold">Syllabus</h1>

          <p className="max-w-2xl text-muted-foreground">
            Read each lesson, then answer its post-study quiz. A correct answer completes the lesson
            and builds your understanding up to level 10.
          </p>
        </header>

        {!store.tracks.length ? (
          <EmptyStatePanel
            title="No lessons are available yet"
            description="Published lessons will appear here when their study material and quizzes are ready."
            action={<Button onClick={() => void store.loadMap()}>Reload syllabus</Button>}
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-3" role="group" aria-label="Study level">
              {store.tracks.map((track) => (
                <Button
                  key={track.slug}
                  variant={track.slug === store.selectedTrackSlug ? 'default' : 'secondary'}
                  aria-pressed={track.slug === store.selectedTrackSlug}
                  onClick={() => store.selectTrack(track.slug)}>
                  {track.curriculumLevel} · {track.title}
                </Button>
              ))}
            </div>

            {store.selectedTrack && (
              <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.4fr)]">
                <section aria-label={store.selectedTrack.title} className="min-w-0 space-y-5">
                  <div className="space-y-2">
                    <h2 className="text-h2 font-semibold">{store.selectedTrack.title}</h2>

                    {store.selectedTrack.description && (
                      <p className="text-muted-foreground">{store.selectedTrack.description}</p>
                    )}
                  </div>

                  <ol className="space-y-4 border-l-2 border-border pl-5">
                    {store.selectedTrack.units.map((unit, index) => (
                      <li
                        key={unit.slug}
                        className="space-y-3 rounded-md border border-border-subtle bg-card p-5">
                        <p className="text-caption font-semibold text-muted-foreground">
                          Unit {index + 1}
                          {unit.isFoundationUnit ? ' · Foundation' : ''}
                        </p>
                        <h3 className="text-h3 font-semibold">{unit.title}</h3>
                        {unit.description && (
                          <p className="text-body-sm text-muted-foreground">{unit.description}</p>
                        )}
                        <p className="text-body-sm">
                          {unit.lessonCount} {unit.lessonCount === 1 ? 'lesson' : 'lessons'}
                        </p>
                        <Button asChild variant="secondary">
                          <Link href={`/syllabus/units/${unit.slug}`}>View {unit.title}</Link>
                        </Button>
                      </li>
                    ))}
                  </ol>
                </section>

                <aside className="space-y-3 self-start rounded-md bg-secondary p-5 text-body-sm">
                  <h2 className="font-semibold">Study, then check your understanding</h2>

                  <p className="text-muted-foreground">
                    Each lesson has a required one-question quiz. Reading alone does not complete
                    it.
                  </p>

                  <p className="text-muted-foreground">
                    Open a lesson to see your recorded understanding and next quiz difficulty.
                  </p>
                </aside>
              </div>
            )}
          </>
        )}
      </div>
    </SyllabusState>
  );
});

export function SyllabusMap() {
  return (
    <SyllabusContainerProvider>
      <SyllabusMapScreen />
    </SyllabusContainerProvider>
  );
}
