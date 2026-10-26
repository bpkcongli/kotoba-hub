import type { LessonNextResult } from '@/backend/practice/application/services/practice.service';
import type {
  AnswerResult,
  Grade,
  LessonAnswerResult,
  PracticeQuestion,
  PracticeSession,
  ProgressImpact,
} from '@/backend/practice/domain/repositories/practice.repository';

function prompt(question: Pick<PracticeQuestion, 'questionType' | 'promptPayload'>) {
  const p = question.promptPayload;

  if (question.questionType === 'SHORT_FREE_RESPONSE')
    return {
      schemaVersion: p.schemaVersion,
      promptLanguage: p.promptLanguage,
      answerLanguage: p.answerLanguage,
      slotCount: p.slotCount,
      sentenceTemplate: p.sentenceTemplate,
      sentenceTemplateHtml: p.sentenceTemplateHtml,
      blankInputMode: p.blankInputMode,
      ...(p.placeholder !== undefined ? { placeholder: p.placeholder } : {}),
      inputMethod: { acceptsRomaji: true, transformsTo: 'KANA' },
    };

  if (question.questionType === 'SLOT_FILL')
    return {
      schemaVersion: p.schemaVersion,
      promptLanguage: p.promptLanguage,
      optionLanguage: p.optionLanguage,
      slotCount: p.slotCount,
      sentenceTemplate: p.sentenceTemplate,
      options: (p.options as { id: string; label: string }[]).map((o) => ({
        id: o.id,
        label: o.label,
      })),
    };

  if (question.questionType === 'ARRANGE_TOKEN')
    return {
      schemaVersion: p.schemaVersion,
      promptLanguage: p.promptLanguage,
      answerLanguage: p.answerLanguage,
      direction: p.direction,
      sourceSentence: p.sourceSentence,
      arrangeTokens: (p.arrangeTokens as { id: string; label: string }[]).map((o) => ({
        id: o.id,
        label: o.label,
      })),
    };

  return {
    schemaVersion: p.schemaVersion,
    promptLanguage: p.promptLanguage,
    answerLanguage: p.answerLanguage,
    sourceSentence: p.sourceSentence,
    inputMethod: { acceptsRomaji: true, transformsTo: 'KANA' },
  };
}

function progress(p: ProgressImpact | null) {
  return p
    ? {
        progressEventId: p.progressEventId,
        skillCode: p.skillCode,
        masteryScore: p.masteryScore,
        masteryState: p.masteryState,
        recommendedDifficultyBand: p.recommendedDifficultyBand,
      }
    : null;
}

function grade(g: Grade) {
  return {
    isCorrect: g.isCorrect,
    numericScore: g.numericScore,
    feedbackText: g.feedbackText,
    gradingSource: g.gradingSource,
  };
}

export function toPracticeSessionDto(s: PracticeSession) {
  return {
    id: s.id,
    status: s.status,
    difficultyBand: s.difficultyBand,
    questionMix: {
      WEAK: s.questionMix.WEAK,
      REINFORCEMENT: s.questionMix.REINFORCEMENT,
      STRETCH: s.questionMix.STRETCH,
    },
    totalQuestions: s.questions.length,
    answeredQuestionsCount: s.answeredQuestionsCount,
    startedAt: s.startedAt,
    questions: s.questions.map((q) => ({
      id: q.id,
      skillCode: q.skillCode,
      questionType: q.questionType,
      gradingStrategy: q.gradingStrategy,
      difficultyBand: q.difficultyBand,
      promptPayload: prompt(q),
      sortOrder: q.sortOrder,
    })),
  };
}

export function toPracticeAnswerDto(a: AnswerResult) {
  return {
    ...grade(a),
    sessionId: a.sessionId,
    questionId: a.questionId,
    answerId: a.answerId,
    gradingMetadata: {
      gradingStrategy: a.gradingMetadata.gradingStrategy,
      ...(a.gradingSource === 'RULE_ENGINE'
        ? { matchedAnswerKeys: a.gradingMetadata.matchedAnswerKeys, accepted: a.isCorrect }
        : {}),
    },
    sessionProgress: {
      answeredQuestionsCount: a.sessionProgress.answeredQuestionsCount,
      totalQuestions: a.sessionProgress.totalQuestions,
      isCompleted: a.sessionProgress.isCompleted,
    },
    nextQuestionId: a.nextQuestionId,
    progressImpact: progress(a.progressImpact),
  };
}

export function toLessonNextDto(n: LessonNextResult) {
  return {
    lessonSlug: n.lessonSlug,
    currentUnderstandingLevel: n.currentUnderstandingLevel,
    targetUnderstandingLevel: n.targetUnderstandingLevel,
    targetDifficultyLevel: n.targetDifficultyLevel,
    isReview: n.isReview,
    question: {
      id: n.question.id,
      skillCode: n.question.skillCode,
      questionType: n.question.questionType,
      gradingStrategy: n.question.gradingStrategy,
      difficultyLevel: n.question.difficultyLevel,
      promptPayload: prompt(n.question),
    },
  };
}

export function toLessonAnswerDto(a: LessonAnswerResult) {
  const u = a.understandingProgress;

  return {
    lessonSlug: a.lessonSlug,
    questionId: a.questionId,
    isCorrect: a.isCorrect,
    numericScore: a.numericScore,
    feedbackText: a.feedbackText,
    gradingSource: a.gradingSource,
    understandingProgress: {
      currentUnderstandingLevelBefore: u.currentUnderstandingLevelBefore,
      currentUnderstandingLevelAfter: u.currentUnderstandingLevelAfter,
      targetDifficultyLevel: u.targetDifficultyLevel,
      maxUnderstandingLevel: u.maxUnderstandingLevel,
      postStudyQuizCompleted: u.postStudyQuizCompleted,
      nextReviewDifficultyLevel: u.nextReviewDifficultyLevel,
    },
    progressImpact: progress(a.progressImpact),
  };
}

export type PracticeSessionResponseDto = ReturnType<typeof toPracticeSessionDto>;
export type PracticeAnswerResponseDto = ReturnType<typeof toPracticeAnswerDto>;
export type LessonPostStudyNextResponseDto = ReturnType<typeof toLessonNextDto>;
export type LessonPostStudyAnswerResponseDto = ReturnType<typeof toLessonAnswerDto>;
