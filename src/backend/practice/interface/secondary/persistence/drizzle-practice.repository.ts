import { and, asc, eq, sql } from 'drizzle-orm';
import { PracticeError } from '@/backend/practice/domain/exceptions/practice-error';
import type {
  AnswerResult,
  LessonAnswerResult,
  LessonReceipt,
  PracticeRepository,
  PracticeSession,
  StoredAnswer,
  PracticeTransaction,
} from '@/backend/practice/domain/repositories/practice.repository';
import {
  practiceSessions,
  practiceQuestions,
  practiceAnswers,
  practicePostStudyReceipts,
} from '@/backend/practice/infrastructure/database/schema';
import { getDatabase } from '@/backend/shared/infrastructure/database/connection';

type Database = ReturnType<typeof getDatabase>;
type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

class DrizzlePracticeTransaction implements PracticeTransaction {
  constructor(
    private readonly tx: Transaction,
    readonly session: PracticeSession,
  ) {}

  async findAnswer(questionId: string) {
    const [row] = await this.tx
      .select()
      .from(practiceAnswers)
      .where(
        and(
          eq(practiceAnswers.sessionId, this.session.id),
          eq(practiceAnswers.questionId, questionId),
        ),
      )
      .limit(1);

    return row
      ? { ...row.answerPayload, progressRecorded: row.progressRecorded, result: row.resultPayload }
      : null;
  }

  async saveAnswer(answer: StoredAnswer) {
    await this.tx.insert(practiceAnswers).values({
      id: answer.id,
      sessionId: answer.sessionId,
      questionId: answer.questionId,
      attemptNumber: 1,
      userAnswerPayload: answer.userAnswer,
      isCorrect: answer.result.isCorrect,
      numericScore: answer.result.numericScore,
      feedbackText: answer.result.feedbackText,
      gradingSource: answer.result.gradingSource,
      gradingMetadata: answer.result.gradingMetadata,
      responseTimeMs: answer.responseTimeMs,
      answeredAt: new Date(answer.answeredAt),
      progressRecorded: false,
      answerPayload: answer,
      resultPayload: answer.result,
    });

    await this.tx
      .update(practiceSessions)
      .set({
        status: this.session.status,
        answeredQuestionsCount: this.session.answeredQuestionsCount,
        completedAt: this.session.completedAt ? new Date(this.session.completedAt) : null,
      })
      .where(eq(practiceSessions.id, this.session.id));
  }
}

export class DrizzlePracticeRepository implements PracticeRepository {
  constructor(private readonly database: () => Database = getDatabase) {}

  async createSession(session: PracticeSession) {
    await this.database().transaction(async (tx) => {
      await tx.insert(practiceSessions).values({
        id: session.id,
        userId: session.userId,
        status: session.status,
        difficultyBand: session.difficultyBand,
        questionMix: session.questionMix,
        recommendationSpec: session.recommendation,
        totalQuestions: session.questions.length,
        answeredQuestionsCount: 0,
        startedAt: new Date(session.startedAt),
        completedAt: null,
      });

      await tx.insert(practiceQuestions).values(
        session.questions.map((q) => ({
          id: q.id,
          sessionId: session.id,
          skillId: q.skillId,
          questionType: q.questionType,
          gradingStrategy: q.gradingStrategy,
          difficultyBand: q.difficultyBand,
          promptText: String(
            q.promptPayload.sentenceTemplate ?? q.promptPayload.sourceSentence ?? '',
          ),
          promptPayload: q.promptPayload,
          expectedAnswerPayload: q.expectedAnswer,
          questionSnapshot: q,
          sortOrder: q.sortOrder,
        })),
      );
    });
  }

  withSessionLock<T>(
    userId: string,
    sessionId: string,
    work: (tx: PracticeTransaction) => Promise<T>,
  ): Promise<T> {
    return this.database().transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(practiceSessions)
        .where(and(eq(practiceSessions.id, sessionId), eq(practiceSessions.userId, userId)))
        .limit(1)
        .for('update');

      if (!row) throw new PracticeError(140406001, 'Practice session was not found.', 'sessionId');

      const questions = await tx
        .select()
        .from(practiceQuestions)
        .where(eq(practiceQuestions.sessionId, sessionId))
        .orderBy(asc(practiceQuestions.sortOrder));

      return work(
        new DrizzlePracticeTransaction(tx, {
          id: row.id,
          userId: row.userId,
          status: row.status as PracticeSession['status'],
          difficultyBand: row.difficultyBand as PracticeSession['difficultyBand'],
          questionMix: row.questionMix,
          recommendation: row.recommendationSpec,
          questions: questions.map((q) => q.questionSnapshot),
          answeredQuestionsCount: row.answeredQuestionsCount,
          startedAt: row.startedAt.toISOString(),
          completedAt: row.completedAt?.toISOString() ?? null,
        }),
      );
    });
  }

  async saveProgressResult(answerId: string, result: AnswerResult) {
    return this.database().transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(practiceAnswers)
        .where(eq(practiceAnswers.id, answerId))
        .limit(1)
        .for('update');

      if (!row) throw new Error('Practice answer is missing.');
      if (row.progressRecorded) return row.resultPayload;

      await tx
        .update(practiceAnswers)
        .set({ progressRecorded: true, resultPayload: result })
        .where(eq(practiceAnswers.id, answerId));

      return result;
    });
  }

  async findLessonReceipt(userId: string, key: string) {
    const [row] = await this.database()
      .select()
      .from(practicePostStudyReceipts)
      .where(
        and(
          eq(practicePostStudyReceipts.userId, userId),
          eq(practicePostStudyReceipts.idempotencyKey, key),
        ),
      )
      .limit(1);

    return row?.receiptPayload ?? null;
  }

  async createLessonReceipt(receipt: LessonReceipt) {
    await this.database()
      .insert(practicePostStudyReceipts)
      .values({
        id: receipt.id,
        userId: receipt.userId,
        idempotencyKey: receipt.key,
        receiptPayload: receipt,
      })
      .onDuplicateKeyUpdate({ set: { id: sql`${practicePostStudyReceipts.id}` } });

    const saved = await this.findLessonReceipt(receipt.userId, receipt.key);
    if (!saved) throw new Error('Post-study receipt was not saved.');

    return saved;
  }

  async saveLessonResult(id: string, result: LessonAnswerResult) {
    return this.database().transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(practicePostStudyReceipts)
        .where(eq(practicePostStudyReceipts.id, id))
        .limit(1)
        .for('update');

      if (!row) throw new Error('Post-study receipt is missing.');
      if (row.receiptPayload.result) return row.receiptPayload.result;

      await tx
        .update(practicePostStudyReceipts)
        .set({ receiptPayload: { ...row.receiptPayload, result } })
        .where(eq(practicePostStudyReceipts.id, id));

      return result;
    });
  }
}

export const practiceRepository = new DrizzlePracticeRepository();
