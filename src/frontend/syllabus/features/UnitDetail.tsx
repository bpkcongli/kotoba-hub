'use client';

import { observer } from 'mobx-react-lite';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import { useEffect } from 'react';
import { Button } from '@/frontend/shared/components/atoms';
import { EmptyStatePanel } from '@/frontend/shared/components/organisms';
import { useUiTranslations } from '@/frontend/shared/hooks';
import { SyllabusState } from '@/frontend/syllabus/components/organisms';
import { useSyllabusStore } from '@/frontend/syllabus/hooks';
import { SyllabusContainerProvider } from '@/frontend/syllabus/providers';

export const UnitDetailScreen = observer(function UnitDetailScreen({
  unitSlug,
}: {
  unitSlug: string;
}) {
  const t = useUiTranslations();
  const uiLocale = useLocale();

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
            <Link href="/syllabus">{t('SYLLABUS:UNIT_DETAIL.BACK_TO_SYLLABUS_LINK.LABEL')}</Link>
          </Button>

          <header lang={unit?.localization?.resolvedLocale} className="space-y-3">
            <p
              lang={unit.track.localization?.resolvedLocale}
              className="text-body-sm text-muted-foreground">
              {unit.track.curriculumLevel} · {unit.track.title}
            </p>

            <h1 className="text-h1 font-semibold">{unit.title}</h1>

            {unit.description && (
              <p className="max-w-2xl text-muted-foreground">{unit.description}</p>
            )}

            <p lang={uiLocale} className="text-body-sm">
              {t('SYLLABUS:CATALOG_SUMMARY.LESSON_COUNT.LABEL', { count: unit.lessons.length })}{' '}
              {t('SYLLABUS:UNIT_DETAIL.LESSON_ORDER.DESCRIPTION')}
            </p>
          </header>

          {unit.lessons.length ? (
            <ol className="divide-y divide-border-subtle rounded-md border border-border-subtle bg-card">
              {[...unit.lessons]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((lesson, index) => (
                  <li
                    lang={lesson.localization?.resolvedLocale}
                    key={lesson.slug}
                    className="space-y-4 p-5 sm:p-6">
                    <div className="space-y-2">
                      <p lang={uiLocale} className="text-caption text-muted-foreground">
                        {t('SHARED:CATALOG_ENTITIES.LESSON.LABEL')} {index + 1}
                        {lesson.estimatedMinutes !== null
                          ? t('SYLLABUS:LESSON_OVERVIEW.DURATION.VALUE_LABEL', {
                              count: lesson.estimatedMinutes,
                            })
                          : ''}
                      </p>

                      <h2 className="text-h3 font-semibold">{lesson.title}</h2>

                      {lesson.learningObjective && <p>{lesson.learningObjective}</p>}

                      <ul
                        lang={uiLocale}
                        aria-label={t('SYLLABUS:LESSON_OVERVIEW.COVERED_SKILLS_SECTION.TITLE')}
                        className="flex flex-wrap gap-x-4 gap-y-2 text-body-sm text-muted-foreground">
                        {lesson.skills.map((skill) => (
                          <li lang={skill.localization?.resolvedLocale} key={skill.code}>
                            {skill.title}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button asChild variant="secondary">
                      <Link lang={uiLocale} href={`/syllabus/lessons/${lesson.slug}`}>
                        {t('SYLLABUS:UNIT_DETAIL.READ_LESSON_BUTTON.LABEL')}{' '}
                        <span lang={lesson.localization?.resolvedLocale}>{lesson.title}</span>
                      </Link>
                    </Button>
                  </li>
                ))}
            </ol>
          ) : (
            <EmptyStatePanel
              title={t('SYLLABUS:UNIT_DETAIL.EMPTY_UNIT.TITLE')}
              description={t('SYLLABUS:UNIT_DETAIL.EMPTY_UNIT.DESCRIPTION')}
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
