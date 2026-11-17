import { readFile } from 'node:fs/promises';
import { PrepareBilingualSeedServiceImpl } from '@/backend/syllabus/application/services/impl/prepare-bilingual-seed.service.impl';
import { SeedSyllabusCatalogRepository } from '@/backend/syllabus/interface/secondary/seed/seed-syllabus-catalog.repository';
import { DrizzleBilingualImporter } from '@/backend/syllabus/interface/secondary/persistence/drizzle-bilingual-importer';
import { closeDatabase } from '@/backend/shared/infrastructure/database/connection';
import { prepareSyllabusSeedService } from '@/backend/syllabus/infrastructure/di';
import { DrizzleSyllabusImporter } from '@/backend/syllabus/interface/secondary/persistence/drizzle-syllabus-importer';

async function main() {
  try {
    const manifestIndex = process.argv.indexOf('--manifest');
    const manifestPath =
      manifestIndex >= 0 ? process.argv[manifestIndex + 1] : 'content/syllabus/v1/manifest.json';
    if (!manifestPath || manifestPath.startsWith('--'))
      throw new Error('--manifest requires a path.');

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

    if (manifest.schemaVersion === '2.0.0') {
      const baseline = new SeedSyllabusCatalogRepository();
      const plan = await new PrepareBilingualSeedServiceImpl(baseline).prepare(manifestPath);
      const lessons = plan.tracks.flatMap((t) => t.units.flatMap((u) => u.lessons));

      const merge = process.argv.includes('--dry-run')
        ? undefined
        : await new DrizzleBilingualImporter().import(plan, await baseline.getTracks());

      process.stdout.write(
        JSON.stringify(
          {
            schemaVersion: plan.schemaVersion,
            importMode: 'MERGE_LESSONS',
            lessonCount: lessons.length,
            questionCount: lessons.reduce((n, l) => n + l.postStudyQuestions.length, 0),
            imported: !process.argv.includes('--dry-run'),
            ...(merge ?? {}),
          },
          null,
          2,
        ) + '\n',
      );

      return;
    }

    if (manifest.schemaVersion !== '1.0.0' || manifestPath !== 'content/syllabus/v1/manifest.json')
      throw new Error(
        'Unsupported syllabus manifest/version. Use the canonical v1 path or an explicit v2 manifest.',
      );

    const plan = await prepareSyllabusSeedService.prepare();
    const report = {
      counts: plan.counts,
      rejectedLessonCount: plan.rejectedLessons.length,
      rejectedLessons: plan.rejectedLessons,
    };

    if (process.argv.includes('--dry-run')) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);

      return;
    }

    await new DrizzleSyllabusImporter().import(plan);

    process.stdout.write(`${JSON.stringify({ ...report, imported: true }, null, 2)}\n`);
  } finally {
    await closeDatabase();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
