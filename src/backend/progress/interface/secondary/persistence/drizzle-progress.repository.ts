import { randomUUID } from 'node:crypto';
import { and, desc, eq, sql } from 'drizzle-orm';
import type {
  DifficultyBand,
  LessonUnderstandingSnapshot,
  MasteryState,
  ProgressEventSnapshot,
  ProgressReadState,
  ProgressRepository,
  ProgressSourceType,
  ProgressWriteTransaction,
  SkillMasterySnapshot,
} from '@/backend/progress/domain/repositories/progress.repository';
import {
  lessonUnderstandingSnapshots,
  progressEvents,
  skillMasterySnapshots,
} from '@/backend/progress/infrastructure/database/schema';
import { getDatabase } from '@/backend/shared/infrastructure/database/connection';

type Database = ReturnType<typeof getDatabase>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

function eventSnapshot(row: typeof progressEvents.$inferSelect): ProgressEventSnapshot {
  return {
    ...row,
    sourceType: row.sourceType as ProgressSourceType,
    answeredAt: row.answeredAt.toISOString(),
  };
}

function masterySnapshot(row: typeof skillMasterySnapshots.$inferSelect): SkillMasterySnapshot {
  return {
    ...row,
    masteryState: row.masteryState as MasteryState,
    recommendedDifficultyBand: row.recommendedDifficultyBand as DifficultyBand,
    lastActivityAt: row.lastActivityAt?.toISOString() ?? null,
  };
}

function lessonSnapshot(
  row: typeof lessonUnderstandingSnapshots.$inferSelect,
): LessonUnderstandingSnapshot {
  return {
    userId: row.userId,
    lessonId: row.lessonId,
    lastProgressEventId: row.lastProgressEventId,
    lastQuestionId: row.lastQuestionId,
    currentUnderstandingLevel: row.currentUnderstandingLevel,
    lastAttemptedDifficultyLevel: row.lastAttemptedDifficultyLevel,
    lastCorrectDifficultyLevel: row.lastCorrectDifficultyLevel,
    totalCorrectCount: row.totalCorrectCount,
    totalAttemptCount: row.totalAttemptCount,
    lastAttemptedAt: row.lastAttemptedAt?.toISOString() ?? null,
    lastCorrectAt: row.lastCorrectAt?.toISOString() ?? null,
  };
}

class DrizzleProgressWriteTransaction implements ProgressWriteTransaction {
  constructor(
    private readonly transaction: Transaction,
    private readonly current: SkillMasterySnapshot,
  ) {}

  async findEvent(eventId: string) {
    const [row] = await this.transaction
      .select()
      .from(progressEvents)
      .where(eq(progressEvents.id, eventId))
      .limit(1);
    return row ? eventSnapshot(row) : null;
  }

  async getSkillHistory(userId: string, skillId: string) {
    return (
      await this.transaction
        .select()
        .from(progressEvents)
        .where(and(eq(progressEvents.userId, userId), eq(progressEvents.skillId, skillId)))
        .orderBy(desc(progressEvents.answeredAt), desc(progressEvents.id))
    ).map(eventSnapshot);
  }

  async getMastery() {
    return this.current;
  }

  async lockLesson(userId: string, lessonId: string) {
    await this.transaction
      .insert(lessonUnderstandingSnapshots)
      .values({ id: randomUUID(), userId, lessonId })
      .onDuplicateKeyUpdate({ set: { id: sql`${lessonUnderstandingSnapshots.id}` } });

    const [row] = await this.transaction
      .select()
      .from(lessonUnderstandingSnapshots)
      .where(
        and(
          eq(lessonUnderstandingSnapshots.userId, userId),
          eq(lessonUnderstandingSnapshots.lessonId, lessonId),
        ),
      )
      .limit(1)
      .for('update');
    if (!row) throw new Error('Lesson snapshot lock could not be acquired.');

    return lessonSnapshot(row);
  }

  async insertEvent(event: ProgressEventSnapshot) {
    await this.transaction
      .insert(progressEvents)
      .values({ ...event, answeredAt: new Date(event.answeredAt) });
  }

