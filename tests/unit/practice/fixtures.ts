import type { GeneratedPracticeSession } from '@/backend/shared/application/services/responses/ai-response';
import type { CanonicalPostStudyQuestion } from '@/backend/syllabus/domain/value-objects/post-study-question-bank';

export const ids = {
  user: '10000000-0000-4000-8000-000000000001',
  otherUser: '10000000-0000-4000-8000-000000000002',
  skill: '20000000-0000-4000-8000-000000000001',
  lesson: '30000000-0000-4000-8000-000000000001',
  unit: '40000000-0000-4000-8000-000000000001',
  track: '50000000-0000-4000-8000-000000000001',
  session: '60000000-0000-4000-8000-000000000001',
  question: '70000000-0000-4000-8000-000000000001',
};

export const skillCode = 'n5_particles_wa';
export const lessonSlug = 'topic-particle';

export const shortQuestion: GeneratedPracticeSession['questions'][number] = {
  skillCode,
  questionType: 'SHORT_FREE_RESPONSE',
  gradingStrategy: 'DETERMINISTIC',
  difficultyBand: 'STANDARD',
  promptPayload: {
    schemaVersion: 1,
    promptLanguage: 'JA',
    answerLanguage: 'JA',
    slotCount: 1,
    sentenceTemplate: 'わたし___がくせいです。',
    blankInputMode: 'ROMAJI_TO_KANA',
    inputMethod: { acceptsRomaji: true, transformsTo: 'KANA' },
  },
  expectedAnswer: { acceptedTextAnswers: ['は'] },
};

export const freeQuestion: GeneratedPracticeSession['questions'][number] = {
  skillCode,
  questionType: 'FREE_RESPONSE',
  gradingStrategy: 'AI',
  difficultyBand: 'STANDARD',
  promptPayload: {
    schemaVersion: 1,
    promptLanguage: 'EN',
    answerLanguage: 'JA',
    sourceSentence: 'I am a student.',
    inputMethod: { acceptsRomaji: true, transformsTo: 'KANA' },
  },
  expectedAnswer: { referenceAnswer: 'わたしはがくせいです。' },
};

export function canonicalQuestion(difficultyLevel = 1): CanonicalPostStudyQuestion {
  return {
    id: `70000000-0000-4000-8000-${String(difficultyLevel).padStart(12, '0')}`,
    skillCode,
    difficultyLevel,
    questionType: 'SHORT_FREE_RESPONSE',
    promptPayload: {
      ...shortQuestion.promptPayload,
      sentenceTemplateHtml: '<p>わたし<span class="question-blank">___</span>がくせいです。</p>',
    },
    expectedAnswer: { acceptedTextAnswers: ['は'], normalizationProfile: 'kana-strict-v1' },
    explanation: 'は marks the topic of the sentence.',
    sourceRefs: [],
  };
}
