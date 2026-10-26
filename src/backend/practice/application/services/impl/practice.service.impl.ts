import { createHash, randomUUID } from 'node:crypto';
import type { PracticeAiPort } from '@/backend/practice/application/ports/practice-ai.port';
import type { PracticeCatalogPort } from '@/backend/practice/application/ports/practice-catalog.port';
import type { PracticeProgressPort } from '@/backend/practice/application/ports/practice-progress.port';
import type { PracticeRecommendationPort } from '@/backend/practice/application/ports/practice-recommendation.port';
import type {
  PracticeService,
  SubmitPracticeAnswerRequest,
  SubmitLessonAnswerRequest,
  LessonNextResult,
} from '@/backend/practice/application/services/practice.service';
import { PracticeSessionAggregate } from '@/backend/practice/domain/aggregates/practice-session';
import { PracticeError } from '@/backend/practice/domain/exceptions/practice-error';
import type {
  PracticeRepository,
  PracticeSession,
  PracticeQuestion,
  StoredAnswer,
  LessonReceipt,
  LessonAnswerResult,
  UserAnswer,
} from '@/backend/practice/domain/repositories/practice.repository';
import { DeterministicAnswerEvaluator } from '@/backend/practice/domain/services/deterministic-answer-evaluator';
import { generatedPracticeSchema } from '@/backend/shared/application/helpers/ai-schemas';

