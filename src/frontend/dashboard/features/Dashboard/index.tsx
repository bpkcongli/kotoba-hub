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
          Lessons, flashcards, practice, and progress will come together here.
        </p>
      </section>

      <EmptyStatePanel
        title="Learning activities are not available yet"
        description="Your learning tools will appear here as they become available. You can manage your session from the account menu above."
      />
    </div>
  );
}
