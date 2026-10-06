import type { RequestHandler } from 'msw';

// Add contract-backed domain handlers as their implementation tasks land.
export const handlers: RequestHandler[] = [];

export function isApplicationApiRequest(request: Request): boolean {
  const { pathname } = new URL(request.url);
  return pathname === '/api/v1' || pathname.startsWith('/api/v1/');
}
