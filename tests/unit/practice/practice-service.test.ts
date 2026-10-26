import { PracticeServiceImpl } from '@/backend/practice/application/services/impl/practice.service.impl';
import { PracticeError } from '@/backend/practice/domain/exceptions/practice-error';
import type {
  LessonReceipt,
  PracticeRepository,
  PracticeSession,
  Recommendation,
  StoredAnswer,
} from '@/backend/practice/domain/repositories/practice.repository';
import type { RecordLearningEventRequest } from '@/backend/progress/application/services/requests/record-learning-event.request';
import type { RecordLearningEventResponse } from '@/backend/progress/application/services/responses/progress.response';
import type { GeneratePracticeSessionInput } from '@/backend/shared/application/services/requests/ai-request';
import { emptyLesson, emptyMastery } from '../progress/fixtures';
import {
  canonicalQuestion,
  freeQuestion,
  ids,
  lessonSlug,
  shortQuestion,
  skillCode,
} from './fixtures';

function setup() {
  const sessions = new Map<string, PracticeSession>();
  const answers = new Map<string, StoredAnswer>();
  const receipts = new Map<string, LessonReceipt>();
  const events = new Map<string, RecordLearningEventResponse>();
  let lockActive = false;
  let understandingLevel = 0;

  const repository: PracticeRepository = {
    createSession: jest.fn(async (session) => {
      sessions.set(session.id, structuredClone(session));
    }),

    withSessionLock: async (userId, sessionId, work) => {
      const saved = sessions.get(sessionId);

      if (!saved || saved.userId !== userId) {
        throw new PracticeError(140406001, 'Practice session not found.');
      }

      const session = structuredClone(saved);
      lockActive = true;

      try {
        return await work({
          session,
          findAnswer: async (questionId) => answers.get(`${sessionId}:${questionId}`) ?? null,

          saveAnswer: async (answer) => {
            answers.set(`${sessionId}:${answer.questionId}`, structuredClone(answer));
            sessions.set(sessionId, structuredClone(session));
          },
        });
      } finally {
        lockActive = false;
      }
    },

    saveProgressResult: jest.fn(async (answerId, result) => {
      const answer = [...answers.values()].find((value) => value.id === answerId)!;
      answer.result = structuredClone(result);
      answer.progressRecorded = true;

      return result;
    }),

    findLessonReceipt: jest.fn(async (userId, key) => receipts.get(`${userId}:${key}`) ?? null),

    createLessonReceipt: jest.fn(async (receipt) => {
      const key = `${receipt.userId}:${receipt.key}`;

      if (receipts.has(key)) return receipts.get(key)!;

      receipts.set(key, structuredClone(receipt));

      return receipt;
    }),

    saveLessonResult: jest.fn(async (receiptId, result) => {
      const receipt = [...receipts.values()].find((value) => value.id === receiptId)!;
      receipt.result = structuredClone(result);

      return result;
    }),
  };

  const catalog = {
    getSkills: jest.fn(async () => [
      {
        id: ids.skill,
        code: skillCode,
        lessonSlug,
        supportsPracticeObjective: true,
        supportsPracticeFreeResponse: true,
      },
    ]),

    getLesson: jest.fn(async () => ({ id: ids.lesson, slug: lessonSlug })),

    getQuestion: jest.fn(async (_slug: string, difficulty: number) => ({
      ...canonicalQuestion(difficulty),
      skillId: ids.skill,
      lessonId: ids.lesson,
    })),
  };

  const progress = {
    getUnderstanding: jest.fn(async () => understandingLevel),

    recordEvent: jest.fn(async (request: RecordLearningEventRequest) => {
      const existing = events.get(request.eventId);

      if (existing)
        return {
          ...existing,
          lessonUnderstanding: existing.lessonUnderstanding
            ? { ...existing.lessonUnderstanding, currentUnderstandingLevel: understandingLevel }
            : null,
          replayed: true,
        };

      const understandingBefore = understandingLevel;

      if (request.sourceType === 'LESSON_POST_STUDY' && request.isCorrect) {
        understandingLevel = Math.min(understandingLevel + 1, 10);
      }

      const result: RecordLearningEventResponse = {
        eventId: request.eventId,
        mastery: { ...emptyMastery(ids.user, ids.skill), masteryScore: 75 },
        lessonUnderstanding:
          request.sourceType === 'LESSON_POST_STUDY'
            ? {
                ...emptyLesson(ids.user, ids.lesson),
                currentUnderstandingLevel: understandingLevel,
              }
            : null,
        lessonCompleted: understandingLevel >= 1,
        replayed: false,
        ...(request.sourceType === 'LESSON_POST_STUDY'
          ? { lessonTransition: { before: understandingBefore, after: understandingLevel } }
          : {}),
      };
      events.set(request.eventId, result);

      return result;
    }),
  };

  const recommendationValue: Recommendation = {
    context: {
      targetLevel: 'JLPT_N5',
      currentLevel: 'BEGINNER',
      currentUnitSlug: 'n5-particles',
      catalog: [
        {
          skillCode,
          title: 'Topic particle',
          lessonSlug,
          unitSlug: 'n5-particles',
          trackSlug: 'jlpt-n5',
        },
      ],
      weakSkillCodes: [skillCode],
      masteredSkillCodes: [],
      recentMistakes: [],
      lessonUnderstanding: [{ lessonSlug, level: 0 }],
      allowedQuestionTypes: ['SHORT_FREE_RESPONSE'],
    },
    difficultyBand: 'STANDARD',
    questionMix: { WEAK: 0.6, REINFORCEMENT: 0.3, STRETCH: 0.1 },
  };

  const recommendation = {
    getRecommendation: jest.fn(async () => structuredClone(recommendationValue)),
  };

  const ai = {
    generate: jest.fn(async (input: GeneratePracticeSessionInput) => ({
      questions: Array.from({ length: input.questionCount }, () => structuredClone(shortQuestion)),
    })),

    grade: jest.fn(async () => ({
      isCorrect: true,
      numericScore: 90,
      feedbackText: 'Meaning preserved.',
    })),
  };

  const service = new PracticeServiceImpl(
    repository,
    catalog,
    progress,
    recommendation,
    ai,
    undefined,
    () => new Date('2026-10-26T00:00:00.000Z'),
  );

  return {
    service,
    repository,
    catalog,
    progress,
    recommendation,
    recommendationValue,
    ai,
    sessions,
    answers,
    receipts,
    isSessionLockActive: () => lockActive,

    setUnderstanding: (value: number) => {
      understandingLevel = value;
    },
  };
}

