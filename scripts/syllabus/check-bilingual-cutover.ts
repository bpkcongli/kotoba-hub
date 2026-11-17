import { closeDatabase } from '@/backend/shared/infrastructure/database/connection';
import { localizedCutoverBlockers } from '@/backend/syllabus/application/helpers/localize-syllabus';
import { syllabusCatalogService } from '@/backend/syllabus/infrastructure/di';

try {
  const tracks = await syllabusCatalogService.getPublishedTracks();
  const blockers = localizedCutoverBlockers(tracks);
  const ready =
    tracks.some((track) =>
      track.units.some(
        (unit) => unit.isPublished && unit.lessons.some((lesson) => lesson.isPublished),
      ),
    ) && blockers.length === 0;

  process.stdout.write(JSON.stringify({ ready, blockers }, null, 2) + '\n');

  if (!ready) process.exitCode = 1;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
} finally {
  await closeDatabase();
}
