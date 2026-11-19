import { readFile } from 'node:fs/promises';
import { StandaloneVocabularySeed } from '@/backend/syllabus/domain/value-objects/standalone-vocabulary-seed';
import { FileCanonicalFlashcardSource } from '@/backend/flashcards/interface/secondary/seed/canonical-flashcard-source';
import { FlashcardSeedCatalogAdapter } from '@/backend/flashcards/interface/secondary/syllabus/flashcard-seed-catalog.adapter';
import { syllabusCatalogService } from '@/backend/syllabus/infrastructure/di';
import { prepareFlashcardSeedService } from '@/backend/flashcards/infrastructure/di';
import { DrizzleFlashcardImporter } from '@/backend/flashcards/interface/secondary/seed/drizzle-flashcard-importer';
import { closeDatabase } from '@/backend/shared/infrastructure/database/connection';

async function main() {
  try {
    let promotions;

    if (process.argv.includes('--vocabulary-groups')) {
      const path = process.argv[process.argv.indexOf('--vocabulary-groups') + 1];

      if (!path || path.startsWith('--'))
        throw new Error('--vocabulary-groups requires a manifest path.');

      const inventory = (await new FileCanonicalFlashcardSource().readArtifacts()).flatMap(
        (artifact) => artifact.items,
      );

      const { manifest } = new StandaloneVocabularySeed(
        JSON.parse(await readFile(path, 'utf8')),
        inventory,
      );

      promotions = manifest.groups
        .filter((group) => group.isPublished)
        .flatMap((group) => group.items.map((item) => ({ ...item, targetSkillId: group.id })));
    }

    const plan = await prepareFlashcardSeedService.prepare(promotions);

    const localizationCoverage = Object.fromEntries(
      (['en', 'id'] as const).map((locale) => [
        locale,
        {
          decks: plan.decks.filter((row) => row.localizations?.[locale]?.isPublished).length,
          items: plan.items.filter((row) => row.localizations?.[locale]?.isPublished).length,
        },
      ]),
    );

    if (process.argv.includes('--dry-run')) {
      process.stdout.write(
        `${JSON.stringify({ ...plan.counts, localizationCoverage }, null, 2)}\n`,
      );

      return;
    }

    await new DrizzleFlashcardImporter(
      new FlashcardSeedCatalogAdapter(syllabusCatalogService),
    ).import(plan);

    process.stdout.write(
      `${JSON.stringify({ ...plan.counts, localizationCoverage, imported: true }, null, 2)}\n`,
    );
  } finally {
    await closeDatabase();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
