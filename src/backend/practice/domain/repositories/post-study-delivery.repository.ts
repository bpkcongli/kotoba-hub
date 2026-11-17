import type { CanonicalPostStudyQuestion } from '@/backend/syllabus/domain/value-objects/post-study-question-bank';
import type { Localization } from '@/shared/locale';
import type { LessonReceipt } from './practice.repository';

export interface PostStudyDelivery {
  id: string;
  userId: string;
  lessonSlug: string;
  lessonId: string;
  understandingBefore: number;
  question: CanonicalPostStudyQuestion & {
    skillId: string;
    lessonId: string;
    localization: Localization;
  };
  createdAt: string;
  expiresAt: string;
}

export interface PostStudyDeliveryRepository {
  create(delivery: PostStudyDelivery): Promise<void>;

  get(userId: string, deliveryId: string): Promise<PostStudyDelivery | null>;

  consume(deliveryId: string, receipt: LessonReceipt, now: Date): Promise<LessonReceipt>;
}
