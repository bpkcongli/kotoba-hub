import { and, eq, getTableColumns, inArray } from 'drizzle-orm';
import type { MySqlTable } from 'drizzle-orm/mysql-core';
import { getDatabase } from '@/backend/shared/infrastructure/database/connection';
import {
  requireSeed,
  validateBilingualPlan,
} from '@/backend/syllabus/application/helpers/bilingual-seed-validation';
import type {
  BilingualSeedOwner,
  BilingualSeedPlan,
  BilingualSeedSkill,
} from '@/backend/syllabus/application/services/prepare-bilingual-seed.service';
import type { SyllabusTrackSnapshot } from '@/backend/syllabus/domain/repositories/syllabus-catalog.repository';
import { translationText } from '@/backend/syllabus/domain/value-objects/bilingual-content';
import * as s from '@/backend/syllabus/infrastructure/database/schema';
import { backfillPrerequisites } from './backfill-prerequisites';
import { stableMappingId, temporarySortOrders } from './drizzle-syllabus-importer';

type Database = ReturnType<typeof getDatabase>;

export function revisionFingerprint(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(revisionFingerprint).join(',')}]`;

  if (value && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${revisionFingerprint(v)}`)
      .join(',')}}`;

  return JSON.stringify(value);
}

export function canonicalRevisionPayload(owner: BilingualSeedOwner) {
  return Object.fromEntries(
    Object.entries(owner).filter(
      ([key]) =>
        ![
          'localizations',
          'contentRevision',
          'sortOrder',
          'isPublished',
          'units',
          'lessons',
          'skills',
          'contentBlocks',
          'postStudyQuestions',
        ].includes(key),
    ),
  );
}

export function assertRevision(
  previous: { contentRevision: number; revisionPayload: unknown } | undefined,
  incoming: BilingualSeedOwner,
) {
  if (!previous?.revisionPayload) return;

  requireSeed(
    incoming.contentRevision >= previous.contentRevision,
    `Revision decreased ${incoming.id}.`,
  );

  requireSeed(
    revisionFingerprint(previous.revisionPayload) ===
      revisionFingerprint(canonicalRevisionPayload(incoming)) ||
      incoming.contentRevision > previous.contentRevision,
    `Canonical changed without revision ${incoming.id}.`,
  );
}

export class DrizzleBilingualImporter {
  constructor(private readonly database: () => Database = getDatabase) {}

  async import(plan: BilingualSeedPlan, baseline: SyllabusTrackSnapshot[] = []) {
    requireSeed(plan.schemaVersion === '2.0.0', 'Unsupported seed version.');
    validateBilingualPlan(plan);

    const incomingLessons = plan.tracks.flatMap((t) => t.units.flatMap((u) => u.lessons));

    requireSeed(
      incomingLessons.length === plan.lessonIds.length &&
        incomingLessons.every((l) => plan.lessonIds.includes(l.id)),
      'Manifest lesson scope mismatch.',
    );

    return this.database().transaction(async (tx) => {
      const trackRows = await tx.select().from(s.tracks).for('update');
      const unitRows = await tx.select().from(s.units).for('update');
      const lessonRows = await tx.select().from(s.lessons).for('update');
      const skillRows = await tx.select().from(s.skills).for('update');
      const blockRows = await tx.select().from(s.lessonContentBlocks).for('update');
      const questionRows = await tx.select().from(s.lessonPostStudyQuestions).for('update');

      const prerequisiteSkillCodes = await backfillPrerequisites(
        tx,
        incomingLessons.flatMap((l) => l.skills),
        baseline,
      );

      async function upsert(table: MySqlTable, values: Record<string, unknown>) {
        await tx.insert(table).values(values).onDuplicateKeyUpdate({ set: values });
      }

      async function saveOwner(
        table: MySqlTable,
        translations: MySqlTable,
        fk: string,
        owner: BilingualSeedOwner,
        values: Record<string, unknown>,
        previous?: { contentRevision: number; revisionPayload: unknown },
      ) {
        assertRevision(previous, owner);

        const columns = getTableColumns(translations);
        const old = await tx.select().from(translations).where(eq(columns[fk], owner.id));

        for (const [locale, text] of Object.entries(owner.localizations)) {
          const before = old.find((r) => r.locale === locale);
          const revisionPayload = { ...translationText(text), sourceRefs: text.sourceRefs };

          if (before) {
            requireSeed(
              text.translationRevision >= Number(before.translationRevision) &&
                text.sourceRevision >= Number(before.sourceRevision),
              `Translation revision decreased ${owner.id}/${locale}.`,
            );

            const changed =
              revisionFingerprint(before.revisionPayload) !== revisionFingerprint(revisionPayload);

            requireSeed(
              !changed || text.translationRevision > Number(before.translationRevision),
              `Translation changed without revision ${owner.id}/${locale}.`,
            );

            if (locale === 'en')
              requireSeed(
                !changed ||
                  !previous?.revisionPayload ||
                  owner.contentRevision > previous.contentRevision,
                `English changed without canonical revision ${owner.id}.`,
              );
          }

          const payload = translationText(text);
          const textValues = ['contentBlockId', 'questionId'].includes(fk)
            ? { content: payload }
            : payload;

          await upsert(translations, {
            [fk]: owner.id,
            locale,
            ...textValues,
            sourceRevision: text.sourceRevision,
            translationRevision: text.translationRevision,
            isPublished: text.isPublished,
            sourceRefPayload: text.sourceRefs,
            revisionPayload,
          });
        }

        // Omitted packages remain auditable, but may no longer be served.
        for (const before of old)
          if (!Object.hasOwn(owner.localizations, String(before.locale)))
            await tx
              .update(translations)
              .set({ isPublished: false })
              .where(and(eq(columns[fk], owner.id), eq(columns.locale, before.locale)));

        await upsert(table, {
          ...values,
          id: owner.id,
          contentRevision: owner.contentRevision,
          seedSchemaVersion: '2.0.0',
          revisionPayload: canonicalRevisionPayload(owner),
          isPublished: owner.isPublished,
          sortOrder: owner.sortOrder,
        });
      }

      function identity(
        rows: { id: string; slug?: string; code?: string }[],
        owner: BilingualSeedOwner,
        parentKey?: string,
        parentId?: string,
      ) {
        const byId = rows.find((r) => r.id === owner.id) as Record<string, unknown> | undefined;

        requireSeed(
          !byId ||
            ((!owner.slug || byId.slug === owner.slug) &&
              (!owner.code || byId.code === owner.code) &&
              (!parentKey || byId[parentKey] === parentId)),
          `Identity/parent conflict ${owner.id}.`,
        );

        requireSeed(
          !rows.some(
            (r) =>
              r.id !== owner.id &&
              ((owner.slug && r.slug === owner.slug) || (owner.code && r.code === owner.code)),
          ),
          `Stable ID conflict ${owner.id}.`,
        );
      }

      for (const track of plan.tracks) {
        identity(trackRows, track);

        if (!track.isPublished)
          requireSeed(
            !unitRows.some(
              (u) =>
                u.trackId === track.id &&
                u.isPublished &&
                lessonRows.some(
                  (l) => l.unitId === u.id && l.isPublished && !plan.lessonIds.includes(l.id),
                ),
            ),
            'Cannot unpublish ancestors of lessons outside merge scope.',
          );

        for (const unit of track.units) {
          identity(unitRows, unit, 'trackId', track.id);

          if (!unit.isPublished)
            requireSeed(
              !lessonRows.some(
                (l) => l.unitId === unit.id && l.isPublished && !plan.lessonIds.includes(l.id),
              ),
              'Cannot unpublish ancestors of lessons outside merge scope.',
            );

          for (const lesson of unit.lessons) {
            identity(lessonRows, lesson, 'unitId', unit.id);
            lesson.skills.forEach((o) => identity(skillRows, o, 'lessonId', lesson.id));
            lesson.contentBlocks.forEach((o) => identity(blockRows, o, 'lessonId', lesson.id));
            lesson.postStudyQuestions.forEach((o) => {
              identity(questionRows, o, 'lessonId', lesson.id);

              requireSeed(
                !questionRows.some(
                  (q) =>
                    q.lessonId === lesson.id &&
                    q.difficultyLevel === o.difficultyLevel &&
                    q.id !== o.id,
                ),
                `Question difficulty identity conflict ${o.id}.`,
              );
            });
          }
        }
      }

      // Stage only siblings being replaced; rows outside the merge retain their order and visibility.
      async function stage(
        table: MySqlTable,
        rows: { id: string; sortOrder: number }[],
        allRows: { sortOrder: number }[],
      ) {
        const values = temporarySortOrders([...allRows, ...rows]);
        const columns = getTableColumns(table);

        for (const [i, row] of rows.entries())
          await tx.update(table).set({ sortOrder: values[i] }).where(eq(columns.id, row.id));
      }

      const unitIds = plan.tracks.flatMap((t) => t.units.map((u) => u.id));
      await stage(
        s.units,
        unitRows.filter((r) => unitIds.includes(r.id)),
        unitRows,
      );
      await stage(
        s.lessons,
        lessonRows.filter((r) => plan.lessonIds.includes(r.id)),
        lessonRows,
      );
      await stage(
        s.skills,
        skillRows.filter((r) => plan.lessonIds.includes(r.lessonId)),
        skillRows,
      );
      await stage(
        s.lessonContentBlocks,
        blockRows.filter((r) => plan.lessonIds.includes(r.lessonId)),
        blockRows,
      );

      await tx
        .delete(s.unitSkillMappings)
        .where(inArray(s.unitSkillMappings.lessonId, plan.lessonIds));

      await tx
        .update(s.skills)
        .set({ isPublished: false })
        .where(inArray(s.skills.lessonId, plan.lessonIds));

      await tx
        .update(s.lessonContentBlocks)
        .set({ isPublished: false })
        .where(inArray(s.lessonContentBlocks.lessonId, plan.lessonIds));

      await tx
        .update(s.lessonPostStudyQuestions)
        .set({ isPublished: false })
        .where(inArray(s.lessonPostStudyQuestions.lessonId, plan.lessonIds));

      // Owners must exist before inserting their FK-bound translation rows.
      async function persist(
        table: MySqlTable,
        translationTable: MySqlTable,
        fk: string,
        owner: BilingualSeedOwner,
        values: Record<string, unknown>,
        previous?: { contentRevision: number; revisionPayload: unknown },
      ) {
        assertRevision(previous, owner);

        await upsert(table, {
          ...values,
          id: owner.id,
          contentRevision: owner.contentRevision,
          seedSchemaVersion: '2.0.0',
          sortOrder: owner.sortOrder,
          isPublished: owner.isPublished,
        });

        await saveOwner(table, translationTable, fk, owner, values, previous);
      }

      for (const track of plan.tracks) {
        const en = track.localizations.en!;

        await persist(
          s.tracks,
          s.trackTranslations,
          'trackId',
          track,
          {
            slug: track.slug,
            curriculumLevel: track.curriculumLevel,
            title: en.title,
            description: en.description,
          },
          trackRows.find((r) => r.id === track.id),
        );

        for (const unit of track.units) {
          const en = unit.localizations.en!;

          await persist(
            s.units,
            s.unitTranslations,
            'unitId',
            unit,
            {
              trackId: track.id,
              slug: unit.slug,
              title: en.title,
              description: en.description,
              isFoundationUnit: unit.isFoundationUnit,
            },
            unitRows.find((r) => r.id === unit.id),
          );

          for (const lesson of unit.lessons) {
            const en = lesson.localizations.en!;

            await persist(
              s.lessons,
              s.lessonTranslations,
              'lessonId',
              lesson,
              {
                unitId: unit.id,
                slug: lesson.slug,
                title: en.title,
                learningObjective: en.learningObjective,
                estimatedMinutes: lesson.estimatedMinutes,
              },
              lessonRows.find((r) => r.id === lesson.id),
            );

            for (const skill of lesson.skills) {
              const en = skill.localizations.en!;

              await persist(
                s.skills,
                s.skillTranslations,
                'skillId',
                skill,
                {
                  lessonId: lesson.id,
                  code: skill.code,
                  slug: skill.slug,
                  curriculumLevel: skill.curriculumLevel,
                  title: en.title,
                  description: en.description,
                  skillType: skill.skillType,
                  content: skill.content,
                  supportsFlashcards: skill.supportsFlashcards,
                  supportsPracticeObjective: skill.supportsPracticeObjective,
                  supportsPracticeFreeResponse: skill.supportsPracticeFreeResponse,
                  prerequisiteSkillCodes: skill.prerequisiteSkillCodes,
                },
                skillRows.find((r) => r.id === skill.id),
              );

              if (skill.isPublished)
                await upsert(s.unitSkillMappings, {
                  id: stableMappingId(unit.id, lesson.id, skill.id),
                  unitId: unit.id,
                  lessonId: lesson.id,
                  skillId: skill.id,
                  isPrimary: true,
                  sortOrder: lesson.sortOrder * 1000 + skill.sortOrder,
                });
            }

            for (const block of lesson.contentBlocks) {
              const en = translationText(block.localizations.en!);
              const content = { ...(block.content as object), ...en };

              if (block.blockType === 'EXAMPLE_SENTENCE') {
                content.englishTranslation = content.translation;
                delete content.translation;
              }

              if (content.title === null) delete content.title;

              await persist(
                s.lessonContentBlocks,
                s.lessonContentBlockTranslations,
                'contentBlockId',
                block,
                { lessonId: lesson.id, blockType: block.blockType, content },
                blockRows.find((r) => r.id === block.id),
              );
            }

            for (const question of lesson.postStudyQuestions) {
              const en = question.localizations.en!;
              const skill = lesson.skills.find(
                (s) => s.code === question.skillCode,
              ) as BilingualSeedSkill;

              await persist(
                s.lessonPostStudyQuestions,
                s.lessonPostStudyQuestionTranslations,
                'questionId',
                question,
                {
                  lessonId: lesson.id,
                  skillId: skill.id,
                  difficultyLevel: question.difficultyLevel,
                  questionType: question.questionType,
                  promptPayload: {
                    ...(question.promptPayload as object),
                    ...(en.placeholder !== null ? { placeholder: en.placeholder } : {}),
                    hintTexts: en.hintTexts,
                  },
                  expectedAnswerPayload: question.expectedAnswer,
                  explanationText: en.explanation,
                  sourceProvider: (question.sourceRefs as { provider: string }[])[0].provider,
                  sourceRefPayload: question.sourceRefs,
                },
                questionRows.find((r) => r.id === question.id),
              );
            }
          }
        }
      }

      return { prerequisiteSkillCodes };
    });
  }
}
