import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { getDatabase } from '@/backend/shared/infrastructure/database/connection';
import { LearnerProfile } from '@/backend/users/domain/entities/learner-profile';
import type {
  LearnerProfileInput,
  LearnerProfileRepository,
} from '@/backend/users/domain/repositories/learner-profile.repository';
import { learnerProfiles } from '@/backend/users/infrastructure/database/schema';

function toLearnerProfile(row: typeof learnerProfiles.$inferSelect): LearnerProfile {
  return new LearnerProfile({
    id: row.id,
    userId: row.userId,
    currentLevel: row.currentLevel,
    targetLevel: row.targetLevel,
    dailyGoalMinutes: row.dailyGoalMinutes,
    preferredScript: row.preferredScript as 'ROMAJI' | 'KANA' | 'MIXED',
    weakSkillFocuses: row.weakSkillFocuses as string[],
    knownSkillClaims: row.knownSkillClaims as string[],
    onboardingCompleted: row.onboardingCompleted,
    onboardingCompletedAt: row.onboardingCompletedAt,
  });
}

export class DrizzleLearnerProfileRepository implements LearnerProfileRepository {
  async findProfile(userId: string): Promise<LearnerProfile | null> {
    const [row] = await getDatabase()
      .select()
      .from(learnerProfiles)
      .where(eq(learnerProfiles.userId, userId))
      .limit(1);

    return row ? toLearnerProfile(row) : null;
  }

  async confirm(input: LearnerProfileInput): Promise<LearnerProfile> {
    const completedAt = new Date();
    const values = {
      id: randomUUID(),
      userId: input.userId,
      currentLevel: input.currentLevel,
      targetLevel: input.targetLevel,
      dailyGoalMinutes: input.dailyGoalMinutes,
      preferredScript: input.preferredScript,
      weakSkillFocuses: input.weakSkillFocuses,
      knownSkillClaims: input.knownSkillClaims,
      onboardingCompleted: true,
      onboardingCompletedAt: completedAt,
    };

    return getDatabase().transaction(async (transaction) => {
      await transaction
        .insert(learnerProfiles)
        .values(values)
        .onDuplicateKeyUpdate({
          set: {
            currentLevel: values.currentLevel,
            targetLevel: values.targetLevel,
            dailyGoalMinutes: values.dailyGoalMinutes,
            preferredScript: values.preferredScript,
            weakSkillFocuses: values.weakSkillFocuses,
            knownSkillClaims: values.knownSkillClaims,
            onboardingCompleted: true,
            onboardingCompletedAt: sql`coalesce(${learnerProfiles.onboardingCompletedAt}, ${completedAt})`,
          },
        });

      const [row] = await transaction
        .select()
        .from(learnerProfiles)
        .where(eq(learnerProfiles.userId, input.userId))
        .limit(1);
      if (!row) throw new Error('Confirmed learner profile could not be read.');

      return toLearnerProfile(row);
    });
  }
}

export const learnerProfileRepository = new DrizzleLearnerProfileRepository();
