import { closeDatabase } from '@/backend/shared/infrastructure/database/connection';
import { prepareSyllabusSeedService } from '@/backend/syllabus/infrastructure/di';
import { DrizzleSyllabusImporter } from '@/backend/syllabus/interface/secondary/persistence/drizzle-syllabus-importer';

async function main() {
  try {
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