export class PracticeServiceImpl implements PracticeService {
  constructor(
    private readonly repository: PracticeRepository,
    private readonly catalog: PracticeCatalogPort,
    private readonly progress: PracticeProgressPort,
    private readonly recommendation: PracticeRecommendationPort,
    private readonly ai: PracticeAiPort,
    private readonly evaluator = new DeterministicAnswerEvaluator(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async generateSession(userId: string, questionCount = 5): Promise<PracticeSession> {
    if (!Number.isInteger(questionCount) || questionCount < 1 || questionCount > 10)
      throw new PracticeError(
        142206001,
        'questionCount must be between 1 and 10.',
        'questionCount',
      );

    const recommendation = await this.recommendation.getRecommendation(userId);
    const context = {
      ...recommendation.context,
      allowedQuestionTypes: recommendation.context.allowedQuestionTypes.length
        ? recommendation.context.allowedQuestionTypes
        : ['SHORT_FREE_RESPONSE' as const],
    };
    const sessionId = randomUUID();

    const generated = generatedPracticeSchema.parse(
      await this.ai.generate({
        metadata: {
          requestId: randomUUID(),
          userId,
          sourceEntityType: 'PRACTICE_SESSION',
          sourceEntityId: sessionId,
        },
        context,
        questionCount,
        difficultyBand: recommendation.difficultyBand,
        questionMix: recommendation.questionMix,
      }),
    );

    if (generated.questions.length !== questionCount)
      throw new Error('AI question count does not match the request.');

    const skills = await this.catalog.getSkills();
    const questions: PracticeQuestion[] = generated.questions.map((question, index) => {
      const skill = skills.find((s) => s.code === question.skillCode);

      if (
        !skill ||
        !context.catalog.some((s) => s.skillCode === skill.code) ||
        !context.allowedQuestionTypes.includes(question.questionType) ||
        (question.questionType === 'FREE_RESPONSE'
          ? !skill.supportsPracticeFreeResponse
          : !skill.supportsPracticeObjective)
      )
        throw new Error('Generated question is outside authorized practice constraints.');

      const promptPayload: Record<string, unknown> = { ...question.promptPayload };

      if (question.questionType === 'SHORT_FREE_RESPONSE')
        promptPayload.sentenceTemplateHtml = html(question.promptPayload.sentenceTemplate);

      return {
        id: randomUUID(),
        skillId: skill.id,
        skillCode: skill.code,
        questionType: question.questionType,
        gradingStrategy: question.gradingStrategy,
        difficultyBand: question.difficultyBand,
        promptPayload,
        expectedAnswer: question.expectedAnswer,
        sortOrder: index + 1,
      };
    });

    const session: PracticeSession = {
      id: sessionId,
      userId,
      status: 'GENERATED',
      difficultyBand: recommendation.difficultyBand,
      questionMix: recommendation.questionMix,
      recommendation: { ...recommendation, context },
      questions,
      answeredQuestionsCount: 0,
      startedAt: this.now().toISOString(),
      completedAt: null,
    };

    await this.repository.createSession(session);

    return session;
  }

  async submitAnswer(userId: string, sessionId: string, request: SubmitPracticeAnswerRequest) {
    const prepared = await this.repository.withSessionLock(userId, sessionId, async (tx) => {
      const existing = await tx.findAnswer(request.questionId);

      if (existing) {
        if (
          fingerprint(existing.userAnswer, existing.responseTimeMs) !==
          fingerprint(request.userAnswer, request.responseTimeMs ?? null)
        )
          throw new PracticeError(
            142206002,
            'Question already has a different answer.',
            'questionId',
          );

        return existing;
      }

      const aggregate = new PracticeSessionAggregate(tx.session);
      const question = aggregate.currentQuestion(request.questionId);

      if (tx.session.answeredQuestionsCount > 0) {
        const previous = await tx.findAnswer(
          tx.session.questions[tx.session.answeredQuestionsCount - 1]!.id,
        );

        if (previous && !previous.progressRecorded)
          throw new PracticeError(
            142206002,
            'Retry the previous answer to finish its progress update.',
            'questionId',
          );
      }

      return { session: tx.session, question };
    });

    const id = randomUUID();

    // AI logging uses the same pool, so release the session connection before grading.
    const grade =
      'session' in prepared
        ? prepared.question.gradingStrategy === 'AI'
          ? await this.gradeAi(userId, id, prepared.session, prepared.question, request.userAnswer)
          : this.evaluator.evaluate(prepared.question, request.userAnswer)
        : null;

    const answer =
      'session' in prepared
        ? await this.repository.withSessionLock(userId, sessionId, async (tx) => {
            const existing = await tx.findAnswer(request.questionId);

            if (existing) {
              if (
                fingerprint(existing.userAnswer, existing.responseTimeMs) !==
                fingerprint(request.userAnswer, request.responseTimeMs ?? null)
              )
                throw new PracticeError(
                  142206002,
                  'Question already has a different answer.',
                  'questionId',
                );

              return existing;
            }

            const aggregate = new PracticeSessionAggregate(tx.session);
            const question = aggregate.currentQuestion(request.questionId);

            if (tx.session.answeredQuestionsCount > 0) {
              const previous = await tx.findAnswer(
                tx.session.questions[tx.session.answeredQuestionsCount - 1]!.id,
              );

              if (previous && !previous.progressRecorded)
                throw new PracticeError(
                  142206002,
                  'Retry the previous answer to finish its progress update.',
                  'questionId',
                );
            }

            const answeredAt = this.now().toISOString();
            aggregate.recordAnswer(answeredAt);

            const answer: StoredAnswer = {
              id,
              eventId: randomUUID(),
              sessionId,
              questionId: question.id,
              skillId: question.skillId,
              skillCode: question.skillCode,
              userAnswer: request.userAnswer,
              responseTimeMs: request.responseTimeMs ?? null,
              answeredAt,
              progressRecorded: false,
              producerSession: {
                status: tx.session.status,
                title: 'Random practice',
                startedAt: tx.session.startedAt,
                completedAt: tx.session.completedAt,
              },
              result: {
                ...grade!,
                sessionId,
                questionId: question.id,
                answerId: id,
                sessionProgress: {
                  answeredQuestionsCount: tx.session.answeredQuestionsCount,
                  totalQuestions: tx.session.questions.length,
                  isCompleted: tx.session.status === 'COMPLETED',
                },
                nextQuestionId: tx.session.questions[tx.session.answeredQuestionsCount]?.id ?? null,
                progressImpact: null,
              },
            };

            await tx.saveAnswer(answer);

            return answer;
          })
        : prepared;

    if (answer.progressRecorded) return answer.result;

    const result = await this.progress.recordEvent({
      eventId: answer.eventId,
      userId,
      skillId: answer.skillId,
      sourceType: 'PRACTICE',
      sourceSessionId: sessionId,
      sourceEntityId: answer.id,
      questionType: await this.questionType(userId, sessionId, answer.questionId),
      isCorrect: answer.result.isCorrect,
      numericScore: answer.result.numericScore,
      responseTimeMs: answer.responseTimeMs,
      answeredAt: answer.answeredAt,
      gradingMetadata: answer.result.gradingMetadata,
      producerSession: answer.producerSession,
    });

    return this.repository.saveProgressResult(answer.id, {
      ...answer.result,
      progressImpact: impact(result, answer.skillCode),
    });
  }

  private questionType(userId: string, sessionId: string, questionId: string) {
    return this.repository.withSessionLock(
      userId,
      sessionId,
      async (tx) => tx.session.questions.find((q) => q.id === questionId)!.questionType,
    );
  }

  async nextLessonQuestion(userId: string, lessonSlug: string): Promise<LessonNextResult> {
    const lesson = await this.catalog.getLesson(lessonSlug);
    if (!lesson)
      throw new PracticeError(140406002, 'Published lesson was not found.', 'lessonSlug');

    const level = await this.progress.getUnderstanding(userId, lesson.id);
    const difficulty = Math.min(level + 1, 10);

    const question = await this.catalog.getQuestion(lessonSlug, difficulty);
    if (!question)
      throw new PracticeError(140406002, 'Published lesson question was not found.', 'lessonSlug');

    return {
      lessonSlug,
      currentUnderstandingLevel: level,
      targetUnderstandingLevel: difficulty,
      targetDifficultyLevel: difficulty,
      isReview: level >= 1,
      question: {
        id: question.id,
        skillCode: question.skillCode,
        questionType: 'SHORT_FREE_RESPONSE',
        gradingStrategy: 'DETERMINISTIC',
        difficultyLevel: difficulty,
        promptPayload: question.promptPayload,
      },
    };
  }

  async submitLessonAnswer(
    userId: string,
    request: SubmitLessonAnswerRequest,
  ): Promise<LessonAnswerResult> {
    if (!('normalizedKana' in request.userAnswer))
      throw new PracticeError(142206001, 'A text answer is required.', 'userAnswer');

    const key = request.idempotencyKey ?? randomUUID();
    const hash = createHash('sha256')
      .update(
        JSON.stringify({
          lessonSlug: request.lessonSlug,
          questionId: request.questionId,
          answer: canonicalAnswer(request.userAnswer),
          responseTimeMs: request.responseTimeMs ?? null,
        }),
      )
      .digest('hex');

    let receipt = await this.repository.findLessonReceipt(userId, key);

    if (receipt && receipt.fingerprint !== hash)
      throw new PracticeError(
        142206002,
        'Idempotency key already identifies another attempt.',
        'Idempotency-Key',
      );
    if (receipt?.result) return receipt.result;
    if (!receipt) {
      const next = await this.nextLessonQuestion(userId, request.lessonSlug);

      if (next.question.id !== request.questionId)
        throw new PracticeError(
          142206002,
          'Question does not match the current lesson target.',
          'questionId',
        );

      const question = await this.catalog.getQuestion(
        request.lessonSlug,
        next.targetDifficultyLevel,
      );

      if (!question)
        throw new PracticeError(140406002, 'Published question was not found.', 'questionId');

      const grade = this.evaluator.evaluate(
        {
          questionType: 'SHORT_FREE_RESPONSE',
          promptPayload: question.promptPayload,
          expectedAnswer: question.expectedAnswer,
        },
        request.userAnswer,
      );

      if (question.explanation)
        grade.feedbackText = grade.isCorrect ? 'Correct answer.' : question.explanation;

      const candidate: LessonReceipt = {
        id: randomUUID(),
        userId,
        key,
        fingerprint: hash,
        eventId: randomUUID(),
        answeredAt: this.now().toISOString(),
        lessonSlug: request.lessonSlug,
        questionId: request.questionId,
        skillId: question.skillId,
        skillCode: question.skillCode,
        difficultyLevel: next.targetDifficultyLevel,
        understandingBefore: next.currentUnderstandingLevel,
        grade,
        responseTimeMs: request.responseTimeMs ?? null,
        result: null,
      };

      receipt = await this.repository.createLessonReceipt(candidate);

      if (receipt.fingerprint !== hash)
        throw new PracticeError(
          142206002,
          'Idempotency key already identifies another attempt.',
          'Idempotency-Key',
        );
      if (receipt.result) return receipt.result;
    }

    const recorded = await this.progress.recordEvent({
      eventId: receipt.eventId,
      userId,
      skillId: receipt.skillId,
      sourceType: 'LESSON_POST_STUDY',
      sourceSessionId: null,
      sourceEntityId: receipt.questionId,
      questionType: 'SHORT_FREE_RESPONSE',
      isCorrect: receipt.grade.isCorrect,
      numericScore: receipt.grade.numericScore,
      responseTimeMs: receipt.responseTimeMs,
      answeredAt: receipt.answeredAt,
      gradingMetadata: receipt.grade.gradingMetadata,
      postStudy: { questionId: receipt.questionId, difficultyLevel: receipt.difficultyLevel },
    });

    // Legacy progress events lack the immutable transition now recorded under the lesson lock.
    const before = recorded.lessonTransition?.before ?? receipt.understandingBefore;
    const after =
      recorded.lessonTransition?.after ?? Math.min(before + Number(receipt.grade.isCorrect), 10);

    const result: LessonAnswerResult = {
      lessonSlug: receipt.lessonSlug,
      questionId: receipt.questionId,
      isCorrect: receipt.grade.isCorrect,
      numericScore: receipt.grade.numericScore,
      feedbackText: receipt.grade.feedbackText,
      gradingSource: 'RULE_ENGINE',
      understandingProgress: {
        currentUnderstandingLevelBefore: before,
        currentUnderstandingLevelAfter: after,
        targetDifficultyLevel: receipt.difficultyLevel,
        maxUnderstandingLevel: 10,
        postStudyQuizCompleted: after >= 1,
        nextReviewDifficultyLevel: Math.min(after + 1, 10),
      },
      progressImpact: impact(recorded, receipt.skillCode),
    };

    return this.repository.saveLessonResult(receipt.id, result);
  }

  private async gradeAi(
    userId: string,
    id: string,
    session: PracticeSession,
    question: PracticeQuestion,
    answer: UserAnswer,
  ) {
    if (question.questionType !== 'FREE_RESPONSE' || !('normalizedKana' in answer))
      throw new PracticeError(142206001, 'A Japanese text answer is required.', 'userAnswer');

    const grade = await this.ai.grade({
      metadata: {
        requestId: randomUUID(),
        userId,
        sourceEntityType: 'PRACTICE_ANSWER',
        sourceEntityId: id,
      },
      context: session.recommendation.context,
      question: {
        skillCode: question.skillCode,
        questionType: 'FREE_RESPONSE',
        sourceSentence: question.promptPayload.sourceSentence as string,
        referenceAnswer: question.expectedAnswer.referenceAnswer as string,
      },
      userAnswer: { ...answer, normalizedKanji: answer.normalizedKanji ?? null },
    });

    return {
      ...grade,
      gradingSource: 'AI_PROVIDER' as const,
      gradingMetadata: { gradingStrategy: 'AI' },
    };
  }
}

function impact(
  result: Awaited<ReturnType<PracticeProgressPort['recordEvent']>>,
  skillCode: string,
) {
  return {
    progressEventId: result.eventId,
    skillCode,
    masteryScore: result.mastery.masteryScore,
    masteryState: result.mastery.masteryState,
    recommendedDifficultyBand: result.mastery.recommendedDifficultyBand,
  };
}

function canonicalAnswer(answer: UserAnswer) {
  return 'normalizedKana' in answer
    ? {
        rawInputRomaji: answer.rawInputRomaji,
        normalizedKana: answer.normalizedKana,
        normalizedKanji: answer.normalizedKanji ?? null,
      }
    : 'selectedOptionId' in answer
      ? { selectedOptionId: answer.selectedOptionId }
      : { arrangedTokenIds: answer.arrangedTokenIds };
}

function fingerprint(answer: UserAnswer, time: number | null) {
  return JSON.stringify({ answer: canonicalAnswer(answer), time });
}

function html(text: string) {
  return (
    '<p>' +
    text
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replace('___', '<span class="question-blank">___</span>') +
    '</p>'
  );
}
