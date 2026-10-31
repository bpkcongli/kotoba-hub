import type { RequestHandler } from 'msw';
import { authHandlers } from './api/auth/auth.routes';
import { flashcardHandlers } from './api/flashcards/flashcards.routes';
import { onboardingHandlers } from './api/onboarding/onboarding.routes';
import { practiceHandlers } from './api/practice/practice.routes';
import { progressHandlers } from './api/progress/progress.routes';
import { syllabusHandlers } from './api/syllabus/syllabus.routes';

export const handlers: RequestHandler[] = [
  ...authHandlers,
  ...onboardingHandlers,
  ...syllabusHandlers,
  ...flashcardHandlers,
  ...practiceHandlers,
  ...progressHandlers,
];

export function isApplicationApiRequest(request: Request): boolean {
  const { pathname } = new URL(request.url);

  return pathname === '/api/v1' || pathname.startsWith('/api/v1/');
}
