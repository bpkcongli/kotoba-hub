import { readFile, realpath } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import {
  requireSeed,
  validateBilingualPlan,
  validatePrerequisites,
} from '@/backend/syllabus/application/helpers/bilingual-seed-validation';
import type {
  BilingualSeedPlan,
  BilingualSeedTrack,
  PrepareBilingualSeedService,
} from '@/backend/syllabus/application/services/prepare-bilingual-seed.service';
import type { SyllabusCatalogRepository } from '@/backend/syllabus/domain/repositories/syllabus-catalog.repository';
import inventory from '../../../../../../docs/syllabus/bilingual/batch-01/bilingual-batch-01.json';
import manifestSchema from '../../../../../../docs/syllabus/schema/seed-manifest.v2.schema.json';
import trackSchema from '../../../../../../docs/syllabus/schema/track-seed.v2.schema.json';

const ajv = addFormats(new Ajv({ allErrors: true, strict: false }));
ajv.addFormat('uri', (value: string) => {
  try {
    return Boolean(new URL(value).protocol) && !/\s/.test(value);
  } catch {
    return false;
  }
});

const validateManifest = ajv.compile(manifestSchema);
const validateTrack = ajv.compile(trackSchema);

export class PrepareBilingualSeedServiceImpl implements PrepareBilingualSeedService {
  constructor(private readonly baseline: SyllabusCatalogRepository) {}

  async prepare(manifestPath: string): Promise<BilingualSeedPlan> {
    const manifest: {
      tracks: {
        slug: string;
        file: string;
        curriculumLevel: string;
        sortOrder: number;
        isPublished: boolean;
        lessonIds: string[];
      }[];
    } = JSON.parse(await readFile(manifestPath, 'utf8'));

    requireSeed(
      validateManifest(manifest),
      `Invalid v2 manifest: ${ajv.errorsText(validateManifest.errors)}`,
    );

    const root = await realpath(dirname(manifestPath));
    const tracks: BilingualSeedTrack[] = [],
      lessonIds: string[] = [];
    const paths = new Set<string>(),
      slugs = new Set<string>();

    for (const entry of manifest.tracks) {
      const path = await realpath(resolve(root, entry.file));

      requireSeed(
        path.startsWith(root + sep) && !paths.has(path) && !slugs.has(entry.slug),
        'Duplicate or escaping manifest entry.',
      );
      paths.add(path);
      slugs.add(entry.slug);

      const payload = JSON.parse(await readFile(path, 'utf8'));

      requireSeed(
        validateTrack(payload),
        `Invalid v2 track: ${ajv.errorsText(validateTrack.errors)}`,
      );

      const track = payload.track as BilingualSeedTrack;
      for (const key of ['slug', 'curriculumLevel', 'sortOrder', 'isPublished'] as const)
        requireSeed(track[key] === entry[key], `Manifest mismatch ${entry.slug}/${key}.`);

      const lessons = track.units.flatMap((u) => u.lessons);

      requireSeed(
        lessons.length === entry.lessonIds.length &&
          lessons.every((l) => entry.lessonIds.includes(l.id)),
        'Manifest lesson scope mismatch.',
      );

      // Batch 01 is the only reviewed publication scope until BIL-04 extends it explicitly.
      requireSeed(
        track.id === inventory.trackId &&
          lessons.every((l) =>
            inventory.lessons.some(
              (allowed) =>
                allowed.id === l.id &&
                allowed.slug === l.slug &&
                track.units.some(
                  (u) =>
                    u.id === allowed.unitId && u.slug === allowed.unitSlug && u.lessons.includes(l),
                ),
            ),
          ),
        'Lesson is outside reviewed batch 01.',
      );

      tracks.push(track);
      lessonIds.push(...entry.lessonIds);
    }

    requireSeed(new Set(lessonIds).size === lessonIds.length, 'Duplicate manifest lesson ID.');

    const plan: BilingualSeedPlan = { schemaVersion: '2.0.0', tracks, lessonIds };
    validateBilingualPlan(plan);

    const baseline = await this.baseline.getTracks();
    validatePrerequisites(
      tracks.flatMap((t) => t.units.flatMap((u) => u.lessons.flatMap((l) => l.skills))),
      baseline.flatMap((t) => t.units.flatMap((u) => u.lessons.flatMap((l) => l.skills))),
    );

    return plan;
  }
}
