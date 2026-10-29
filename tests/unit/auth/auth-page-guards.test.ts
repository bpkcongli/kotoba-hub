import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import AppReadyLayout from '@/app/(app)/(ready)/layout';
import AuthenticatedLayout from '@/app/(app)/layout';
import OnboardingPage from '@/app/(app)/onboarding/page';
import LoginPage from '@/app/(auth)/login/page';
import { getSessionSnapshot } from '@/backend/auth/infrastructure/di';
import {
  anonymousSessionFixture,
  appReadySessionFixture,
  onboardingSessionFixture,
} from '@/mocks/fixtures/session';

jest.mock('next/headers', () => ({ headers: jest.fn() }));
jest.mock('next/navigation', () => ({ redirect: jest.fn() }));
jest.mock('@/backend/auth/infrastructure/di', () => ({ getSessionSnapshot: jest.fn() }));
jest.mock('@/frontend/auth/features', () => ({ Login: () => null }));
jest.mock('@/frontend/auth/components/organisms', () => ({ OnboardingWorkspace: () => null }));
jest.mock('@/frontend/onboarding/features', () => ({ Onboarding: () => null }));
jest.mock('@/frontend/shared/components/layouts', () => ({ AppWorkspace: () => null }));
jest.mock('@/frontend/shared/providers', () => ({ AppSessionBootstrap: () => null }));

beforeEach(() => {
  jest.replaceProperty(process, 'env', {
    ...process.env,
    AUTH_URL: 'http://localhost:3000',
    NODE_ENV: 'test',
  });
  jest.mocked(getSessionSnapshot).mockReset();
  jest.mocked(headers).mockResolvedValue(new Headers({ cookie: 'authjs.session-token=test' }));
  jest.mocked(redirect).mockImplementation((path) => {
    throw new Error(`redirect:${path}`);
  });
});

test('anonymous visitors cannot render onboarding or app pages', async () => {
  jest.mocked(getSessionSnapshot).mockResolvedValue(anonymousSessionFixture());

  for (const page of [
    OnboardingPage,
    () => AuthenticatedLayout({ children: null }),
    () => AppReadyLayout({ children: null }),
  ]) {
    await expect(page()).rejects.toThrow('redirect:/login');
  }

  expect(getSessionSnapshot).toHaveBeenCalledWith('authjs.session-token=test');
});

test('incomplete profiles go from login and app-ready pages to onboarding', async () => {
  jest.mocked(getSessionSnapshot).mockResolvedValue(onboardingSessionFixture());

  await expect(LoginPage({ searchParams: Promise.resolve({}) })).rejects.toThrow(
    'redirect:/onboarding',
  );
  await expect(AppReadyLayout({ children: null })).rejects.toThrow('redirect:/onboarding');
  await expect(OnboardingPage()).resolves.toBeDefined();
});

test('completed onboarding cannot restart the wizard', async () => {
  jest.mocked(getSessionSnapshot).mockResolvedValue(appReadySessionFixture());

  await expect(OnboardingPage()).rejects.toThrow('redirect:/dashboard');
});

test.each([
  'https://external.example',
  '//external.example',
  '/\\external.example',
  '/login',
  '/onboarding',
  '/login/',
])('login rejects unsafe or looping return path %s', async (redirectTo) => {
  jest.mocked(getSessionSnapshot).mockResolvedValue(appReadySessionFixture());

  await expect(LoginPage({ searchParams: Promise.resolve({ redirectTo }) })).rejects.toThrow(
    'redirect:/dashboard',
  );
});

test('login preserves an application return path for an existing completed profile', async () => {
  jest.mocked(getSessionSnapshot).mockResolvedValue(appReadySessionFixture());

  await expect(
    LoginPage({ searchParams: Promise.resolve({ redirectTo: '/dashboard?from=login' }) }),
  ).rejects.toThrow('redirect:/dashboard?from=login');
});

test.each([
  ['http://localhost:3012', 'development'],
  ['https://learn.example.com', 'production'],
] as const)(
  'login uses configured origin %s while retaining relative redirects',
  async (authUrl, nodeEnv) => {
    jest.replaceProperty(process, 'env', { ...process.env, AUTH_URL: authUrl, NODE_ENV: nodeEnv });
    jest
      .mocked(headers)
      .mockResolvedValue(
        new Headers({ host: 'untrusted.example', 'x-forwarded-host': 'untrusted.example' }),
      );
    jest.mocked(getSessionSnapshot).mockResolvedValue(appReadySessionFixture());

    await expect(
      LoginPage({ searchParams: Promise.resolve({ redirectTo: '/dashboard?from=login' }) }),
    ).rejects.toThrow('redirect:/dashboard?from=login');
  },
);

test('login rejects an invalid configured origin', async () => {
  jest.replaceProperty(process, 'env', {
    ...process.env,
    AUTH_URL: 'https://learn.example.com/path',
  });

  await expect(LoginPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('AUTH_URL');
  expect(getSessionSnapshot).not.toHaveBeenCalled();
});
