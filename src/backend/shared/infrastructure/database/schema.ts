// The migration registry only imports table definitions; importing it never opens a connection.
export { aiRequestLogs, aiRequestAttempts } from './ai-schema';
export { accounts, sessions } from '@/backend/auth/infrastructure/database/schema';
export {
  learnerProfiles,
  users,
  userPreferences,
} from '@/backend/users/infrastructure/database/schema';
export {
  progressEvents,
  skillMasterySnapshots,
  lessonUnderstandingSnapshots,
} from '@/backend/progress/infrastructure/database/schema';
export {
  trackTranslations,
  unitTranslations,
  lessonTranslations,
  skillTranslations,
  lessonContentBlockTranslations,
  lessonPostStudyQuestionTranslations,
  lessonContentBlocks,
  lessonPostStudyQuestions,
  lessons,
  skills,
  tracks,
  units,
  unitSkillMappings,
} from '@/backend/syllabus/infrastructure/database/schema';
export {
  flashcardDecks,
  flashcardItems,
  flashcardDeckItems,
  flashcardSessions,
  flashcardSessionAnswers,
  flashcardItemStates,
} from '@/backend/flashcards/infrastructure/database/schema';
export {
  practiceSessions,
  practiceQuestions,
  practiceAnswers,
  practicePostStudyReceipts,
  practicePostStudyDeliveries,
} from '@/backend/practice/infrastructure/database/schema';
