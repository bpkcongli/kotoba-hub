import { http, HttpResponse } from 'msw';
import { anonymousSessionResponse } from '@tests/fixtures/anonymous-session';
import type { AppSession } from '@/frontend/shared/interfaces/entities';
import {
  createFeatureContainer,
  createFrontendContainer,
} from '@/frontend/shared/services/container';
import type { IAppSessionStore } from '@/frontend/shared/services/internal';
import { SHARED_TYPES } from '@/frontend/shared/services/types';
import { appReadySessionFixture } from '@/mocks/fixtures/session';
import { server } from '@/mocks/msw.node';
import { resetMockState } from '@/mocks/states/reset';
import { setMockSession } from '@/mocks/states/session';

const sessionUrl = 'http://localhost:3000/api/v1/auth/session';
const signOutUrl = 'http://localhost:3000/api/v1/auth/sign-out';

const readySession: AppSession = {
  isAuthenticated: true,
  sessionId: '660e8400-e29b-41d4-a716-446655440111',
  expiresAt: '2027-01-01T00:00:00Z',
  user: {
    id: '770e8400-e29b-41d4-a716-446655440222',
    email: 'learner@example.com',
    displayName: 'A learner',
    avatarUrl: null,
    emailVerified: true,
  },
  authorization: { appAccess: 'APP_READY', onboardingCompleted: true },
};

function createStore(session?: AppSession) {
  const container = createFrontendContainer({ bootstrap: session ? { session } : undefined });

  return container.get<IAppSessionStore>(SHARED_TYPES.AppSessionStore);
}

function deferred() {
  let resolve!: () => void;

  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

test('distinguishes an unknown session from an authoritative anonymous result', async () => {
  const requested = jest.fn(() => HttpResponse.json(anonymousSessionResponse()));
  server.use(http.get(sessionUrl, requested));

  const store = createStore();

  expect(store.snapshot).toBeNull();
  expect(requested).not.toHaveBeenCalled();

  await store.load();

  expect(store.snapshot?.authorization.appAccess).toBe('ANONYMOUS');
  expect(store.isLoading).toBe(false);
  expect(store.error).toBeNull();
  expect(requested).toHaveBeenCalledTimes(1);
});

test('resets the contract-backed session scenario independently of HTTP handlers', async () => {
  const store = createStore();

  setMockSession(appReadySessionFixture());

  await store.load();

  expect(store.snapshot?.authorization.appAccess).toBe('APP_READY');

  resetMockState();
  await store.load();

  expect(store.snapshot?.authorization.appAccess).toBe('ANONYMOUS');
});

test('bootstrap data remains isolated between root containers and is inherited only by its children', () => {
  const first = createFrontendContainer({ bootstrap: { session: readySession } });
  const second = createFrontendContainer();

  const firstStore = first.get<IAppSessionStore>(SHARED_TYPES.AppSessionStore);
  const secondStore = second.get<IAppSessionStore>(SHARED_TYPES.AppSessionStore);
  const child = createFeatureContainer({ parentContainer: first });

  expect(first.get(SHARED_TYPES.AppSessionStore)).toBe(firstStore);
  expect(child.get(SHARED_TYPES.AppSessionStore)).toBe(firstStore);
  expect(secondStore).not.toBe(firstStore);
  expect(firstStore.snapshot?.user?.id).toBe(readySession.user?.id);
  expect(secondStore.snapshot).toBeNull();

  firstStore.hydrate(anonymousSessionResponse().data as AppSession);

  expect(secondStore.snapshot).toBeNull();
  expect(readySession.isAuthenticated).toBe(true);
});

test('keeps the current session when a refresh response violates the contract', async () => {
  server.use(
    http.get(sessionUrl, () =>
      HttpResponse.json({
        status: anonymousSessionResponse().status,
        data: {
          ...readySession,
          authorization: { appAccess: 'APP_READY', onboardingCompleted: false },
        },
      }),
    ),
  );

  const store = createStore(readySession);

  await store.load();

  expect(store.snapshot?.isAuthenticated).toBe(true);
  expect(store.error?.code).toBe('contract');
  expect(store.isLoading).toBe(false);
});

test('hydration cancels an older refresh without replacing the new identity', async () => {
  const started = deferred();
  const released = deferred();

  server.use(
    http.get(sessionUrl, async () => {
      started.resolve();

      await released.promise;

      return HttpResponse.json(anonymousSessionResponse());
    }),
  );

  const store = createStore();

  const loading = store.load();
  await started.promise;

  store.hydrate(readySession);
  released.resolve();
  await loading;

  expect(store.snapshot?.user?.id).toBe(readySession.user?.id);
  expect(store.error).toBeNull();
  expect(store.isLoading).toBe(false);
});

test('dispose suppresses late refreshes and allows a subsequent lifecycle load', async () => {
  const started = deferred();
  const released = deferred();

  server.use(
    http.get(sessionUrl, async () => {
      started.resolve();

      await released.promise;

      return HttpResponse.json(anonymousSessionResponse());
    }),
  );

  const store = createStore(readySession);

  const loading = store.load();
  await started.promise;

  store.dispose();
  store.dispose();

  released.resolve();
  await loading;

  expect(store.snapshot?.isAuthenticated).toBe(true);
  expect(store.error).toBeNull();
  expect(store.isLoading).toBe(false);

  server.use(http.get(sessionUrl, () => HttpResponse.json(anonymousSessionResponse())));

  await store.load();

  expect(store.snapshot?.authorization.appAccess).toBe('ANONYMOUS');
});

test('preserves identity after failed sign-out and clears it only after confirmed success', async () => {
  const store = createStore(readySession);

  server.use(
    http.post(signOutUrl, () =>
      HttpResponse.json(
        {
          status: {
            traceId: '550e8400-e29b-41d4-a716-446655440009',
            code: 150001999,
            message: 'Could not end the session. Please try again.',
            errorDetails: [],
          },
        },
        { status: 500 },
      ),
    ),
  );

  await expect(store.signOut()).resolves.toBe(false);

  expect(store.snapshot?.isAuthenticated).toBe(true);
  expect(store.error?.traceId).toBe('550e8400-e29b-41d4-a716-446655440009');
  expect(store.isSigningOut).toBe(false);

  server.use(
    http.post(signOutUrl, () => HttpResponse.json({ status: anonymousSessionResponse().status })),
  );

  await expect(store.signOut()).resolves.toBe(true);

  expect(store.snapshot?.authorization.appAccess).toBe('ANONYMOUS');
  expect(store.snapshot?.user).toBeNull();
  expect(store.error).toBeNull();
});
