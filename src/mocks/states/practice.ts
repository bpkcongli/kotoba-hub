import type {
  LessonQuiz,
  LessonQuizResult,
  PracticeAnswerResult,
  PracticeQuestion,
  PracticeSession,
} from '@/frontend/practice/interfaces/entities';
import type {
  GeneratePracticeRequest,
  LessonAnswerRequest,
  PracticeAnswerRequest,
  PracticeUserAnswer,
} from '@/frontend/practice/interfaces/requests';
import { practiceSessionFixture } from '@/mocks/fixtures/practice';
import { lessonQuizFixture, syllabusLessonFixture } from '@/mocks/fixtures/syllabus';
import { recordMockProgress, setMockProgressUnderstanding } from './progress';
import { registerMockStateReset } from './reset';

interface Failure {
  code: number;
  message: string;
  httpStatus: number;
}

type Result<T> = { result: T } | Failure;

interface MockSession {
  ownerId: string;
  session: PracticeSession;
  answers: Map<string, { fingerprint: string; result: PracticeAnswerResult }>;
}

const sessions = new Map<string, MockSession>();
const understanding = new Map<string, number>();
const receipts = new Map<string, { fingerprint: string; result: LessonQuizResult }>();
const failure = (message: string): Failure => ({ code: 142206002, message, httpStatus: 422 });
const snapshotKey = (ownerId: string, slug: string) => JSON.stringify([ownerId, slug]);

const fingerprint = (payload: PracticeAnswerRequest | LessonAnswerRequest) =>
  JSON.stringify({
    ...payload,
    userAnswer: Object.entries(payload.userAnswer).sort(([a], [b]) => a.localeCompare(b)),
  });

const normalize = (text: string) => text.normalize('NFKC').trim();

function correct(question: PracticeQuestion, answer: PracticeUserAnswer): boolean {
  switch (question.questionType) {
    case 'SLOT_FILL':
      return 'selectedOptionId' in answer && answer.selectedOptionId === 'a';

    case 'ARRANGE_TOKEN':
      return (
        'arrangedTokenIds' in answer &&
        JSON.stringify(answer.arrangedTokenIds) === JSON.stringify(['t1', 't2', 't3', 't4'])
      );

    case 'SHORT_FREE_RESPONSE':
      return (
        'normalizedKana' in answer &&
        [answer.normalizedKana, answer.normalizedKanji ?? ''].some((a) => normalize(a) === 'は')
      );

    case 'FREE_RESPONSE':
      return (
        'normalizedKana' in answer &&
        [answer.normalizedKana, answer.normalizedKanji ?? ''].some((a) =>
          ['わたしはがくせいです。', '私は学生です。'].includes(normalize(a)),
        )
      );
  }
}

function impact(
  skillCode: string,
  isCorrect: boolean,
): NonNullable<PracticeAnswerResult['progressImpact']> {
  return {
    progressEventId: crypto.randomUUID(),
    skillCode,
    masteryScore: isCorrect ? 58.4 : 12.5,
    masteryState: isCorrect ? 'DEVELOPING' : 'WEAK',
    recommendedDifficultyBand: 'STANDARD',
  };
}

export function createMockPracticeSession(
  ownerId: string,
  config: GeneratePracticeRequest,
): PracticeSession {
  const session = practiceSessionFixture({
    questionCount: config.questionCount,
    id: crypto.randomUUID(),
  });

  sessions.set(session.id, { ownerId, session, answers: new Map() });

  return structuredClone(session);
}

export function answerMockPracticeSession(
  ownerId: string,
  sessionId: string,
  payload: PracticeAnswerRequest,
): Result<PracticeAnswerResult> {
  const state = sessions.get(sessionId);

  if (!state || state.ownerId !== ownerId)
    return { code: 140406001, message: 'This practice session is unavailable.', httpStatus: 404 };

  const key = fingerprint(payload);
  const previous = state.answers.get(payload.questionId);

  if (previous)
    return previous.fingerprint === key
      ? { result: structuredClone(previous.result) }
      : failure('Retry your original answer.');

  const question = state.session.questions[state.session.answeredQuestionsCount];

  if (!question || question.id !== payload.questionId)
    return failure('Answer the current question first.');

  const isCorrect = correct(question, payload.userAnswer);
  const answeredQuestionsCount = state.session.answeredQuestionsCount + 1;
  const nextQuestionId = state.session.questions[answeredQuestionsCount]?.id ?? null;
  const result: PracticeAnswerResult = {
    sessionId,
    questionId: question.id,
    answerId: crypto.randomUUID(),
    isCorrect,
    numericScore: isCorrect ? 100 : 0,
    feedbackText: isCorrect
      ? 'Your answer fits this sentence.'
      : 'Review the sentence and the skill before your next practice.',
    gradingSource: question.gradingStrategy === 'AI' ? 'AI_PROVIDER' : 'RULE_ENGINE',
    gradingMetadata: {
      gradingStrategy: question.gradingStrategy,
      ...(question.gradingStrategy === 'DETERMINISTIC'
        ? { matchedAnswerKeys: [], accepted: isCorrect }
        : {}),
    },
    sessionProgress: {
      answeredQuestionsCount,
      totalQuestions: state.session.totalQuestions,
      isCompleted: nextQuestionId === null,
    },
    nextQuestionId,
    progressImpact: impact(question.skillCode, isCorrect),
  };

  state.answers.set(question.id, { fingerprint: key, result: structuredClone(result) });
  state.session.answeredQuestionsCount = answeredQuestionsCount;
  state.session.status = nextQuestionId ? 'IN_PROGRESS' : 'COMPLETED';

  const lesson = syllabusLessonFixture();
  const answeredAt = new Date().toISOString();

  recordMockProgress({
    ownerId,
    event: {
      id: result.progressImpact!.progressEventId,
      sourceType: 'PRACTICE',
      sourceSessionId: sessionId,
      sourceEntityId: result.answerId,
      questionType: question.questionType,
      skillCode: question.skillCode,
      skillTitle: 'Particles: wa, ga, and o',
      trackSlug: lesson.track.slug,
      unitSlug: lesson.unit.slug,
      lessonSlug: lesson.slug,
      isCorrect,
      numericScore: result.numericScore,
      confidenceWeight: null,
      responseTimeMs: payload.responseTimeMs,
      answeredAt,
    },
    mastery: result.progressImpact!,
    session: {
      sessionStatus: state.session.status,
      sessionTitle: 'Random practice',
      startedAt: state.session.startedAt,
      completedAt: nextQuestionId ? null : answeredAt,
    },
  });

  return { result: structuredClone(result) };
}

