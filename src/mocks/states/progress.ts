import type {
  ProgressEvent,
  ProgressOverview,
  ProgressSession,
} from '@/frontend/progress/interfaces/entities';
import { syllabusLessonFixture } from '@/mocks/fixtures/syllabus';
import { registerMockStateReset } from './reset';

interface MockProgressRecord {
  ownerId: string;
  event: ProgressEvent;

  mastery: { masteryScore: number; masteryState: string; recommendedDifficultyBand: string };

  session: Pick<ProgressSession, 'sessionStatus' | 'sessionTitle' | 'startedAt' | 'completedAt'>;
}

const records = new Map<string, MockProgressRecord>();
const understanding = new Map<string, { ownerId: string; lessonSlug: string; level: number }>();

export function recordMockProgress(record: MockProgressRecord) {
  records.set(record.event.id, structuredClone(record));
}

export function setMockProgressUnderstanding(ownerId: string, lessonSlug: string, level: number) {
  understanding.set(JSON.stringify([ownerId, lessonSlug]), { ownerId, lessonSlug, level });
}

export function mockProgressRecords(ownerId: string, trackSlug?: string) {
  return [...records.values()]
    .filter(
      (record) =>
        record.ownerId === ownerId && (!trackSlug || record.event.trackSlug === trackSlug),
    )
    .sort(
      (a, b) =>
        b.event.answeredAt.localeCompare(a.event.answeredAt) ||
        b.event.id.localeCompare(a.event.id),
    );
}

export function mockProgressOverview(ownerId: string, trackSlug?: string): ProgressOverview {
  const current = mockProgressRecords(ownerId, trackSlug);
  const latest = new Map<string, MockProgressRecord>();

  for (const record of current)
    if (!latest.has(record.event.skillCode)) latest.set(record.event.skillCode, record);

  const snapshots = [...latest.values()];

  const lesson = syllabusLessonFixture();
  const lessons = [...understanding.values()].filter(
    (value) => value.ownerId === ownerId && (!trackSlug || trackSlug === lesson.track.slug),
  );

  const average = (values: number[]) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const mastered = (values: MockProgressRecord[]) =>
    values.filter((value) => value.mastery.masteryState === 'MASTERED').length;
  const bands = snapshots.map((value) => value.mastery.recommendedDifficultyBand);

  return {
    trackedSkillsCount: snapshots.length,
    masteredSkillsCount: mastered(snapshots),
    developingSkillsCount: snapshots.filter((value) =>
      ['DEVELOPING', 'STABLE'].includes(value.mastery.masteryState),
    ).length,
    weakSkillsCount: snapshots.filter((value) => value.mastery.masteryState === 'WEAK').length,
    averageMasteryScore: average(snapshots.map((value) => value.mastery.masteryScore)),
    recommendedDifficultyBand: bands.includes('REMEDIAL')
      ? 'REMEDIAL'
      : bands.includes('STANDARD') || !bands.length
        ? 'STANDARD'
        : 'STRETCH',
    lastActivityAt: current[0]?.event.answeredAt ?? null,
    lessonUnderstandingSummary: {
      trackedLessonsCount: lessons.length,
      completedLessonsCount: lessons.filter((value) => value.level >= 1).length,
      averageUnderstandingLevel: average(lessons.map((value) => value.level)),
      maxUnderstandingLevel: 10,
    },

    trackSummaries: [...new Set(snapshots.map((value) => value.event.trackSlug))].map((slug) => {
      const trackSkills = snapshots.filter((value) => value.event.trackSlug === slug);

      return {
        trackSlug: slug,
        trackTitle: lesson.track.title,
        trackedSkillsCount: trackSkills.length,
        masteredSkillsCount: mastered(trackSkills),
        averageMasteryScore: average(trackSkills.map((value) => value.mastery.masteryScore)),
        lastActivityAt: trackSkills[0]?.event.answeredAt ?? null,
      };
    }),
  };
}

export function mockProgressSessions(current: MockProgressRecord[]): ProgressSession[] {
  const groups = new Map<string, MockProgressRecord[]>();

  for (const record of current) {
    const key = `${record.event.sourceType}:${record.event.sourceSessionId ?? record.event.id}`;

    groups.set(key, [...(groups.get(key) ?? []), record]);
  }

  return [...groups.values()].map((group) => {
    const latest = group[0]!;
    const event = latest.event;

    return {
      sourceType: event.sourceType,
      sourceSessionId: event.sourceSessionId,
      ...latest.session,
      trackSlug: group.every((value) => value.event.trackSlug === event.trackSlug)
        ? event.trackSlug
        : null,
      unitSlug: group.every((value) => value.event.unitSlug === event.unitSlug)
        ? event.unitSlug
        : null,
      lastActivityAt: event.answeredAt,
      totalInteractions: group.length,
      correctCount: group.filter((value) => value.event.isCorrect).length,
      incorrectCount: group.filter((value) => !value.event.isCorrect).length,
      averageScore: group.reduce((sum, value) => sum + value.event.numericScore, 0) / group.length,
    };
  });
}

export function resetProgressMockState() {
  records.clear();
  understanding.clear();
}

registerMockStateReset(resetProgressMockState);
