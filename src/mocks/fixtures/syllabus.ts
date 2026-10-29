import type {
  SyllabusTrack,
  SyllabusUnit,
  SyllabusLesson,
  LessonQuiz,
} from '@/frontend/syllabus/interfaces/entities';

const id = (n: number) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const track = {
  id: id(1),
  slug: 'jlpt-n5-foundation',
  curriculumLevel: 'N5',
  title: 'JLPT N5 Foundation',
};

const unitParent = { id: id(2), slug: 'n5-kana-basics', title: 'Kana Basics', sortOrder: 1 };

const skill = {
  id: id(4),
  code: 'hiragana_a_row',
  slug: 'hiragana-a-row',
  curriculumLevel: 'N5',
  title: 'Hiragana A Row',
  description: 'Read the five basic hiragana vowel sounds.',
  skillType: 'KANA' as const,
  supportsFlashcards: true,
  supportsPracticeObjective: true,
  supportsPracticeFreeResponse: false,
  prerequisiteSkillCodes: [],
};

const lessonSummary = {
  id: id(3),
  slug: 'hiragana-row-a',
  title: 'Hiragana Row A',
  learningObjective: 'Recognize and read the first hiragana row.',
  sortOrder: 1,
  estimatedMinutes: 10,
  skills: [skill],
};

export function syllabusTracksFixture(): SyllabusTrack[] {
  return [
    {
      ...track,
      description: 'Learn the core beginner patterns.',
      sortOrder: 1,
      unitCount: 1,
      foundationUnitSlug: unitParent.slug,
      units: [
        {
          ...unitParent,
          description: 'Learn the first hiragana sounds.',
          isFoundationUnit: true,
          lessonCount: 1,
        },
      ],
    },
  ];
}

export function syllabusUnitFixture(): SyllabusUnit {
  return {
    ...unitParent,
    description: 'Learn the first hiragana sounds.',
    isFoundationUnit: true,
    track,
    lessons: [lessonSummary],
    unitSkills: [
      { skillCode: skill.code, lessonSlug: lessonSummary.slug, isPrimary: true, sortOrder: 1 },
    ],
  };
}

export function syllabusLessonFixture(): SyllabusLesson {
  return {
    ...lessonSummary,
    track,
    unit: unitParent,
    contentBlocks: [
      {
        id: id(5),
        blockType: 'PARAGRAPH',
        sortOrder: 1,
        content: {
          title: 'The five vowel sounds',
          body: '<p>The first row introduces <span class="text-emphasis">あ い う え お</span>. Read each sound before moving to the example.</p>',
        },
      },
      {
        id: id(6),
        blockType: 'EXAMPLE_SENTENCE',
        sortOrder: 2,
        content: {
          japaneseSentence: '<p>あさです。</p>',
          englishTranslation: '<p>It is morning.</p>',
        },
      },
    ],
    postStudyQuiz: {
      isRequired: true,
      practiceMode: 'DIRECT_LESSON_POST_STUDY',
      deliveryMode: 'DETERMINISTIC_CURATED',
      questionType: 'SHORT_FREE_RESPONSE',
      questionCountPerAttempt: 1,
      bankQuestionCount: 10,
      difficultyLevelStart: 1,
      difficultyLevelEnd: 10,
      initialUnderstandingLevel: 0,
      maxUnderstandingLevel: 10,
    },
  };
}

export function lessonQuizFixture(patch: Partial<LessonQuiz> = {}): LessonQuiz {
  return {
    lessonSlug: lessonSummary.slug,
    currentUnderstandingLevel: 0,
    targetUnderstandingLevel: 1,
    targetDifficultyLevel: 1,
    isReview: false,
    question: {
      id: id(7),
      skillCode: skill.code,
      questionType: 'SHORT_FREE_RESPONSE',
      gradingStrategy: 'DETERMINISTIC',
      difficultyLevel: 1,
      promptPayload: {
        schemaVersion: 1,
        promptLanguage: 'JA',
        answerLanguage: 'JA',
        slotCount: 1,
        sentenceTemplate: '___さ です。',
        sentenceTemplateHtml: '<p>___さ です。</p>',
        blankInputMode: 'ROMAJI_TO_KANA',
        placeholder: 'Answer here',
        inputMethod: { acceptsRomaji: true, transformsTo: 'KANA' },
      },
    },
    ...patch,
  };
}
