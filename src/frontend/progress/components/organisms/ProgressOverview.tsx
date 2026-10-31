import Link from 'next/link';
import { difficultyLabel, progressNumber, progressTime } from '@/frontend/progress/helpers';
import type { ProgressOverview as Overview } from '@/frontend/progress/interfaces/entities';
import { Button, Progress } from '@/frontend/shared/components/atoms';

export function ProgressOverview({ overview }: { overview: Overview }) {
  const lessons = overview.lessonUnderstandingSummary;

  return (
    <section
      aria-labelledby="progress-overview-title"
      className="space-y-6 rounded-md border bg-card p-5 sm:p-8">
      <div className="space-y-2">
        <h2 id="progress-overview-title" className="text-h3 font-semibold">
          Your learning so far
        </h2>

        <p className="text-body-sm text-muted-foreground">
          Last activity:{' '}
          {overview.lastActivityAt ? progressTime(overview.lastActivityAt) : 'No activity yet'}
        </p>
      </div>

      <dl className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <dt className="text-body-sm text-muted-foreground">Average skill mastery</dt>
          <dd className="text-h2 font-semibold">
            {overview.trackedSkillsCount
              ? `${progressNumber(overview.averageMasteryScore)}/100`
              : 'No attempts yet'}
          </dd>

          <Progress label="Average skill mastery" value={overview.averageMasteryScore} />

          <p className="text-caption text-muted-foreground">
            Across {overview.trackedSkillsCount} tracked skills
          </p>
        </div>

        <div className="space-y-2">
          <dt className="text-body-sm text-muted-foreground">Lessons completed</dt>
          <dd className="text-h2 font-semibold">
            {lessons.completedLessonsCount} of {lessons.trackedLessonsCount} tracked
          </dd>

          <p className="text-caption text-muted-foreground">
            A correct post-study answer completes a lesson.
          </p>
        </div>

        <div className="space-y-2">
          <dt className="text-body-sm text-muted-foreground">Average lesson understanding</dt>
          <dd className="text-h2 font-semibold">
            {lessons.trackedLessonsCount
              ? `${progressNumber(lessons.averageUnderstandingLevel)} of 10`
              : 'No quiz attempts yet'}
          </dd>

          <Progress
            label="Average lesson understanding"
            value={lessons.averageUnderstandingLevel}
            max={10}
          />

          <p className="text-caption text-muted-foreground">
            Lesson understanding is separate from skill mastery.
          </p>
        </div>
      </dl>

      <div className="space-y-3 border-t border-border-subtle pt-5">
        <h3 className="font-semibold">Skill mastery groups</h3>

        <dl className="flex flex-wrap gap-x-6 gap-y-3 text-body-sm">
          <div>
            <dt className="inline">Mastered: </dt>
            <dd className="inline font-semibold">{overview.masteredSkillsCount}</dd>
          </div>

          <div>
            <dt className="inline">Developing: </dt>
            <dd className="inline font-semibold">{overview.developingSkillsCount}</dd>
          </div>

          <div>
            <dt className="inline">Weak: </dt>
            <dd className="inline font-semibold">{overview.weakSkillsCount}</dd>
          </div>
        </dl>

        <p className="text-body-sm text-muted-foreground">
          Recommended practice difficulty: {difficultyLabel(overview.recommendedDifficultyBand)}
        </p>
      </div>
    </section>
  );
}

export function WeakSkillAction({ overview }: { overview: Overview }) {
  return (
    <section
      aria-labelledby="weak-skills-title"
      className="space-y-3 rounded-md border bg-card p-5 sm:p-8">
      <h2 id="weak-skills-title" className="text-h3 font-semibold">
        {overview.weakSkillsCount ? 'Skills to strengthen' : 'Keep practicing'}
      </h2>

      <p>
        {overview.weakSkillsCount
          ? `${overview.weakSkillsCount} tracked skills need more practice. Your next practice session uses your latest progress.`
          : 'Practice builds evidence for your skill mastery. Review lesson material when you need a refresher.'}
      </p>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/practice">Start practice</Link>
        </Button>

        <Button asChild variant="secondary">
          <Link href="/flashcards">Review flashcards</Link>
        </Button>
      </div>
    </section>
  );
}
