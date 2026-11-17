import { AuthorizationServiceImpl } from '@/backend/auth/application/services/impl/authorization.service.impl';
import { getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import { UserPreferencesServiceImpl } from '@/backend/users/application/services/impl/user-preferences.service.impl';
import { UserPreferencesController } from '@/backend/users/interface/primary/rest/user-preferences.controller';
import type { UserPreferences } from '@/shared/locale';

jest.mock('@/backend/auth/infrastructure/di', () => ({
  authorizationService: new (jest.requireActual(
    '@/backend/auth/application/services/impl/authorization.service.impl',
  ).AuthorizationServiceImpl)(),
  getSessionSnapshot: jest.fn(),
}));

const session = {
  isAuthenticated: true,
  sessionId: 'session',
  expiresAt: '2027-01-01T00:00:00Z',
  user: {
    id: 'user',
    email: 'a@test.local',
    displayName: 'Learner',
    avatarUrl: null,
    emailVerified: true,
  },
  authorization: { appAccess: 'ONBOARDING_REQUIRED' as const, onboardingCompleted: false },
};

let saved: UserPreferences | null;
const repository = {
  get: jest.fn(async () => saved),
  patch: jest.fn(
    async (_id: string, patch: Partial<UserPreferences>) =>
      (saved = { contentLocale: 'en', uiLocale: 'en', ...saved, ...patch }),
  ),
};

const controller = new UserPreferencesController(
  new UserPreferencesServiceImpl(repository),
  new AuthorizationServiceImpl(),
);

beforeEach(() => {
  saved = null;
  jest.clearAllMocks();
  jest.mocked(getSessionSnapshot).mockResolvedValue(session);
});

function request(body?: unknown, origin = 'http://localhost:3000') {
  return new Request('http://localhost:3000/api/v1/user-profile/preferences', {
    method: body === undefined ? 'GET' : 'PATCH',
    headers: { origin, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

test('GET returns defaults without writing and works before onboarding', async () => {
  const response = await controller.handle(request());

  expect(response.status).toBe(200);
  expect((await response.json()).data).toEqual({ contentLocale: 'en', uiLocale: 'en' });
  expect(repository.patch).not.toHaveBeenCalled();
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});

test('PATCH preserves omitted fields and does not require a learner profile', async () => {
  await controller.handle(request({ uiLocale: 'id' }));

  expect((await (await controller.handle(request({ contentLocale: 'id' }))).json()).data).toEqual({
    contentLocale: 'id',
    uiLocale: 'id',
  });
});

test.each([
  {},
  null,
  { contentLocale: null },
  { uiLocale: 'ja' },
  { contentLocale: 'id-ID' },
  { unknown: 'id' },
])('rejects invalid preference body %p', async (body) => {
  const response = await controller.handle(request(body));

  expect(response.status).toBe(422);
  expect((await response.json()).status.code).toBe(142202001);
  expect(repository.patch).not.toHaveBeenCalled();
});

test('checks same origin before reading session', async () => {
  const response = await controller.handle(request({ contentLocale: 'id' }, 'https://other.test'));

  expect(response.status).toBe(403);
  expect((await response.json()).status.code).toBe(140302001);
  expect(getSessionSnapshot).not.toHaveBeenCalled();
});
