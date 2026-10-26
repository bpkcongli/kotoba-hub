import type {
  ProgressCatalogPort,
  ProgressSkillAttribution,
} from '@/backend/progress/application/ports/progress-catalog.port';
import type {
  ProgressFilter,
  ProgressPageFilter,
  ProgressService,
} from '@/backend/progress/application/services/progress.service';
import type { RecordLearningEventRequest } from '@/backend/progress/application/services/requests/record-learning-event.request';
import type {
  ProgressOverview,
  ProgressPage,
  ProgressSessionFeedItem,
  ProgressTimelineItem,
  RecordLearningEventResponse,
} from '@/backend/progress/application/services/responses/progress.response';
import { LearningEvent } from '@/backend/progress/domain/entities/learning-event';
import { InvalidProgressEvent } from '@/backend/progress/domain/exceptions/invalid-progress-event';
import type {
  ProducerSessionMetadata,
  ProgressEventSnapshot,
  ProgressRepository,
  SkillMasterySnapshot,
} from '@/backend/progress/domain/repositories/progress.repository';
import { LessonUnderstandingCalculator } from '@/backend/progress/domain/services/lesson-understanding-calculator';
import { MasteryCalculator } from '@/backend/progress/domain/services/mastery-calculator';

export class ProgressServiceImpl implements ProgressService {
  constructor(
    private readonly repository: ProgressRepository,
    private readonly catalog: ProgressCatalogPort,
    private readonly mastery = new MasteryCalculator(),
    private readonly understanding = new LessonUnderstandingCalculator(),
  ) {}

  async recordLearningEvent(
    request: RecordLearningEventRequest,
  ): Promise<RecordLearningEventResponse> {
    const saved = await this.repository.findEvent(request.userId, request.eventId);

    if (saved) {
      const event = this.createEvent(request, saved);
      this.assertReplay(request, event, saved);

      return this.repository.withSkillLock(saved.userId, saved.skillId, async (transaction) => {
        const lessonUnderstanding =
          saved.sourceType === 'LESSON_POST_STUDY'
            ? await transaction.lockLesson(saved.userId, saved.lessonId)
            : null;

        return {
          eventId: saved.id,
          mastery: await transaction.getMastery(),
          lessonUnderstanding,
          lessonCompleted: (lessonUnderstanding?.currentUnderstandingLevel ?? 0) >= 1,
          lessonTransition: this.lessonTransition(saved),
          replayed: true,
        };
      });
    }

    const attribution = (await this.catalog.getPublishedAttributions()).find(
      (entry) => entry.skillId === request.skillId,
    );
    if (!attribution)
      throw new InvalidProgressEvent('Skill attribution must reference the published syllabus.');

    const event = this.createEvent(request, attribution);
    this.validateSessionMetadata(request.producerSession);

    const question =
      request.sourceType === 'LESSON_POST_STUDY'
        ? attribution.postStudyQuestions.find(
            (entry) =>
              entry.id === request.sourceEntityId &&
              entry.skillCode === attribution.skillCode &&
              entry.questionType === request.questionType,
          )
        : null;

    if (
      request.sourceType === 'LESSON_POST_STUDY' &&
      (!question ||
        !request.postStudy ||
        request.postStudy.questionId !== question.id ||
        request.postStudy.difficultyLevel !== question.difficultyLevel)
    )
      throw new InvalidProgressEvent(
        'Post-study question must match the canonical lesson, skill, type and difficulty.',
      );

    if (request.sourceType !== 'LESSON_POST_STUDY' && request.postStudy)
      throw new InvalidProgressEvent('Only post-study events may update lesson understanding.');

    return this.repository.withSkillLock(request.userId, request.skillId, async (transaction) => {
      const previous = await transaction.getMastery();
      const existing = await transaction.findEvent(event.id);
      if (existing) {
        this.assertReplay(request, event, existing);

        const lessonUnderstanding =
          request.sourceType === 'LESSON_POST_STUDY'
            ? await transaction.lockLesson(request.userId, existing.lessonId)
            : null;

        return {
          eventId: event.id,
          mastery: previous,
          lessonUnderstanding,
          lessonCompleted: (lessonUnderstanding?.currentUnderstandingLevel ?? 0) >= 1,
          lessonTransition: this.lessonTransition(existing),
          replayed: true,
        };
      }

      let lessonUnderstanding = null;
      let lessonTransition: { before: number; after: number } | undefined;

      if (question) {
        const previousLesson = await transaction.lockLesson(request.userId, attribution.lessonId);
        lessonUnderstanding = this.understanding.advance(
          previousLesson,
          event,
          question.difficultyLevel,
        );
        lessonTransition = {
          before: previousLesson.currentUnderstandingLevel,
          after: lessonUnderstanding.currentUnderstandingLevel,
        };
      }

      const history = await transaction.getSkillHistory(request.userId, request.skillId);
      const mastery = this.mastery.calculate(
        [...history, event],
        previous.recommendedDifficultyBand,
        event.id,
      );

      event.gradingMetadata = {
        ...request.gradingMetadata,
        progress: {
          attribution: { ...attribution, postStudyQuestions: undefined },
          masteryScoreAfter: mastery.masteryScore,
          ...(request.producerSession ? { producerSession: request.producerSession } : {}),
          ...(question ? { difficultyLevel: question.difficultyLevel, lessonTransition } : {}),
        },
      };

      await transaction.insertEvent(event);
      await transaction.saveMastery(mastery);
      if (lessonUnderstanding) await transaction.saveLesson(lessonUnderstanding);

      return {
        eventId: event.id,
        mastery,
        lessonUnderstanding,
        lessonCompleted: (lessonUnderstanding?.currentUnderstandingLevel ?? 0) >= 1,
        lessonTransition,
        replayed: false,
      };
    });
  }

