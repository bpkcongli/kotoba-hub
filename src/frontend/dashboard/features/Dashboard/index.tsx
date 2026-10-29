import Link from 'next/link';
import { Button } from '@/frontend/shared/components/atoms';
import { EmptyStatePanel } from '@/frontend/shared/components/organisms';

export function Dashboard() {
  return (
    <div className="max-w-reading space-y-8">
      <section aria-labelledby="dashboard-heading" className="space-y-3">
        <p className="text-body-sm font-medium text-muted-foreground">Your Japanese study space</p>
        <h1 id="dashboard-heading" className="text-h2 font-bold tracking-tight md:text-h1">
          Make room for your next step.
        </h1>
        <p className="text-body text-muted-foreground">
          Read a lesson, then continue to its required post-study quiz.
        </p>
      </section>

      <EmptyStatePanel
        title="Choose your next lesson"
        description="Open the published syllabus to browse units and read lesson material."
        action={
          <Button asChild>
            <Link href="/syllabus">View syllabus</Link>
          </Button>
        }
      />
    </div>
  );
}
