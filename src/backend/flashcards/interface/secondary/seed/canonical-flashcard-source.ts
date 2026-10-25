import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { flashcardArtifactSchema } from '@/backend/flashcards/application/helpers/flashcard-artifact-schema';
import type { FlashcardArtifact } from '@/backend/flashcards/application/helpers/flashcard-artifact-schema';
import type { CanonicalFlashcardSource } from '@/backend/flashcards/application/ports/canonical-flashcard-source.port';

const uuid = z.uuid();

export class FileCanonicalFlashcardSource implements CanonicalFlashcardSource {
  constructor(private readonly root = process.cwd()) {}

  async readArtifacts(): Promise<FlashcardArtifact[]> {
    return Promise.all(
      ['kana-foundation.json', 'vocabulary-foundation.json'].map(async (name) =>
        flashcardArtifactSchema.parse(
          JSON.parse(
            await readFile(`${this.root}/content/flashcards/system-decks/${name}`, 'utf8'),
          ),
        ),
      ),
    );
  }

  async readKanjiSkills() {
    const kanji = z.object({
      literal: z.string().min(1),
      meaningsEn: z.array(z.string()).min(1),
      onyomi: z.array(z.string()),
      kunyomi: z.array(z.string()),
    });

    const rows = [];

    for (const name of ['jlpt-n5-foundation', 'jlpt-n4-expansion']) {
      const data = JSON.parse(
        await readFile(`${this.root}/content/syllabus/tracks/${name}.json`, 'utf8'),
      ) as {
        track: {
          slug: string;
          units: {
            slug: string;
            lessons: {
              slug: string;
              skills: {
                id: string;
                code: string;
                skillType: string;
                content?: { kanji?: unknown };
              }[];
            }[];
          }[];
        };
      };

      for (const unit of data.track.units)
        for (const lesson of unit.lessons)
          for (const skill of lesson.skills) {
            if (skill.skillType !== 'KANJI') continue;

            rows.push({
              id: uuid.parse(skill.id),
              code: skill.code,
              trackSlug: data.track.slug,
              unitSlug: unit.slug,
              lessonSlug: lesson.slug,
              ...kanji.parse(skill.content?.kanji),
            });
          }
    }

    return rows;
  }
}