  async saveMastery(snapshot: SkillMasterySnapshot) {
    await this.transaction
      .update(skillMasterySnapshots)
      .set({
        ...snapshot,
        lastActivityAt: snapshot.lastActivityAt ? new Date(snapshot.lastActivityAt) : null,
      })
      .where(
        and(
          eq(skillMasterySnapshots.userId, snapshot.userId),
          eq(skillMasterySnapshots.skillId, snapshot.skillId),
        ),
      );
  }

  async saveLesson(snapshot: LessonUnderstandingSnapshot) {
    await this.transaction
      .update(lessonUnderstandingSnapshots)
      .set({
        ...snapshot,
        lastAttemptedAt: snapshot.lastAttemptedAt ? new Date(snapshot.lastAttemptedAt) : null,
        lastCorrectAt: snapshot.lastCorrectAt ? new Date(snapshot.lastCorrectAt) : null,
      })
      .where(
        and(
          eq(lessonUnderstandingSnapshots.userId, snapshot.userId),
          eq(lessonUnderstandingSnapshots.lessonId, snapshot.lessonId),
        ),
      );
  }
}

export class DrizzleProgressRepository implements ProgressRepository {
  constructor(private readonly database: () => Database = getDatabase) {}

  async findEvent(userId: string, eventId: string): Promise<ProgressEventSnapshot | null> {
    const [row] = await this.database()
      .select()
      .from(progressEvents)
      .where(and(eq(progressEvents.userId, userId), eq(progressEvents.id, eventId)))
      .limit(1);
    return row ? eventSnapshot(row) : null;
  }

  async withSkillLock<T>(
    userId: string,
    skillId: string,
    work: (transaction: ProgressWriteTransaction) => Promise<T>,
  ): Promise<T> {
    return this.database().transaction(async (transaction) => {
      // The unique snapshot row also serializes the first-ever attempt for this user and skill.
      await transaction
        .insert(skillMasterySnapshots)
        .values({
          id: randomUUID(),
          userId,
          skillId,
          masteryScore: 0,
          accuracyScore: 0,
          recencyScore: 0,
          confidenceScore: 0,
          attemptsWindowSize: 0,
          correctAttemptsCount: 0,
          masteryState: 'WEAK',
          recommendedDifficultyBand: 'STANDARD',
        })
        .onDuplicateKeyUpdate({ set: { id: sql`${skillMasterySnapshots.id}` } });

      const [row] = await transaction
        .select()
        .from(skillMasterySnapshots)
        .where(
          and(eq(skillMasterySnapshots.userId, userId), eq(skillMasterySnapshots.skillId, skillId)),
        )
        .limit(1)
        .for('update');
      if (!row) throw new Error('Mastery snapshot lock could not be acquired.');

      return work(new DrizzleProgressWriteTransaction(transaction, masterySnapshot(row)));
    });
  }

  async readState(userId: string): Promise<ProgressReadState> {
    return this.database().transaction(
      async (transaction) => {
        const events = await transaction
          .select()
          .from(progressEvents)
          .where(eq(progressEvents.userId, userId));
        const skills = await transaction
          .select()
          .from(skillMasterySnapshots)
          .where(eq(skillMasterySnapshots.userId, userId));
        const lessons = await transaction
          .select()
          .from(lessonUnderstandingSnapshots)
          .where(eq(lessonUnderstandingSnapshots.userId, userId));

        return {
          events: events.map(eventSnapshot),
          skills: skills.map(masterySnapshot),
          lessons: lessons.map(lessonSnapshot),
        };
      },
      { isolationLevel: 'repeatable read', withConsistentSnapshot: true },
    );
  }

  async findLesson(userId: string, lessonId: string) {
    const [row] = await this.database()
      .select()
      .from(lessonUnderstandingSnapshots)
      .where(
        and(
          eq(lessonUnderstandingSnapshots.userId, userId),
          eq(lessonUnderstandingSnapshots.lessonId, lessonId),
        ),
      )
      .limit(1);

    return row ? lessonSnapshot(row) : null;
  }
}

export const progressRepository = new DrizzleProgressRepository();
