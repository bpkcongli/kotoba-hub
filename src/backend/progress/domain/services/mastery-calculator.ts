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
  ): SkillMasterySnapshot {
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

  private round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }
}
