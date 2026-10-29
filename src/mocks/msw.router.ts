import type { RequestHandler } from 'msw';
import { authHandlers } from './api/auth/auth.routes';
import { onboardingHandlers } from './api/onboarding/onboarding.routes';

export const handlers: RequestHandler[] = [...authHandlers, ...onboardingHandlers];

export function isApplicationApiRequest(request: Request): boolean {
  const { pathname } = new URL(request.url);

  return pathname === '/api/v1' || pathname.startsWith('/api/v1/');
}
