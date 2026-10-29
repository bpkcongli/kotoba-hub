import type { AppSession } from '@/frontend/shared/interfaces/entities';
import { anonymousSessionFixture } from '@/mocks/fixtures/session';
import { registerMockStateReset } from './reset';

let session = anonymousSessionFixture();

export function getMockSession(): AppSession {
  return structuredClone(session);
}

export function setMockSession(next: AppSession): void {
  session = structuredClone(next);
}

export function resetMockSession(): void {
  session = anonymousSessionFixture();
}

registerMockStateReset(resetMockSession);
