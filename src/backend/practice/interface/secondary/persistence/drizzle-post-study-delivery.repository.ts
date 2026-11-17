import { and, eq, sql } from 'drizzle-orm';
import { PracticeError } from '@/backend/practice/domain/exceptions/practice-error';
import type {
  PostStudyDelivery,
  PostStudyDeliveryRepository,
} from '@/backend/practice/domain/repositories/post-study-delivery.repository';
import type { LessonReceipt } from '@/backend/practice/domain/repositories/practice.repository';
import {
  practicePostStudyDeliveries,
  practicePostStudyReceipts,
} from '@/backend/practice/infrastructure/database/schema';
import { getDatabase } from '@/backend/shared/infrastructure/database/connection';

export class DrizzlePostStudyDeliveryRepository implements PostStudyDeliveryRepository {
  async create(delivery: PostStudyDelivery) {
    await getDatabase()
      .insert(practicePostStudyDeliveries)
      .values({
        id: delivery.id,
        userId: delivery.userId,
        questionId: delivery.question.id,
        snapshotPayload: delivery,
        createdAt: new Date(delivery.createdAt),
        expiresAt: new Date(delivery.expiresAt),
      });
  }

  async get(userId: string, id: string) {
    const [row] = await getDatabase()
      .select()
      .from(practicePostStudyDeliveries)
      .where(
        and(eq(practicePostStudyDeliveries.id, id), eq(practicePostStudyDeliveries.userId, userId)),
      );

    return row?.snapshotPayload ?? null;
  }

  async consume(deliveryId: string, receipt: LessonReceipt, now: Date) {
    return getDatabase().transaction(async (tx) => {
      const [delivery] = await tx
        .select()
        .from(practicePostStudyDeliveries)
        .where(
          and(
            eq(practicePostStudyDeliveries.id, deliveryId),
            eq(practicePostStudyDeliveries.userId, receipt.userId),
          ),
        )
        .for('update');

      if (!delivery) throw new PracticeError(140406002, 'Delivery was not found.', 'deliveryId');

      if (delivery.receiptId) {
        const [stored] = await tx
          .select()
          .from(practicePostStudyReceipts)
          .where(eq(practicePostStudyReceipts.id, delivery.receiptId));

        if (
          stored?.idempotencyKey === receipt.key &&
          stored.receiptPayload.fingerprint === receipt.fingerprint
        ) {
          return stored.receiptPayload;
        }

        throw new PracticeError(142206002, 'Delivery was already consumed.', 'deliveryId');
      }

      if (delivery.expiresAt <= now)
        throw new PracticeError(142206002, 'Delivery expired. Load a new question.', 'deliveryId');

      await tx
        .insert(practicePostStudyReceipts)
        .values({
          id: receipt.id,
          userId: receipt.userId,
          idempotencyKey: receipt.key,
          receiptPayload: receipt,
        })
        .onDuplicateKeyUpdate({ set: { id: sql`${practicePostStudyReceipts.id}` } });

      const [saved] = await tx
        .select()
        .from(practicePostStudyReceipts)
        .where(
          and(
            eq(practicePostStudyReceipts.userId, receipt.userId),
            eq(practicePostStudyReceipts.idempotencyKey, receipt.key),
          ),
        );

      if (!saved || saved.receiptPayload.fingerprint !== receipt.fingerprint)
        throw new PracticeError(142206002, 'Idempotency key conflict.', 'Idempotency-Key');

      await tx
        .update(practicePostStudyDeliveries)
        .set({ receiptId: saved.id })
        .where(eq(practicePostStudyDeliveries.id, deliveryId));

      return saved.receiptPayload;
    });
  }
}

export const postStudyDeliveryRepository = new DrizzlePostStudyDeliveryRepository();
