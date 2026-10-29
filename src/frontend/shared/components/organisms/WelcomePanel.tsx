import { ArrowDown } from 'lucide-react';
import { Button } from '@/frontend/shared/components/atoms';
import { AppFooter, AppShell, PublicHeader } from '@/frontend/shared/components/layouts';

const learningSteps = [
  {
    title: 'Follow a clear path',
    description: 'Build your foundations with a structured JLPT syllabus.',
  },
  {
    title: 'Put learning into practice',
    description: 'Revisit what you learn with flashcards and focused questions.',
  },
  {
    title: 'See your understanding grow',
    description: 'Use feedback to find what to review and where to go next.',
  },
];

export function WelcomePanel() {
  return (
    <AppShell variant="public" header={<PublicHeader />} footer={<AppFooter />}>
      <div className="py-4 md:py-8">
        <section aria-labelledby="welcome-heading" className="max-w-reading">
          <p className="mb-4 text-body-sm font-semibold text-muted-foreground">
            A calmer way to learn Japanese
          </p>
          <h1
            id="welcome-heading"
            className="max-w-xl text-h1 font-bold tracking-tight md:text-display">
            Small steps. Stronger understanding.
          </h1>
          <p className="mt-6 max-w-xl text-body-lg text-muted-foreground">
            A study space for your Japanese journey, bringing lessons, practice, and progress
            together.
          </p>
          <Button asChild className="mt-8">
            <a href="#learning-approach">
              Explore the learning approach
              <ArrowDown aria-hidden="true" />
            </a>
          </Button>
          <p className="mt-4 text-body-sm text-muted-foreground">
            KotobaHub is taking shape. Learning features are coming soon.
          </p>
        </section>

        <section
          id="learning-approach"
          aria-labelledby="approach-heading"
          className="mt-16 scroll-mt-8 border-t border-border-subtle pt-8">
          <h2 id="approach-heading" className="text-h2 font-semibold">
            A little structure for every step
          </h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {learningSteps.map((step, index) => (
              <li key={step.title}>
                <span
                  aria-hidden="true"
                  className="mb-4 flex size-11 items-center justify-center rounded-md bg-secondary text-body-sm font-semibold">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className="text-h3 font-semibold">{step.title}</h3>
                <p className="mt-3 text-body text-muted-foreground">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </AppShell>
  );
}
