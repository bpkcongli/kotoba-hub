import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDatabase } from '@/backend/shared/infrastructure/database/connection';
import type { SyllabusSeedPlan } from '@/backend/syllabus/application/services/prepare-syllabus-seed.service';
import {
  lessonContentBlocks,
  lessonPostStudyQuestions,
  lessons,
  skills,
  tracks,
  units,
  unitSkillMappings,
} from '@/backend/syllabus/infrastructure/database/schema';

const mappingNamespace = 'bb604889-16f7-4df1-af25-73dc7b56a9e5';

export function stableMappingId(unitId: string, lessonId: string, skillId: string): string {
  const namespaceBytes = Buffer.from(mappingNamespace.replaceAll('-', ''), 'hex');
  const bytes = createHash('sha1')
    .update(namespaceBytes)
    .update(`${unitId}/${lessonId}/${skillId}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function temporarySortOrders(rows: { sortOrder: number }[]): number[] {
  if (!rows.length) return [];

  const base = Math.min(0, ...rows.map((row) => row.sortOrder)) - rows.length;
  if (base < -2_147_483_648)
    throw new Error('Syllabus sort order staging exceeded the MySQL integer range.');

  return rows.map((_, index) => base + index);
}

export class DrizzleSyllabusImporter {
  async import(plan: SyllabusSeedPlan): Promise<void> {
    await getDatabase().transaction(async (tx) => {
      const storedTracks = await tx.select({ id: tracks.id, slug: tracks.slug }).from(tracks);
      const storedUnits = await tx
        .select({
          id: units.id,
          slug: units.slug,
          trackId: units.trackId,
          sortOrder: units.sortOrder,
        })
        .from(units);
      const storedLessons = await tx
        .select({
          id: lessons.id,
          slug: lessons.slug,
          unitId: lessons.unitId,
          sortOrder: lessons.sortOrder,
        })
        .from(lessons);
      const storedSkills = await tx
        .select({
          id: skills.id,
          code: skills.code,
          slug: skills.slug,
          lessonId: skills.lessonId,
          sortOrder: skills.sortOrder,
        })
        .from(skills);
      const storedBlocks = await tx
        .select({
          id: lessonContentBlocks.id,
          lessonId: lessonContentBlocks.lessonId,
          sortOrder: lessonContentBlocks.sortOrder,
        })
        .from(lessonContentBlocks);
      const storedQuestions = await tx
        .select({
          id: lessonPostStudyQuestions.id,
          lessonId: lessonPostStudyQuestions.lessonId,
          difficultyLevel: lessonPostStudyQuestions.difficultyLevel,
        })
        .from(lessonPostStudyQuestions);

      for (const track of plan.tracks) {
        assertIdentity(
          storedTracks.find((row) => row.slug === track.slug)?.id,
          track.id,
          `track ${track.slug}`,
        );

        for (const unit of track.units) {
          assertIdentity(
            storedUnits.find((row) => row.slug === unit.slug)?.id,
            unit.id,
            `unit ${unit.slug}`,
          );

          for (const lesson of unit.lessons) {
            assertIdentity(
              storedLessons.find((row) => row.slug === lesson.slug)?.id,
              lesson.id,
              `lesson ${lesson.slug}`,
            );

            for (const block of lesson.contentBlocks) {
              const previous = storedBlocks.find((row) => row.id === block.id);
              if (previous && previous.lessonId !== lesson.id)
                throw new Error(`Content block ${block.id} moved to another lesson.`);
            }

            for (const skill of lesson.skills) {
              assertIdentity(
                storedSkills.find((row) => row.code === skill.code)?.id,
                skill.id,
                `skill ${skill.code}`,
              );

              assertIdentity(
                storedSkills.find((row) => row.slug === skill.slug)?.id,
                skill.id,
                `skill slug ${skill.slug}`,
              );
            }

            for (const question of lesson.postStudyQuestions ?? []) {
              assertIdentity(
                storedQuestions.find(
                  (row) =>
                    row.lessonId === lesson.id && row.difficultyLevel === question.difficultyLevel,
                )?.id,
                question.id,
                `question ${question.id}`,
              );

              const previous = storedQuestions.find((row) => row.id === question.id);
              if (previous && previous.lessonId !== lesson.id)
                throw new Error(`Question ${question.id} moved to another lesson.`);
            }
          }
        }
      }

      await tx.delete(unitSkillMappings);

      const stagedUnits = temporarySortOrders(storedUnits);
      for (const [index, unit] of storedUnits.entries()) {
        await tx.update(units).set({ sortOrder: stagedUnits[index] }).where(eq(units.id, unit.id));
      }

      const stagedLessons = temporarySortOrders(storedLessons);
      for (const [index, lesson] of storedLessons.entries()) {
        await tx
          .update(lessons)
          .set({ sortOrder: stagedLessons[index] })
          .where(eq(lessons.id, lesson.id));
      }

      const stagedSkills = temporarySortOrders(storedSkills);
      for (const [index, skill] of storedSkills.entries()) {
        await tx
          .update(skills)
          .set({ sortOrder: stagedSkills[index] })
          .where(eq(skills.id, skill.id));
      }

      const stagedBlocks = temporarySortOrders(storedBlocks);
      for (const [index, block] of storedBlocks.entries()) {
        await tx
          .update(lessonContentBlocks)
          .set({ sortOrder: stagedBlocks[index] })
          .where(eq(lessonContentBlocks.id, block.id));
      }

      await tx.update(tracks).set({ isPublished: false });
      await tx.update(units).set({ isPublished: false });
      await tx.update(lessons).set({ isPublished: false });
      await tx.update(skills).set({ isPublished: false });
      await tx.update(lessonContentBlocks).set({ isPublished: false });

      for (const track of plan.tracks) {
        const trackValues = {
          id: track.id,
          slug: track.slug,
          curriculumLevel: track.curriculumLevel,
          title: track.title,
          description: track.description,
          sortOrder: track.sortOrder,
          isPublished: true,
        };

        await tx.insert(tracks).values(trackValues).onDuplicateKeyUpdate({ set: trackValues });

        for (const unit of track.units) {
          const unitValues = {
            id: unit.id,
            trackId: track.id,
            slug: unit.slug,
            title: unit.title,
            description: unit.description,
            sortOrder: unit.sortOrder,
            isFoundationUnit: unit.isFoundationUnit,
            isPublished: true,
          };

          await tx.insert(units).values(unitValues).onDuplicateKeyUpdate({ set: unitValues });

          let mappingOrder = 0;
          for (const lesson of unit.lessons) {
            const lessonValues = {
              id: lesson.id,
              unitId: unit.id,
              slug: lesson.slug,
              title: lesson.title,
              learningObjective: lesson.learningObjective,
              sortOrder: lesson.sortOrder,
              estimatedMinutes: lesson.estimatedMinutes,
              isPublished: true,
            };

            await tx
              .insert(lessons)
              .values(lessonValues)
              .onDuplicateKeyUpdate({ set: lessonValues });

            for (const block of lesson.contentBlocks) {
              const blockValues = {
                id: block.id,
                lessonId: lesson.id,
                blockType: block.blockType,
                content: block.content!,
                sortOrder: block.sortOrder,
                isPublished: true,
              };

              await tx
                .insert(lessonContentBlocks)
                .values(blockValues)
                .onDuplicateKeyUpdate({ set: blockValues });
            }

            for (const skill of lesson.skills) {
              const skillValues = {
                id: skill.id,
                lessonId: lesson.id,
                code: skill.code,
                slug: skill.slug,
                curriculumLevel: skill.curriculumLevel,
                title: skill.title,
                description: skill.description,
                skillType: skill.skillType,
                supportsFlashcards: skill.supportsFlashcards,
                supportsPracticeObjective: skill.supportsPracticeObjective,
                supportsPracticeFreeResponse: skill.supportsPracticeFreeResponse,
                prerequisiteSkillCodes: skill.prerequisiteSkillCodes,
                sortOrder: skill.sortOrder,
                isPublished: true,
              };

              await tx
                .insert(skills)
                .values(skillValues)
                .onDuplicateKeyUpdate({ set: skillValues });

              mappingOrder += 1;
              const mappingValues = {
                id: stableMappingId(unit.id, lesson.id, skill.id),
                unitId: unit.id,
                lessonId: lesson.id,
                skillId: skill.id,
                isPrimary: true,
                sortOrder: mappingOrder,
              };

              await tx
                .insert(unitSkillMappings)
                .values(mappingValues)
                .onDuplicateKeyUpdate({ set: mappingValues });
            }

            for (const question of lesson.postStudyQuestions ?? []) {
              const skillId = lesson.skills.find((skill) => skill.code === question.skillCode)?.id;
              if (!skillId) throw new Error(`Question ${question.id} has no published skill.`);

              const sourceProvider = (question.sourceRefs[0] as { provider: string }).provider;
              const questionValues = {
                id: question.id,
                lessonId: lesson.id,
                skillId,
                difficultyLevel: question.difficultyLevel,
                questionType: question.questionType,
                promptPayload: question.promptPayload,
                expectedAnswerPayload: question.expectedAnswer,
                explanationText: question.explanation,
                sourceProvider,
                sourceRefPayload: question.sourceRefs,
              };

              await tx
                .insert(lessonPostStudyQuestions)
                .values(questionValues)
                .onDuplicateKeyUpdate({ set: questionValues });
            }
          }
        }
      }

      const activeTracks = await tx
        .select({ id: tracks.id })
        .from(tracks)
        .where(eq(tracks.isPublished, true));
      if (activeTracks.length !== plan.counts.tracks)
        throw new Error('Syllabus import track count mismatch.');
    });
  }
}

function assertIdentity(storedId: string | undefined, incomingId: string, label: string): void {
  if (storedId && storedId !== incomingId)
    throw new Error(`Stable syllabus ID mismatch for ${label}.`);
}