  async getOverview(userId: string, filter: ProgressFilter = {}): Promise<ProgressOverview> {
    const [state, catalog] = await Promise.all([
      this.repository.readState(userId),
      this.catalog.getPublishedAttributions(),
    ]);

    const retained = new Map(catalog.map((entry) => [entry.skillId, entry]));
    const history = [...state.events].sort(
      (a, b) => b.answeredAt.localeCompare(a.answeredAt) || b.id.localeCompare(a.id),
    );
    for (const event of history) {
      const historical = this.eventAttribution(event);
      if (historical && !retained.has(event.skillId)) retained.set(event.skillId, historical);
    }

    const attributions = [...retained.values()].filter(
      (entry) => !filter.trackSlug || entry.trackSlug === filter.trackSlug,
    );
    const bySkill = new Map(attributions.map((entry) => [entry.skillId, entry]));
    const byLesson = new Map(catalog.map((entry) => [entry.lessonId, entry]));

    for (const event of history) {
      const historical = this.eventAttribution(event);
      if (historical && !byLesson.has(historical.lessonId))
        byLesson.set(historical.lessonId, historical);
    }

    const lessons = new Set(
      [...byLesson.values()]
        .filter((entry) => !filter.trackSlug || entry.trackSlug === filter.trackSlug)
        .map((entry) => entry.lessonId),
    );

    const skills = state.skills.filter(
      (entry) => bySkill.has(entry.skillId) && entry.attemptsWindowSize > 0,
    );
    const understanding = state.lessons.filter((entry) => lessons.has(entry.lessonId));
    const summary = this.summarize(skills);
    const trackIds = [...new Set(skills.map((entry) => bySkill.get(entry.skillId)!.trackId))];

    return {
      ...summary,
      developingSkillsCount: skills.filter(
        (entry) => entry.masteryState === 'DEVELOPING' || entry.masteryState === 'STABLE',
      ).length,
      weakSkillsCount: skills.filter((entry) => entry.masteryState === 'WEAK').length,
      recommendedDifficultyBand: skills.some(
        (entry) => entry.recommendedDifficultyBand === 'REMEDIAL',
      )
        ? 'REMEDIAL'
        : skills.length && skills.every((entry) => entry.recommendedDifficultyBand === 'STRETCH')
          ? 'STRETCH'
          : 'STANDARD',
      lessonUnderstandingSummary: {
        trackedLessonsCount: understanding.length,
        completedLessonsCount: understanding.filter((entry) => entry.currentUnderstandingLevel >= 1)
          .length,
        averageUnderstandingLevel: this.average(
          understanding.map((entry) => entry.currentUnderstandingLevel),
        ),
        maxUnderstandingLevel: 10,
      },
      trackSummaries: trackIds
        .map((trackId) => {
          const attribution = attributions.find((entry) => entry.trackId === trackId)!;
          return {
            trackSlug: attribution.trackSlug,
            trackTitle: attribution.trackTitle,
            ...this.summarize(
              skills.filter((entry) => bySkill.get(entry.skillId)!.trackId === trackId),
            ),
          };
        })
        .sort((a, b) => a.trackSlug.localeCompare(b.trackSlug)),
    };
  }

