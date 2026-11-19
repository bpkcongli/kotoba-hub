import type {
  DifficultyBand,
  ProgressEventSnapshot,
  SkillMasterySnapshot,
} from '@/backend/progress/domain/repositories/progress.repository';

export class MasteryCalculator {
  calculate(
    history: ProgressEventSnapshot[],
    previousBand: DifficultyBand = 'STANDARD',
    incomingEventId?: string,
    vocabularyItemIds?: string[],
  ): SkillMasterySnapshot {
    if (vocabularyItemIds)
      return this.calculateGroup(history, previousBand, incomingEventId, vocabularyItemIds);

    const ordered = [...history].sort(
      (a, b) => b.answeredAt.localeCompare(a.answeredAt) || b.id.localeCompare(a.id),
    );
    const window = ordered.slice(0, 20).reverse();
    if (!window.length) throw new RangeError('Mastery requires at least one attempt.');

    const size = window.length;
    const accuracyScore = window.reduce((sum, event) => sum + event.numericScore, 0) / size;

    const recencyScore =
      window.reduce((sum, event, index) => sum + event.numericScore * (index + 1), 0) /
      ((size * (size + 1)) / 2);

    const confidenceScore =
      window.reduce((sum, event) => sum + (event.confidenceWeight ?? 0.5) * 100, 0) / size;

    const masteryScore = this.round(
      accuracyScore * 0.7 + recencyScore * 0.2 + confidenceScore * 0.1,
    );

    const sessions = new Set<string>();
    const evidence: number[] = [];

    for (const event of ordered) {
      if (!event.sourceSessionId) continue;

      const key = `${event.sourceType}:${event.sourceSessionId}`;
      if (sessions.has(key)) continue;
      sessions.add(key);

      const progress = event.gradingMetadata?.progress as
        { masteryScoreAfter?: number } | undefined;
      const score =
        event.id === (incomingEventId ?? ordered[0].id)
          ? masteryScore
          : progress?.masteryScoreAfter;

      if (score === undefined) break;

      evidence.push(score);
      if (evidence.length === 2) break;
    }

    let recommendedDifficultyBand = previousBand;
    if (evidence.length === 2 && evidence.every((score) => score >= 80))
      recommendedDifficultyBand = 'STRETCH';
    else if (evidence.length === 2 && evidence.every((score) => score <= 50))
      recommendedDifficultyBand = 'REMEDIAL';

    return {
      userId: ordered[0].userId,
      skillId: ordered[0].skillId,
      lastProgressEventId: ordered[0].id,
      masteryScore,
      accuracyScore: this.round(accuracyScore),
      recencyScore: this.round(recencyScore),
      confidenceScore: this.round(confidenceScore),
      attemptsWindowSize: size,
      correctAttemptsCount: window.filter((event) => event.isCorrect).length,
      masteryState:
        masteryScore <= 50
          ? 'WEAK'
          : masteryScore < 80
            ? 'DEVELOPING'
            : masteryScore < 90
              ? 'STABLE'
              : 'MASTERED',
      recommendedDifficultyBand,
      lastActivityAt: ordered[0].answeredAt,
    };
  }

  private calculateGroup(
    history: ProgressEventSnapshot[],
    previousBand: DifficultyBand,
    incomingEventId: string | undefined,
    itemIds: string[],
  ): SkillMasterySnapshot {
    if (!itemIds.length || new Set(itemIds).size !== itemIds.length)
      throw new RangeError('Vocabulary mastery requires distinct member item IDs.');

    const eligible = history.filter(
      (event) =>
        event.sourceType === 'FLASHCARD' &&
        itemIds.includes(String(event.gradingMetadata?.flashcardItemId)),
    );

    const base = this.calculate(eligible, previousBand, incomingEventId);

    const itemScores = itemIds.map((id) => {
      const attempts = eligible.filter((event) => event.gradingMetadata?.flashcardItemId === id);

      return attempts.length ? this.calculate(attempts) : null;
    });

    const mean = (key: 'masteryScore' | 'accuracyScore' | 'recencyScore' | 'confidenceScore') =>
      this.round(itemScores.reduce((sum, score) => sum + (score?.[key] ?? 0), 0) / itemIds.length);
    const masteryScore = mean('masteryScore');

    // Band evidence must use group scores; the incoming score is not the single-item baseline.
    const adjusted = eligible.map((event) =>
      event.id === (incomingEventId ?? base.lastProgressEventId)
        ? {
            ...event,
            gradingMetadata: {
              ...event.gradingMetadata,
              progress: { masteryScoreAfter: masteryScore },
            },
          }
        : event,
    );

    const sessions = new Set<string>();
    const evidence: number[] = [];

    for (const event of [...adjusted].sort(
      (a, b) => b.answeredAt.localeCompare(a.answeredAt) || b.id.localeCompare(a.id),
    )) {
      if (!event.sourceSessionId || sessions.has(event.sourceSessionId)) continue;

      sessions.add(event.sourceSessionId);

      const score = (event.gradingMetadata?.progress as { masteryScoreAfter?: number } | undefined)
        ?.masteryScoreAfter;

      if (score === undefined) break;

      evidence.push(score);
      if (evidence.length === 2) break;
    }

    let band = previousBand;

    if (evidence.length === 2 && evidence.every((score) => score <= 50)) band = 'REMEDIAL';
    else if (
      itemScores.every(Boolean) &&
      evidence.length === 2 &&
      evidence.every((score) => score >= 80)
    )
      band = 'STRETCH';

    return {
      ...base,
      masteryScore,
      accuracyScore: mean('accuracyScore'),
      recencyScore: mean('recencyScore'),
      confidenceScore: mean('confidenceScore'),
      masteryState:
        masteryScore <= 50
          ? 'WEAK'
          : masteryScore < 80
            ? 'DEVELOPING'
            : masteryScore < 90
              ? 'STABLE'
              : 'MASTERED',
      recommendedDifficultyBand: band,
    };
  }

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