export function setMockLessonUnderstanding(ownerId: string, slug: string, level: number): void {
  if (!Number.isInteger(level) || level < 0 || level > 10)
    throw new Error('Understanding must be 0–10.');

  understanding.set(snapshotKey(ownerId, slug), level);
  setMockProgressUnderstanding(ownerId, slug, level);
}

export function nextMockLessonQuiz(ownerId: string, slug: string): Result<LessonQuiz> {
  const quiz = lessonQuizFixture();

  if (slug !== quiz.lessonSlug)
    return { code: 140406002, message: 'This lesson quiz is unavailable.', httpStatus: 404 };

  const current = understanding.get(snapshotKey(ownerId, slug)) ?? 0;
  const target = Math.min(current + 1, 10);

  return {
    result: {
      ...quiz,
      currentUnderstandingLevel: current,
      targetUnderstandingLevel: target,
      targetDifficultyLevel: target,
      isReview: current >= 1,
      question: {
        ...quiz.question,
        id:
          target === 1
            ? quiz.question.id
            : `10000000-0000-4000-8000-${String(6 + target).padStart(12, '0')}`,
        difficultyLevel: target,
      },
    },
  };
}

export function answerMockLessonQuiz(
  ownerId: string,
  payload: LessonAnswerRequest,
  idempotencyKey?: string,
): Result<LessonQuizResult> {
  const key = snapshotKey(ownerId, idempotencyKey ?? crypto.randomUUID());
  const print = fingerprint(payload);
  const previous = receipts.get(key);

  if (previous)
    return previous.fingerprint === print
      ? { result: structuredClone(previous.result) }
      : failure('Retry your original lesson answer.');

  const next = nextMockLessonQuiz(ownerId, payload.lessonSlug);

  if (!('result' in next)) return next;

  const quiz = next.result;

  if (payload.questionId !== quiz.question.id)
    return failure('Load the current lesson question before answering.');

  const isCorrect = [
    payload.userAnswer.normalizedKana,
    payload.userAnswer.normalizedKanji ?? '',
  ].some((a) => normalize(a) === 'あ');
  const before = quiz.currentUnderstandingLevel;
  const after = Math.min(before + Number(isCorrect), 10);
  const result: LessonQuizResult = {
    lessonSlug: payload.lessonSlug,
    questionId: payload.questionId,
    isCorrect,
    numericScore: isCorrect ? 100 : 0,
    feedbackText: isCorrect
      ? 'Correct kana completion.'
      : 'Read the lesson example again, then try another attempt.',
    gradingSource: 'RULE_ENGINE',
    understandingProgress: {
      currentUnderstandingLevelBefore: before,
      currentUnderstandingLevelAfter: after,
      targetDifficultyLevel: quiz.targetDifficultyLevel,
      maxUnderstandingLevel: 10,
      postStudyQuizCompleted: after >= 1,
      nextReviewDifficultyLevel: Math.min(after + 1, 10),
    },
    progressImpact: impact(quiz.question.skillCode, isCorrect),
  };

  understanding.set(snapshotKey(ownerId, payload.lessonSlug), after);
  receipts.set(key, { fingerprint: print, result: structuredClone(result) });

  const lesson = syllabusLessonFixture();
  const answeredAt = new Date().toISOString();

  setMockProgressUnderstanding(ownerId, payload.lessonSlug, after);

  recordMockProgress({
    ownerId,
    event: {
      id: result.progressImpact!.progressEventId,
      sourceType: 'LESSON_POST_STUDY',
      sourceSessionId: null,
      sourceEntityId: payload.questionId,
      questionType: 'SHORT_FREE_RESPONSE',
      skillCode: quiz.question.skillCode,
      skillTitle: lesson.skills[0]!.title,
      trackSlug: lesson.track.slug,
      unitSlug: lesson.unit.slug,
      lessonSlug: lesson.slug,
      isCorrect,
      numericScore: result.numericScore,
      confidenceWeight: null,
      responseTimeMs: payload.responseTimeMs,
      answeredAt,
    },
    mastery: result.progressImpact!,
    session: {
      sessionStatus: 'COMPLETED',
      sessionTitle: lesson.title,
      startedAt: answeredAt,
      completedAt: answeredAt,
    },
  });

  return { result: structuredClone(result) };
}

export function resetMockPractice(): void {
  sessions.clear();
  understanding.clear();
  receipts.clear();
}

registerMockStateReset(resetMockPractice);