describe('random practice use cases', () => {
  it('generates five questions by default using the current recommendation snapshot', async () => {
    const { service, recommendation, ai, sessions } = setup();

    const session = await service.generateSession(ids.user);

    expect(recommendation.getRecommendation).toHaveBeenCalledWith(ids.user);
    expect(ai.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        questionCount: 5,
        questionMix: { WEAK: 0.6, REINFORCEMENT: 0.3, STRETCH: 0.1 },
        metadata: expect.objectContaining({ userId: ids.user, sourceEntityId: session.id }),
      }),
    );
    expect(session.questions).toHaveLength(5);
    expect(new Set(session.questions.map((question) => question.id)).size).toBe(5);
    expect(sessions.get(session.id)).toMatchObject({
      userId: ids.user,
      status: 'GENERATED',
      answeredQuestionsCount: 0,
    });
  });

  it('rejects an unknown generated skill before persisting a session', async () => {
    const { service, ai, repository } = setup();
    ai.generate.mockResolvedValueOnce({
      questions: [{ ...shortQuestion, skillCode: 'invented_skill' }],
    });

    await expect(service.generateSession(ids.user, 1)).rejects.toThrow();
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('falls back to short free response when no question types are recommended', async () => {
    const { service, recommendationValue, ai } = setup();
    recommendationValue.context.allowedQuestionTypes = [];

    await service.generateSession(ids.user, 1);

    expect(ai.generate).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({ allowedQuestionTypes: ['SHORT_FREE_RESPONSE'] }),
      }),
    );
  });

  it('does not persist a partial generated question set', async () => {
    const { service, ai, repository } = setup();
    ai.generate.mockResolvedValueOnce({ questions: [shortQuestion] });

    await expect(service.generateSession(ids.user, 2)).rejects.toThrow();
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('rejects question types outside the recommendation and unsupported skill activities', async () => {
    const { service, recommendationValue, catalog, repository } = setup();
    recommendationValue.context.allowedQuestionTypes = ['SLOT_FILL'];

    await expect(service.generateSession(ids.user, 1)).rejects.toThrow();

    recommendationValue.context.allowedQuestionTypes = ['SHORT_FREE_RESPONSE'];
    jest.mocked(catalog.getSkills).mockResolvedValueOnce([
      {
        id: ids.skill,
        code: skillCode,
        lessonSlug,
        supportsPracticeObjective: false,
        supportsPracticeFreeResponse: true,
      },
    ]);

    await expect(service.generateSession(ids.user, 1)).rejects.toThrow();
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('grades full free response through AI using the stored question and learner context', async () => {
    const { service, recommendationValue, ai, progress } = setup();
    recommendationValue.context.allowedQuestionTypes = ['FREE_RESPONSE'];
    ai.generate.mockResolvedValueOnce({
      questions: [
        {
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
        },
      ],
    });

    const session = await service.generateSession(ids.user, 1);

    const userAnswer = {
      rawInputRomaji: 'watashi wa gakusei desu',
      normalizedKana: 'わたしはがくせいです',
    };

    const result = await service.submitAnswer(ids.user, session.id, {
      questionId: session.questions[0].id,
      userAnswer,
    });

    expect(result).toMatchObject({
      isCorrect: true,
      numericScore: 90,
      gradingSource: 'AI_PROVIDER',
      feedbackText: 'Meaning preserved.',
    });
    expect(ai.grade).toHaveBeenCalledWith(
      expect.objectContaining({
        question: {
          skillCode,
          questionType: 'FREE_RESPONSE',
          sourceSentence: 'I am a student.',
          referenceAnswer: 'わたしはがくせいです。',
        },
        userAnswer: { ...userAnswer, normalizedKanji: null },
        context: session.recommendation.context,
      }),
    );
    expect(progress.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({ numericScore: 90, questionType: 'FREE_RESPONSE' }),
    );
  });

  it.each([false, true])(
    'releases the session lock for AI and revalidates a concurrent answer with changed payload=%j',
    async (changedPayload) => {
      const { service, recommendationValue, ai, answers, sessions, progress, isSessionLockActive } =
        setup();
      recommendationValue.context.allowedQuestionTypes = ['FREE_RESPONSE'];
      ai.generate.mockResolvedValueOnce({ questions: [freeQuestion] });

      const session = await service.generateSession(ids.user, 1);

      let signalGradingStarted!: () => void;
      let finishGrading!: () => void;
      const gradingStarted = new Promise<void>((resolve) => {
        signalGradingStarted = resolve;
      });
      const gradingRelease = new Promise<void>((resolve) => {
        finishGrading = resolve;
      });
      const gradingLockStates: boolean[] = [];
      ai.grade.mockImplementationOnce(async () => {
        gradingLockStates.push(isSessionLockActive());
        signalGradingStarted();

        await gradingRelease;

        return { isCorrect: true, numericScore: 90, feedbackText: 'First grading result.' };
      });
      const request = {
        questionId: session.questions[0].id,
        userAnswer: {
          rawInputRomaji: 'watashi wa gakusei desu',
          normalizedKana: 'わたしはがくせいです',
        },
      };
      const pending = service.submitAnswer(ids.user, session.id, request);

      await gradingStarted;
      const competing = await service.submitAnswer(ids.user, session.id, {
        ...request,
        ...(changedPayload ? { responseTimeMs: 1000 } : {}),
      });

      finishGrading();

      if (changedPayload) {
        await expect(pending).rejects.toMatchObject({ code: 142206002 });
      } else {
        expect(await pending).toEqual(competing);
      }

      expect(gradingLockStates).toEqual([false]);
      expect(answers.size).toBe(1);
      expect(sessions.get(session.id)?.answeredQuestionsCount).toBe(1);
      expect(progress.recordEvent).toHaveBeenCalledTimes(1);
      expect([...answers.values()][0].result.feedbackText).toBe('Meaning preserved.');
    },
  );

  it('grades objective answers without AI and writes progress after persisting the answer', async () => {
    const { service, ai, progress, answers, sessions } = setup();

    const session = await service.generateSession(ids.user, 1);
    const result = await service.submitAnswer(ids.user, session.id, {
      questionId: session.questions[0].id,
      userAnswer: { rawInputRomaji: 'wa', normalizedKana: 'は' },
      responseTimeMs: 800,
    });

    expect(result).toMatchObject({
      isCorrect: true,
      numericScore: 100,
      gradingSource: 'RULE_ENGINE',
      nextQuestionId: null,
      sessionProgress: { answeredQuestionsCount: 1, totalQuestions: 1, isCompleted: true },
    });
    expect(ai.grade).not.toHaveBeenCalled();
    expect(answers.size).toBe(1);
    expect(sessions.get(session.id)?.status).toBe('COMPLETED');
    expect(progress.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: ids.user,
        skillId: ids.skill,
        sourceType: 'PRACTICE',
        sourceSessionId: session.id,
        sourceEntityId: [...answers.values()][0].id,
        responseTimeMs: 800,
      }),
    );
  });

  it('enforces session ownership before answering', async () => {
    const { service, answers, progress } = setup();

    const session = await service.generateSession(ids.user, 1);

    await expect(
      service.submitAnswer(ids.otherUser, session.id, {
        questionId: session.questions[0].id,
        userAnswer: { rawInputRomaji: 'wa', normalizedKana: 'は' },
      }),
    ).rejects.toMatchObject({ code: 140406001 });
    expect(answers.size).toBe(0);
    expect(progress.recordEvent).not.toHaveBeenCalled();
  });

  it('rejects a future question before any answer or progress is written', async () => {
    const { service, answers, progress } = setup();

    const session = await service.generateSession(ids.user, 2);

    await expect(
      service.submitAnswer(ids.user, session.id, {
        questionId: session.questions[1].id,
        userAnswer: { rawInputRomaji: 'wa', normalizedKana: 'は' },
      }),
    ).rejects.toMatchObject({ code: 142206002 });
    expect(answers.size).toBe(0);
    expect(progress.recordEvent).not.toHaveBeenCalled();
  });

  it('returns the stored result for exact retries and rejects a changed answer', async () => {
    const { service, answers, progress, sessions } = setup();

    const session = await service.generateSession(ids.user, 1);

    const request = {
      questionId: session.questions[0].id,
      userAnswer: { rawInputRomaji: 'wa', normalizedKana: 'は' },
      responseTimeMs: 700,
    };

    const first = await service.submitAnswer(ids.user, session.id, request);

    expect(await service.submitAnswer(ids.user, session.id, request)).toEqual(first);
    await expect(
      service.submitAnswer(ids.user, session.id, { ...request, responseTimeMs: 701 }),
    ).rejects.toMatchObject({ code: 142206002 });
    expect(progress.recordEvent).toHaveBeenCalledTimes(1);
    expect(answers.size).toBe(1);
    expect(sessions.get(session.id)?.answeredQuestionsCount).toBe(1);
  });

  it('recovers a failed handoff with a stable progress event and no duplicate answer', async () => {
    const { service, progress, answers, sessions } = setup();

    const session = await service.generateSession(ids.user, 1);

    const request = {
      questionId: session.questions[0].id,
      userAnswer: { rawInputRomaji: 'wa', normalizedKana: 'は' },
    };
    progress.recordEvent.mockRejectedValueOnce(new Error('progress unavailable'));

    await expect(service.submitAnswer(ids.user, session.id, request)).rejects.toThrow(
      'progress unavailable',
    );

    const eventId = [...answers.values()][0].eventId;

    await service.submitAnswer(ids.user, session.id, request);

    expect(progress.recordEvent.mock.calls.map(([event]) => event.eventId)).toEqual([
      eventId,
      eventId,
    ]);
    expect(answers.size).toBe(1);
    expect(sessions.get(session.id)?.answeredQuestionsCount).toBe(1);
  });
});

