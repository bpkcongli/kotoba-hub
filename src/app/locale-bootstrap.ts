import 'server-only';
import { getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { localizedCutoverBlockers } from '@/backend/syllabus/application/helpers/localize-syllabus';
import { syllabusCatalogService } from '@/backend/syllabus/infrastructure/di';
import { userPreferencesService } from '@/backend/users/infrastructure/di';
import { defaultPreferences, uiLocaleCookie } from '@/shared/locale';

export async function localeBootstrap(cookie: string | null) {
  const session = await getSessionSnapshot(cookie);
  const preferences = session.user
    ? await userPreferencesService.get(session.user.id)
    : { ...defaultPreferences, uiLocale: uiLocaleCookie(cookie) };

  const tracks = session.user ? await syllabusCatalogService.getPublishedTracks() : [];
  const blockers = localizedCutoverBlockers(tracks);
  const localizedSyllabus =
    tracks.some((track) =>
      track.units.some(
        (unit) => unit.isPublished && unit.lessons.some((lesson) => lesson.isPublished),
      ),
    ) && blockers.length === 0;

  if (blockers.length) console.info('Localized syllabus cutover held', { lessonSlugs: blockers });

  return { session, preferences, localizedSyllabus };
}
