import type {
  SyllabusCatalogRepository,
  SyllabusTrackSnapshot,
} from '@/backend/syllabus/domain/repositories/syllabus-catalog.repository';
import manifest from '../../../../../../content/syllabus/manifest.json';
import n2 from '../../../../../../content/syllabus/tracks/jlpt-n2-advanced.json';
import n3 from '../../../../../../content/syllabus/tracks/jlpt-n3-bridge.json';
import n4 from '../../../../../../content/syllabus/tracks/jlpt-n4-expansion.json';
import n5 from '../../../../../../content/syllabus/tracks/jlpt-n5-foundation.json';

const trackFiles: Record<string, unknown> = {
  'tracks/jlpt-n5-foundation.json': n5.track,
  'tracks/jlpt-n4-expansion.json': n4.track,
  'tracks/jlpt-n3-bridge.json': n3.track,
  'tracks/jlpt-n2-advanced.json': n2.track,
};

export class SeedSyllabusCatalogRepository implements SyllabusCatalogRepository {
  async getTracks(): Promise<SyllabusTrackSnapshot[]> {
    return manifest.tracks.map((entry) => {
      const track = trackFiles[entry.file] as SyllabusTrackSnapshot | undefined;

      if (
        !track ||
        track.slug !== entry.slug ||
        track.curriculumLevel !== entry.curriculumLevel ||
        track.isPublished !== entry.isPublished ||
        track.sortOrder !== entry.sortOrder
      ) {
        throw new Error(`Syllabus manifest mismatch for ${entry.slug}.`);
      }

      return track;
    });
  }
}
