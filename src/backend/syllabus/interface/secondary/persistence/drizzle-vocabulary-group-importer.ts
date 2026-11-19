import { getDatabase } from '@/backend/shared/infrastructure/database/connection';
import {
  StandaloneVocabularySeed,
  assertVocabularyGroupRevision,
} from '@/backend/syllabus/domain/value-objects/standalone-vocabulary-seed';
import type {
  PendingVocabularyIdentity,
  VocabularyGroupSeed,
} from '@/backend/syllabus/domain/value-objects/standalone-vocabulary-seed';
import {
  skills,
  tracks,
  skillTranslations,
} from '@/backend/syllabus/infrastructure/database/schema';

export class DrizzleVocabularyGroupImporter {
  async import(input: unknown, inventory: PendingVocabularyIdentity[]): Promise<void> {
    const { manifest } = new StandaloneVocabularySeed(input, inventory);

    await getDatabase().transaction(async (tx) => {
      const trackRows = await tx.select().from(tracks).for('update');
      const stored = await tx.select().from(skills).for('update');

      for (const group of manifest.groups) {
        const track = trackRows.find((row) => row.slug === group.trackSlug);
        if (!track || !track.isPublished || track.curriculumLevel !== group.curriculumLevel)
          throw new Error(`Vocabulary group requires published track: ${group.code}.`);

        const same = stored.find(
          (row) => row.id === group.id || row.code === group.code || row.slug === group.slug,
        );

        if (same) {
          if (same.ownerType !== 'FLASHCARD_VOCABULARY_GROUP' || !same.revisionPayload)
            throw new Error(`Vocabulary group identity conflict: ${group.code}.`);

          assertVocabularyGroupRevision(same.revisionPayload as VocabularyGroupSeed, group);
        }

        for (const row of stored) {
          if (row.id === group.id || row.ownerType !== 'FLASHCARD_VOCABULARY_GROUP') continue;

          const ids =
            (row.content as { vocabularyGroup?: { itemIds?: string[] } } | null)?.vocabularyGroup
              ?.itemIds ?? [];

          if (group.items.some((item) => ids.includes(item.itemId)))
            throw new Error('Vocabulary item already belongs to another group.');
        }
      }

      for (const group of manifest.groups) {
        const values = {
          id: group.id,
          code: group.code,
          slug: group.slug,
          lessonId: null,
          groupTrackId: trackRows.find((row) => row.slug === group.trackSlug)!.id,
          ownerType: 'FLASHCARD_VOCABULARY_GROUP',
          curriculumLevel: group.curriculumLevel,
          title: group.localizations.en.title,
          description: group.localizations.en.description,
          skillType: 'VOCABULARY',
          supportsFlashcards: true,
          supportsPracticeObjective: false,
          supportsPracticeFreeResponse: false,
          prerequisiteSkillCodes: [],
          sortOrder: group.sortOrder,
          content: {
            vocabularyGroup: {
              itemIds: group.items.map((item) => item.itemId),
              pendingSkillCodes: Object.fromEntries(
                group.items.map((item) => [item.itemId, item.pendingSkillCode]),
              ),
            },
          },
          contentRevision: group.contentRevision,
          seedSchemaVersion: '2.0.0',
          isPublished: group.isPublished,
          revisionPayload: group,
        };

        await tx.insert(skills).values(values).onDuplicateKeyUpdate({ set: values });

        for (const locale of ['en', 'id'] as const) {
          const text = group.localizations[locale];
          if (!text) continue;

          const localized = {
            skillId: group.id,
            locale,
            title: text.title,
            description: text.description,
            sourceRevision: text.sourceRevision,
            translationRevision: text.translationRevision,
            isPublished: text.isPublished,
            content: {},
            sourceRefPayload: text.sourceRefs,
            revisionPayload: text,
          };

          await tx
            .insert(skillTranslations)
            .values(localized)
            .onDuplicateKeyUpdate({ set: localized });
        }
      }

      // The importer owns only group skills; lesson imports and user history are untouched.
    });
  }
}
