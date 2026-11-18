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

export const SyllabusMapScreen = observer(function SyllabusMapScreen() {
  const t = useUiTranslations();
  const uiLocale = useLocale();

  const store = useSyllabusStore();

  useEffect(() => {
    void store.loadMap();

    return () => store.dispose();
  }, [store]);

  return (
    <SyllabusState retry={() => void store.loadMap()}>
      <div className="min-w-0 space-y-8 wrap-anywhere [&_a]:max-w-full [&_button]:max-w-full">
        <header className="space-y-3">
          <p className="text-body-sm font-semibold text-muted-foreground">
            {t('SYLLABUS:SYLLABUS_MAP.PAGE.EYEBROW')}
          </p>

          <h1 className="text-h1 font-semibold">
            {t('SHARED:APP_NAVIGATION.SYLLABUS_LINK.LABEL')}
          </h1>

          <p className="max-w-2xl text-muted-foreground">
            {t('SYLLABUS:SYLLABUS_MAP.PAGE.DESCRIPTION')}
          </p>
        </header>

        {!store.tracks.length ? (
          <EmptyStatePanel
            title={t('SYLLABUS:SYLLABUS_MAP.EMPTY_SYLLABUS.TITLE')}
            description={t('SYLLABUS:SYLLABUS_MAP.EMPTY_SYLLABUS.DESCRIPTION')}
            action={
              <Button onClick={() => void store.loadMap()}>
                {t('SYLLABUS:SYLLABUS_MAP.RELOAD_SYLLABUS_BUTTON.LABEL')}
              </Button>
            }
          />
        ) : (
          <>
            <div
              className="flex flex-wrap gap-3"
              role="group"
              aria-label={t('SYLLABUS:SYLLABUS_MAP.STUDY_LEVEL_SELECT.LABEL')}>
              {store.tracks.map((track) => (
                <Button
                  key={track.slug}
                  lang={track.localization?.resolvedLocale}
                  variant={track.slug === store.selectedTrackSlug ? 'default' : 'secondary'}
                  aria-pressed={track.slug === store.selectedTrackSlug}
                  onClick={() => store.selectTrack(track.slug)}>
                  {track.curriculumLevel} · {track.title}
                </Button>
              ))}
            </div>

            {store.selectedTrack && (
              <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.4fr)]">
                <section
                  lang={store.selectedTrack.localization?.resolvedLocale}
                  aria-label={store.selectedTrack.title}
                  className="min-w-0 space-y-5">
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
                        lang={unit.localization?.resolvedLocale}
                        className="space-y-3 rounded-md border border-border-subtle bg-card p-5">
                        <p
                          lang={uiLocale}
                          className="text-caption font-semibold text-muted-foreground">
                          {t('SHARED:CATALOG_ENTITIES.UNIT.LABEL')} {index + 1}
                          {unit.isFoundationUnit
                            ? ` · ${t('SHARED:DIFFICULTY_OPTIONS.FOUNDATION.LABEL')}`
                            : ''}
                        </p>

                        <h3 className="text-h3 font-semibold">{unit.title}</h3>

                        {unit.description && (
                          <p className="text-body-sm text-muted-foreground">{unit.description}</p>
                        )}

                        <p lang={uiLocale} className="text-body-sm">
                          {t('SYLLABUS:CATALOG_SUMMARY.LESSON_COUNT.LABEL', {
                            count: unit.lessonCount,
                          })}
                        </p>

                        <Button asChild variant="secondary">
                          <Link lang={uiLocale} href={`/syllabus/units/${unit.slug}`}>
                            {t('SYLLABUS:SYLLABUS_MAP.VIEW_UNIT_BUTTON.LABEL')}{' '}
                            <span lang={unit.localization?.resolvedLocale}>{unit.title}</span>
                          </Link>
                        </Button>
                      </li>
                    ))}
                  </ol>
                </section>

                <aside className="space-y-3 self-start rounded-md bg-secondary p-5 text-body-sm">
                  <h2 className="font-semibold">
                    {t('SYLLABUS:SYLLABUS_MAP.STUDY_GUIDANCE.TITLE')}
                  </h2>

                  <p className="text-muted-foreground">
                    {t('SYLLABUS:SYLLABUS_MAP.STUDY_GUIDANCE.DESCRIPTION')}
                  </p>

                  <p className="text-muted-foreground">
                    {t('SYLLABUS:SYLLABUS_MAP.STUDY_GUIDANCE.QUIZ_HINT')}
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
