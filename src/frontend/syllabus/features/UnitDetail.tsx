'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/frontend/shared/components/atoms';
import { EmptyStatePanel } from '@/frontend/shared/components/organisms';
import { SyllabusState } from '@/frontend/syllabus/components/organisms';
import { useSyllabusStore } from '@/frontend/syllabus/hooks';
import { SyllabusContainerProvider } from '@/frontend/syllabus/providers';

export const UnitDetailScreen = observer(function UnitDetailScreen({
  unitSlug,
}: {
  unitSlug: string;
}) {
  const store = useSyllabusStore();

  useEffect(() => {
    void store.loadUnit(unitSlug);

    return () => store.dispose();
  }, [store, unitSlug]);

  const unit = store.unit;

  return (
    <SyllabusState retry={() => void store.loadUnit(unitSlug)}>
      {unit && (
        <div className="min-w-0 space-y-8 wrap-anywhere [&_a]:max-w-full [&_button]:max-w-full">
          <Button asChild variant="ghost">
            <Link href="/syllabus">← Back to syllabus</Link>
          </Button>

          <header className="space-y-3">
            <p className="text-body-sm text-muted-foreground">
              {unit.track.curriculumLevel} · {unit.track.title}
            </p>

            <h1 className="text-h1 font-semibold">{unit.title}</h1>

            {unit.description && (
              <p className="max-w-2xl text-muted-foreground">{unit.description}</p>
            )}

            <p className="text-body-sm">
              {unit.lessons.length} {unit.lessons.length === 1 ? 'lesson' : 'lessons'} · Follow the
              order below
            </p>
          </header>

          {unit.lessons.length ? (
            <ol className="divide-y divide-border-subtle rounded-md border border-border-subtle bg-card">
              {[...unit.lessons]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((lesson, index) => (
                  <li key={lesson.slug} className="space-y-4 p-5 sm:p-6">
                    <div className="space-y-2">
                      <p className="text-caption text-muted-foreground">
                        Lesson {index + 1}
                        {lesson.estimatedMinutes !== null
                          ? ` · About ${lesson.estimatedMinutes} min`
                          : ''}
                      </p>

                      <h2 className="text-h3 font-semibold">{lesson.title}</h2>

                      {lesson.learningObjective && <p>{lesson.learningObjective}</p>}

                      <ul
                        aria-label="Covered skills"
                        className="flex flex-wrap gap-x-4 gap-y-2 text-body-sm text-muted-foreground">
                        {lesson.skills.map((skill) => (
                          <li key={skill.code}>{skill.title}</li>
                        ))}
                      </ul>
                    </div>
                    <Button asChild variant="secondary">
                      <Link href={`/syllabus/lessons/${lesson.slug}`}>Read {lesson.title}</Link>
                    </Button>
                  </li>
                ))}
            </ol>
          ) : (
            <EmptyStatePanel
              title="No lessons are available in this unit"
              description="Return to the syllabus to choose another unit."
            />
          )}
        </div>
      )}
    </SyllabusState>
  );
});

export function UnitDetail({ unitSlug }: { unitSlug: string }) {
  return (
    <SyllabusContainerProvider scopeKey={`unit:${unitSlug}`}>
      <UnitDetailScreen unitSlug={unitSlug} />
    </SyllabusContainerProvider>
  );
}