describe('direct lesson post-study use cases', () => {
  it.each([0, 4, 9, 10])(
    'selects one canonical next question at understanding level %i',
    async (level) => {
      const { service, catalog, ai, repository, setUnderstanding } = setup();
      setUnderstanding(level);
      const target = Math.min(level + 1, 10);

      const result = await service.nextLessonQuestion(ids.user, lessonSlug);

      expect(result).toMatchObject({
        lessonSlug,
        currentUnderstandingLevel: level,
        targetUnderstandingLevel: target,
        targetDifficultyLevel: target,
        isReview: level >= 1,
        question: {
          id: canonicalQuestion(target).id,
          gradingStrategy: 'DETERMINISTIC',
          difficultyLevel: target,
        },
      });
      expect(result.question).not.toHaveProperty('expectedAnswer');
      expect(catalog.getQuestion).toHaveBeenCalledWith(lessonSlug, target);
      expect(repository.createSession).not.toHaveBeenCalled();
      expect(ai.generate).not.toHaveBeenCalled();
      expect(ai.grade).not.toHaveBeenCalled();
    },
  );

  it('rejects an unavailable lesson', async () => {
    const { service, catalog, repository } = setup();
    jest.mocked(catalog.getLesson).mockResolvedValueOnce(null as never);

    await expect(service.nextLessonQuestion(ids.user, lessonSlug)).rejects.toMatchObject({
      code: 140406002,
    });
    expect(repository.createSession).not.toHaveBeenCalled();
  });

  it('rejects a stale or foreign question before recording progress', async () => {
    const { service, progress } = setup();

    await expect(
      service.submitLessonAnswer(ids.user, {
        lessonSlug,
        questionId: canonicalQuestion(2).id,
        userAnswer: { rawInputRomaji: 'wa', normalizedKana: 'は' },
      }),
    ).rejects.toMatchObject({ code: 142206002 });
    expect(progress.recordEvent).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    'records a deterministic lesson attempt with correct=%j',
    async (isCorrect) => {
      const { service, progress, repository, ai } = setup();

      const result = await service.submitLessonAnswer(ids.user, {
        lessonSlug,
        questionId: canonicalQuestion().id,
        userAnswer: {
          rawInputRomaji: isCorrect ? 'wa' : 'ga',
          normalizedKana: isCorrect ? 'は' : 'が',
        },
        responseTimeMs: 1200,
      });

      expect(result).toMatchObject({
        isCorrect,
        gradingSource: 'RULE_ENGINE',
        understandingProgress: {
          currentUnderstandingLevelBefore: 0,
          currentUnderstandingLevelAfter: isCorrect ? 1 : 0,
          targetDifficultyLevel: 1,
          maxUnderstandingLevel: 10,
          postStudyQuizCompleted: isCorrect,
        },
      });
      expect(progress.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceType: 'LESSON_POST_STUDY',
          sourceSessionId: null,
          sourceEntityId: canonicalQuestion().id,
          skillId: ids.skill,
          questionType: 'SHORT_FREE_RESPONSE',
          isCorrect,
        }),
      );
      expect(repository.createSession).not.toHaveBeenCalled();
      expect(ai.generate).not.toHaveBeenCalled();
      expect(ai.grade).not.toHaveBeenCalled();
    },
  );

  it('keeps completed lesson reviews capped at level ten', async () => {
    const { service, setUnderstanding } = setup();
    setUnderstanding(10);

    expect(
      await service.submitLessonAnswer(ids.user, {
        lessonSlug,
        questionId: canonicalQuestion(10).id,
        userAnswer: { rawInputRomaji: 'wa', normalizedKana: 'は' },
      }),
    ).toMatchObject({
      understandingProgress: {
        currentUnderstandingLevelBefore: 10,
        currentUnderstandingLevelAfter: 10,
        postStudyQuizCompleted: true,
        nextReviewDifficultyLevel: 10,
      },
    });
  });

  it('replays a completed keyed lesson attempt without selecting or recording it again', async () => {
    const { service, progress, catalog, receipts } = setup();
    const request = {
      lessonSlug,
      questionId: canonicalQuestion().id,
      userAnswer: { rawInputRomaji: 'wa', normalizedKana: 'は' },
      idempotencyKey: 'attempt-1',
      responseTimeMs: 600,
    };

    const first = await service.submitLessonAnswer(ids.user, request);

    catalog.getQuestion.mockRejectedValueOnce(new Error('catalog unavailable after commit'));

    expect(await service.submitLessonAnswer(ids.user, request)).toEqual(first);
    expect(progress.recordEvent).toHaveBeenCalledTimes(1);
    expect(receipts.size).toBe(1);
    expect(catalog.getQuestion).toHaveBeenCalledTimes(2);
  });

  it('retries a pending lesson progress handoff using the persisted event id', async () => {
    const { service, progress, receipts } = setup();
    const request = {
      lessonSlug,
      questionId: canonicalQuestion().id,
      userAnswer: { rawInputRomaji: 'wa', normalizedKana: 'は' },
      idempotencyKey: 'retry-1',
    };
    progress.recordEvent.mockRejectedValueOnce(new Error('progress unavailable'));

    await expect(service.submitLessonAnswer(ids.user, request)).rejects.toThrow(
      'progress unavailable',
    );

    const receipt = [...receipts.values()][0];

    expect(receipt.result).toBeNull();

    const result = await service.submitLessonAnswer(ids.user, request);

    expect(progress.recordEvent.mock.calls.map(([event]) => event.eventId)).toEqual([
      receipt.eventId,
      receipt.eventId,
    ]);
    expect(result.understandingProgress.currentUnderstandingLevelAfter).toBe(1);
    expect(receipts.size).toBe(1);
  });

  it('rejects reuse of a lesson attempt key for a different payload', async () => {
    const { service, progress, receipts } = setup();
    const request = {
      lessonSlug,
      questionId: canonicalQuestion().id,
      userAnswer: { rawInputRomaji: 'wa', normalizedKana: 'は' },
      idempotencyKey: 'attempt-1',
    };

    await service.submitLessonAnswer(ids.user, request);

    await expect(
      service.submitLessonAnswer(ids.user, { ...request, responseTimeMs: 1 }),
    ).rejects.toMatchObject({ code: 142206002 });
    expect(progress.recordEvent).toHaveBeenCalledTimes(1);
    expect(receipts.size).toBe(1);
  });

  it('recovers a lesson acknowledgement failure without advancing understanding twice', async () => {
    const { service, progress, repository, receipts } = setup();
    const request = {
      lessonSlug,
      questionId: canonicalQuestion().id,
      userAnswer: { rawInputRomaji: 'wa', normalizedKana: 'は' },
      idempotencyKey: 'ack-retry-1',
    };
    jest
      .mocked(repository.saveLessonResult)
      .mockRejectedValueOnce(new Error('acknowledgement failed'));

    await expect(service.submitLessonAnswer(ids.user, request)).rejects.toThrow(
      'acknowledgement failed',
    );

    const eventId = [...receipts.values()][0].eventId;

    const result = await service.submitLessonAnswer(ids.user, request);

    expect(result.understandingProgress).toMatchObject({
      currentUnderstandingLevelBefore: 0,
      currentUnderstandingLevelAfter: 1,
    });
    expect(progress.recordEvent.mock.calls.map(([event]) => event.eventId)).toEqual([
      eventId,
      eventId,
    ]);
    expect(progress.getUnderstanding).toHaveBeenCalledTimes(1);
    expect(receipts.size).toBe(1);
  });

  it('replays the original lesson transition after a newer answer advances understanding', async () => {
    const { service, progress, repository, receipts } = setup();
    const firstRequest = {
      lessonSlug,
      questionId: canonicalQuestion(1).id,
      userAnswer: { rawInputRomaji: 'wa', normalizedKana: 'は' },
      idempotencyKey: 'original-attempt',
    };
    jest
      .mocked(repository.saveLessonResult)
      .mockRejectedValueOnce(new Error('acknowledgement failed'));

    await expect(service.submitLessonAnswer(ids.user, firstRequest)).rejects.toThrow(
      'acknowledgement failed',
    );

    const firstEventId = [...receipts.values()][0].eventId;

    const newer = await service.submitLessonAnswer(ids.user, {
      ...firstRequest,
      questionId: canonicalQuestion(2).id,
      idempotencyKey: 'newer-attempt',
    });

    expect(newer.understandingProgress).toMatchObject({
      currentUnderstandingLevelBefore: 1,
      currentUnderstandingLevelAfter: 2,
    });

    const replay = await service.submitLessonAnswer(ids.user, firstRequest);

    expect(replay.understandingProgress).toMatchObject({
      currentUnderstandingLevelBefore: 0,
      currentUnderstandingLevelAfter: 1,
      nextReviewDifficultyLevel: 2,
    });
    expect(progress.recordEvent.mock.calls.at(-1)?.[0].eventId).toBe(firstEventId);
    expect(receipts.size).toBe(2);
  });

  it('reports the actual capped lesson transition when another attempt finishes before progress commits', async () => {
    const { service, progress, setUnderstanding } = setup();
    setUnderstanding(10);
    progress.getUnderstanding.mockResolvedValueOnce(9);

    const result = await service.submitLessonAnswer(ids.user, {
      lessonSlug,
      questionId: canonicalQuestion(10).id,
      userAnswer: { rawInputRomaji: 'wa', normalizedKana: 'は' },
      idempotencyKey: 'concurrent-cap-review',
    });

    expect(result.understandingProgress).toMatchObject({
      currentUnderstandingLevelBefore: 10,
      currentUnderstandingLevelAfter: 10,
      targetDifficultyLevel: 10,
      nextReviewDifficultyLevel: 10,
    });
  });
});