  async getTimeline(
    userId: string,
    filter: ProgressPageFilter,
  ): Promise<ProgressPage<ProgressTimelineItem>> {
    const items = (await this.filteredEvents(userId, filter)).map(({ event, attribution }) => ({
      id: event.id,
      sourceType: event.sourceType,
      sourceSessionId: event.sourceSessionId,
      sourceEntityId: event.sourceEntityId,
      questionType: event.questionType,
      skillCode: attribution.skillCode,
      skillTitle: attribution.skillTitle,
      trackSlug: attribution.trackSlug,
      unitSlug: attribution.unitSlug,
      lessonSlug: attribution.lessonSlug,
      isCorrect: event.isCorrect,
      numericScore: event.numericScore,
      confidenceWeight: event.confidenceWeight,
      responseTimeMs: event.responseTimeMs,
      answeredAt: event.answeredAt,
    }));

    return this.page(items, filter);
  }

  async getSessions(
    userId: string,
    filter: ProgressPageFilter,
  ): Promise<ProgressPage<ProgressSessionFeedItem>> {
    const groups = new Map<
      string,
      { event: ProgressEventSnapshot; attribution: ProgressSkillAttribution }[]
    >();

    for (const item of await this.filteredEvents(userId, filter)) {
      const key = item.event.sourceSessionId
        ? `${item.event.sourceType}:${item.event.sourceSessionId}`
        : item.event.id;
      groups.set(key, [...(groups.get(key) ?? []), item]);
    }

    const items = [...groups.values()].map((group): ProgressSessionFeedItem => {
      const { event, attribution } = group[0];
      const metadata = group
        .map(
          (item) =>
            (
              item.event.gradingMetadata?.progress as
                { producerSession?: ProducerSessionMetadata } | undefined
            )?.producerSession,
        )
        .find((entry) => entry !== undefined);

      const postStudy = event.sourceType === 'LESSON_POST_STUDY';
      const tracks = new Set(group.map((item) => item.event.trackId));
      const units = new Set(group.map((item) => item.event.unitId));
      const correctCount = group.filter((item) => item.event.isCorrect).length;

      return {
        sourceType: event.sourceType,
        sourceSessionId: event.sourceSessionId,
        sessionStatus: postStudy ? 'COMPLETED' : (metadata?.status ?? 'UNKNOWN'),
        sessionTitle: postStudy
          ? attribution.lessonTitle
          : (metadata?.title ??
            (event.sourceType === 'FLASHCARD' ? 'Flashcard session' : 'Practice session')),
        trackSlug: tracks.size === 1 ? attribution.trackSlug : null,
        unitSlug: units.size === 1 ? attribution.unitSlug : null,
        startedAt: postStudy ? event.answeredAt : (metadata?.startedAt ?? null),
        completedAt: postStudy ? event.answeredAt : (metadata?.completedAt ?? null),
        lastActivityAt: event.answeredAt,
        totalInteractions: group.length,
        correctCount,
        incorrectCount: group.length - correctCount,
        averageScore: this.average(group.map((item) => item.event.numericScore)),
      };
    });

    return this.page(items, filter);
  }

  getLessonUnderstanding(userId: string, lessonId: string) {
    return this.repository.findLesson(userId, lessonId);
  }

  private async filteredEvents(userId: string, filter: ProgressPageFilter) {
    const [state, catalog] = await Promise.all([
      this.repository.readState(userId),
      this.catalog.getPublishedAttributions(),
    ]);
    const bySkill = new Map(catalog.map((entry) => [entry.skillId, entry]));

    return state.events
      .flatMap((event) => {
        const attribution = this.eventAttribution(event) ?? bySkill.get(event.skillId);
        if (
          !attribution ||
          (filter.trackSlug && attribution.trackSlug !== filter.trackSlug) ||
          (filter.sourceTypes && !filter.sourceTypes.includes(event.sourceType)) ||
          (filter.skillCodes && !filter.skillCodes.includes(attribution.skillCode))
        )
          return [];

        return [{ event, attribution }];
      })
      .sort(
        (a, b) =>
          b.event.answeredAt.localeCompare(a.event.answeredAt) ||
          b.event.id.localeCompare(a.event.id),
      );
  }

