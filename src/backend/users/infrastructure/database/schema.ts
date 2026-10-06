import {
  boolean,
  char,
  int,
  json,
  mysqlTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

export const users = mysqlTable(
  'users',
  {
    id: char('id', { length: 36 }).primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    avatarUrl: varchar('avatar_url', { length: 512 }),
    emailVerified: boolean('email_verified').notNull().default(false),
    lastLoginAt: timestamp('last_login_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [uniqueIndex('users_email_uk').on(table.email)],
);

export const learnerProfiles = mysqlTable(
  'learner_profiles',
  {
    id: char('id', { length: 36 }).primaryKey(),
    userId: char('user_id', { length: 36 })
      .notNull()
      .references(() => users.id),
    currentLevel: varchar('current_level', { length: 50 }),
    targetLevel: varchar('target_level', { length: 50 }).notNull(),
    dailyGoalMinutes: int('daily_goal_minutes').notNull(),
    preferredScript: varchar('preferred_script', { length: 50 }).notNull(),
    weakSkillFocuses: json('weak_skill_focuses').notNull(),
    knownSkillClaims: json('known_skill_claims').notNull(),
    onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
    onboardingCompletedAt: timestamp('onboarding_completed_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  },
  (table) => [uniqueIndex('learner_profiles_user_id_uk').on(table.userId)],
);
