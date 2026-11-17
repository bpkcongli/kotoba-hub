import { prepareFlashcardSeedService } from '@/backend/flashcards/infrastructure/di';
import { DrizzleFlashcardImporter } from '@/backend/flashcards/interface/secondary/seed/drizzle-flashcard-importer';
import { closeDatabase } from '@/backend/shared/infrastructure/database/connection';

async function main() {
  try {
    const plan = await prepareFlashcardSeedService.prepare();
    if (process.argv.includes('--dry-run')) {
      process.stdout.write(`${JSON.stringify(plan.counts, null, 2)}\n`);

      return;
    }

    await new DrizzleFlashcardImporter().import(plan);
    process.stdout.write(`${JSON.stringify({ ...plan.counts, imported: true }, null, 2)}\n`);
  } finally {
    await closeDatabase();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