  private summarize(skills: SkillMasterySnapshot[]) {
    return {
      trackedSkillsCount: skills.length,
      masteredSkillsCount: skills.filter((entry) => entry.masteryState === 'MASTERED').length,
      averageMasteryScore: this.average(skills.map((entry) => entry.masteryScore)),
      lastActivityAt:
        skills
          .map((entry) => entry.lastActivityAt)
          .filter((entry): entry is string => entry !== null)
          .sort()
          .at(-1) ?? null,
    };
  }

  private eventAttribution(event: ProgressEventSnapshot): ProgressSkillAttribution | null {
    const metadata = event.gradingMetadata?.progress as
      { attribution?: Omit<ProgressSkillAttribution, 'postStudyQuestions'> } | undefined;
    const attribution = metadata?.attribution;

    return attribution &&
      attribution.skillId === event.skillId &&
      attribution.lessonId === event.lessonId &&
      attribution.unitId === event.unitId &&
      attribution.trackId === event.trackId
      ? { ...attribution, postStudyQuestions: [] }
      : null;
  }

  private average(values: number[]) {
    return values.length
      ? Math.round(
          (values.reduce((sum, value) => sum + value, 0) / values.length + Number.EPSILON) * 100,
        ) / 100
      : 0;
  }

  private page<T>(items: T[], filter: ProgressPageFilter): ProgressPage<T> {
    return {
      items: items.slice(filter.offset, filter.offset + filter.limit),
      totalRecords: items.length,
    };
  }

  private createEvent(
    request: RecordLearningEventRequest,
    attribution: Pick<ProgressEventSnapshot, 'lessonId' | 'unitId' | 'trackId'>,
  ): ProgressEventSnapshot {
    const event = new LearningEvent({
      id: request.eventId,
      userId: request.userId,
      skillId: request.skillId,
      lessonId: attribution.lessonId,
      unitId: attribution.unitId,
      trackId: attribution.trackId,
      sourceType: request.sourceType,
      sourceSessionId: request.sourceSessionId,
      sourceEntityId: request.sourceEntityId,
      questionType: request.questionType,
      isCorrect: request.isCorrect,
      numericScore: request.numericScore,
      confidenceWeight: request.confidenceWeight ?? null,
      responseTimeMs: request.responseTimeMs ?? null,
      answeredAt: request.answeredAt,
      gradingMetadata: null,
    }).snapshot;

    event.answeredAt = new Date(event.answeredAt).toISOString();

    // Retries compare the same DECIMAL(5,2) precision that MySQL persists.
    event.numericScore = Math.round((event.numericScore + Number.EPSILON) * 100) / 100;
    if (event.confidenceWeight !== null)
      event.confidenceWeight = Math.round((event.confidenceWeight + Number.EPSILON) * 100) / 100;

    return event;
  }

  private assertReplay(
    request: RecordLearningEventRequest,
    incoming: ProgressEventSnapshot,
    saved: ProgressEventSnapshot,
  ): void {
    const keys = [
      'userId',
      'skillId',
      'sourceType',
      'sourceSessionId',
      'sourceEntityId',
      'questionType',
      'isCorrect',
      'numericScore',
      'confidenceWeight',
      'responseTimeMs',
      'answeredAt',
    ] as const;

    const metadata = saved.gradingMetadata?.progress as { difficultyLevel?: number } | undefined;
    const postStudyMismatch =
      saved.sourceType === 'LESSON_POST_STUDY'
        ? request.postStudy?.questionId !== saved.sourceEntityId ||
          request.postStudy?.difficultyLevel !== metadata?.difficultyLevel
        : request.postStudy !== undefined;

    if (keys.some((key) => saved[key] !== incoming[key]) || postStudyMismatch)
      throw new InvalidProgressEvent(
        'Event id has already been used for a different learning interaction.',
      );
  }

  private lessonTransition(
    event: ProgressEventSnapshot,
  ): { before: number; after: number } | undefined {
    const metadata = event.gradingMetadata?.progress as
      { lessonTransition?: { before: number; after: number } } | undefined;

    return metadata?.lessonTransition;
  }

  private validateSessionMetadata(metadata: ProducerSessionMetadata | undefined) {
    if (!metadata) return;

    if (
      !metadata.status?.trim() ||
      !metadata.title?.trim() ||
      [metadata.startedAt, metadata.completedAt].some(
        (date) => date !== null && !Number.isFinite(Date.parse(date)),
      )
    )
      throw new InvalidProgressEvent('Producer session metadata is invalid.');
  }
}
