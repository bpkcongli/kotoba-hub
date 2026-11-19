import { readFile } from 'node:fs/promises';
import { FileCanonicalFlashcardSource } from '../../src/backend/flashcards/interface/secondary/seed/canonical-flashcard-source';
import { closeDatabase } from '../../src/backend/shared/infrastructure/database/connection';
import { StandaloneVocabularySeed } from '../../src/backend/syllabus/domain/value-objects/standalone-vocabulary-seed';
import { DrizzleVocabularyGroupImporter } from '../../src/backend/syllabus/interface/secondary/persistence/drizzle-vocabulary-group-importer';

async function main() {
  try {
    const path = process.argv[process.argv.indexOf('--manifest') + 1];

    if (!process.argv.includes('--manifest') || !path || path.startsWith('--'))
      throw new Error('--manifest <path> is required.');

    const input: unknown = JSON.parse(await readFile(path, 'utf8'));
    const inventory = (await new FileCanonicalFlashcardSource().readArtifacts()).flatMap(
      (artifact) => artifact.items,
    );

    const seed = new StandaloneVocabularySeed(input, inventory);

    if (!process.argv.includes('--dry-run'))
      await new DrizzleVocabularyGroupImporter().import(seed.manifest, inventory);

    process.stdout.write(
      `${JSON.stringify({ groups: seed.manifest.groups.length, items: seed.manifest.groups.reduce((n, g) => n + g.items.length, 0), imported: !process.argv.includes('--dry-run') })}\n`,
    );
  } finally {
    await closeDatabase();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
