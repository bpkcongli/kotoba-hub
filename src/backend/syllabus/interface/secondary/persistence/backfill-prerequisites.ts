import type { MySqlTable } from 'drizzle-orm/mysql-core';
import type { getDatabase } from '@/backend/shared/infrastructure/database/connection';
import {
  requireSeed,
  validatePrerequisites,
} from '@/backend/syllabus/application/helpers/bilingual-seed-validation';
import type { BilingualSeedSkill } from '@/backend/syllabus/application/services/prepare-bilingual-seed.service';
import type { SyllabusTrackSnapshot } from '@/backend/syllabus/domain/repositories/syllabus-catalog.repository';
import * as s from '@/backend/syllabus/infrastructure/database/schema';

type Database = ReturnType<typeof getDatabase>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export async function backfillPrerequisites(
  tx: Transaction,
  incoming: BilingualSeedSkill[],
  source: SyllabusTrackSnapshot[],
) {
  const existing = await tx.select().from(s.skills);
  const catalog = new Map(existing.map((row) => [row.code, row]));
  const incomingCodes = new Set(incoming.map((row) => row.code));
  const sourceOwners = new Map(
    source.flatMap((track) =>
      track.units.flatMap((unit) =>
        unit.lessons.flatMap((lesson) =>
          lesson.skills.map((skill) => [skill.code, { track, unit, lesson, skill }] as const),
        ),
      ),
    ),
  );
  const visited = new Set<string>();
  const inserted: string[] = [];

  async function ensureParent(table: MySqlTable, values: Record<string, unknown>) {
    const rows = await tx.select().from(table);
    const previous = rows.find((row) => row.id === values.id);

    requireSeed(
      !rows.some((row) => row.id !== values.id && row.slug === values.slug),
      `Prerequisite parent identity conflict ${values.slug}.`,
    );

    if (previous) {
      const row = previous as unknown as Record<string, unknown>;

      requireSeed(
        ['slug', 'trackId', 'unitId'].every((key) => !(key in values) || row[key] === values[key]),
        `Prerequisite parent conflict ${values.id}.`,
      );
    } else {
      await tx.insert(table).values({ ...values, isPublished: false });
    }
  }

  async function visit(code: string): Promise<void> {
    if (visited.has(code) || incomingCodes.has(code)) return;

    visited.add(code);

    let current = catalog.get(code);

    if (!current) {
      const owner = sourceOwners.get(code);
      requireSeed(owner?.skill.isPublished, `Unavailable prerequisite ${code}.`);

      const { track, unit, lesson, skill } = owner;

      requireSeed(
        !existing.some((row) => row.id === skill.id || row.slug === skill.slug),
        `Prerequisite skill identity conflict ${code}.`,
      );

      await ensureParent(s.tracks, {
        id: track.id,
        slug: track.slug,
        title: track.title,
        description: track.description,
        curriculumLevel: track.curriculumLevel,
        sortOrder: track.sortOrder,
      });
      await ensureParent(s.units, {
        id: unit.id,
        trackId: track.id,
        slug: unit.slug,
        title: unit.title,
        description: unit.description,
        sortOrder: unit.sortOrder,
        isFoundationUnit: unit.isFoundationUnit,
      });
      await ensureParent(s.lessons, {
        id: lesson.id,
        unitId: unit.id,
        slug: lesson.slug,
        title: lesson.title,
        learningObjective: lesson.learningObjective,
        estimatedMinutes: lesson.estimatedMinutes,
        sortOrder: lesson.sortOrder,
      });

      const { localizations, localization, contentRevision, seedSchemaVersion, ...values } = skill;

      void localizations;
      void localization;
      void contentRevision;
      void seedSchemaVersion;

      await tx
        .insert(s.skills)
        .values({ ...values, lessonId: lesson.id, seedSchemaVersion: '1.0.0', contentRevision: 1 });

      const rows = await tx.select().from(s.skills);
      current = rows.find((row) => row.code === code)!;
      catalog.set(code, current);
      inserted.push(code);
    }

    requireSeed(current.isPublished, `Unavailable prerequisite ${code}.`);

    for (const prerequisite of (current.prerequisiteSkillCodes as string[] | null) ?? [])
      await visit(prerequisite);
  }

  for (const skill of incoming.filter((row) => row.isPublished))
    for (const code of skill.prerequisiteSkillCodes) await visit(code);

  validatePrerequisites(
    incoming,
    [...catalog.values()].map((row) => ({
      ...row,
      prerequisiteSkillCodes: (row.prerequisiteSkillCodes as string[] | null) ?? [],
    })),
  );

  return inserted;
}
