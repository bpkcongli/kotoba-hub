import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { observer } from 'mobx-react-lite';
import { http, HttpResponse } from 'msw';
import { useState } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { UiLanguage } from '@/frontend/shared/components/organisms/UiLanguage';
import { useLocaleStore, useUiTranslations } from '@/frontend/shared/hooks';
import { anonymousAppSession } from '@/frontend/shared/interfaces/entities';
import { FrontendContainerProvider } from '@/frontend/shared/providers';
import { createFrontendContainer, SHARED_TYPES } from '@/frontend/shared/services';
import type { ILocaleService } from '@/frontend/shared/services/external';
import { LocaleStore } from '@/frontend/shared/services/internal/impl/LocaleStore';
import { appReadySessionFixture } from '@/mocks/fixtures/session';
import { server } from '@/mocks/msw.node';
import { setMockSession } from '@/mocks/states/session';
import type { UserPreferences } from '@/shared/locale';

const refresh = jest.fn();

jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

const root = 'http://localhost:3000/api/v1';

const Probe = observer(function Probe() {
  const t = useUiTranslations();

  const locale = useLocaleStore();
  const [answer, setAnswer] = useState('');

  return (
    <>
      <UiLanguage />

      <h1>{t('SHARED:APP_WORKSPACE.PAGE.TITLE')}</h1>

      <p data-testid="content-locale">{locale.preferences.contentLocale}</p>

      <input
        aria-label="Pending answer"
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
      />

      <p lang="ja">日本語</p>
    </>
  );
});

beforeEach(() => {
  refresh.mockClear();

  document.cookie = 'kotobahub-ui-locale=; Max-Age=0; Path=/';
});

afterEach(() => {
  document.cookie = 'kotobahub-ui-locale=; Max-Age=0; Path=/';
  document.documentElement.lang = 'en';
});

function envelope(data: UserPreferences) {
  return {
    status: {
      code: 120002000,
      traceId: crypto.randomUUID(),
      message: 'Success!',
      errorDetails: [],
    },
    data,
  };
}

test('anonymous SSR and hydration share the same locale; switching uses the cookie without a profile write', async () => {
  let writes = 0;

  server.use(
    http.patch(`${root}/user-profile/preferences`, () => {
      writes++;

      return new HttpResponse(null, { status: 500 });
    }),
  );

  const bootstrap = {
    session: anonymousAppSession(),
    preferences: { uiLocale: 'id' as const, contentLocale: 'en' as const },
  };

  const tree = (
    <FrontendContainerProvider bootstrap={bootstrap}>
      <Probe />
    </FrontendContainerProvider>
  );

  const container = document.createElement('div');
  container.innerHTML = renderToString(tree);
  document.body.append(container);

  expect(container.querySelector('h1')).toHaveTextContent('Ruang belajarmu');

  const errors: unknown[] = [];
  let hydration: ReturnType<typeof hydrateRoot>;

  await act(async () => {
    hydration = hydrateRoot(container, tree, { onRecoverableError: (error) => errors.push(error) });
  });

  expect(errors).toEqual([]);
  expect(document.documentElement.lang).toBe('id');

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Bahasa antarmuka' }), 'en');

  expect(screen.getByRole('heading', { name: 'Your study space' })).toBeInTheDocument();
  expect(document.cookie).toContain('kotobahub-ui-locale=en');
  expect(document.documentElement.lang).toBe('en');
  expect(screen.getByText('日本語')).toHaveAttribute('lang', 'ja');
  expect(writes).toBe(0);
  expect(refresh).toHaveBeenCalledTimes(1);

  await act(async () => hydration!.unmount());
  container.remove();
});

test('an authenticated language switch persists only uiLocale, retains contentLocale and keeps the pending answer mounted', async () => {
  const session = appReadySessionFixture();
  setMockSession(session);
  document.cookie = 'kotobahub-ui-locale=en; Path=/';

  const seen: unknown[] = [];

  server.use(
    http.patch(`${root}/user-profile/preferences`, async ({ request }) => {
      seen.push({ body: await request.json(), header: request.headers.get('X-UI-Locale') });

      return HttpResponse.json(envelope({ uiLocale: 'en', contentLocale: 'id' }));
    }),
  );

  render(
    <FrontendContainerProvider
      bootstrap={{ session, preferences: { uiLocale: 'id', contentLocale: 'id' } }}>
      <Probe />
    </FrontendContainerProvider>,
  );

  expect(screen.getByRole('heading', { name: 'Ruang belajarmu' })).toBeInTheDocument();

  const input = screen.getByRole('textbox', { name: 'Pending answer' });

  await userEvent.type(input, 'nihongo');

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Bahasa antarmuka' }), 'en');
  await screen.findByRole('heading', { name: 'Your study space' });

  expect(seen).toEqual([{ body: { uiLocale: 'en' }, header: 'id' }]);
  expect(screen.getByTestId('content-locale')).toHaveTextContent('id');
  expect(screen.getByRole('textbox', { name: 'Pending answer' })).toBe(input);
  expect(input).toHaveValue('nihongo');
});

test('a failed save keeps the previous language and cookie and offers a localized retry message', async () => {
  const session = appReadySessionFixture();
  setMockSession(session);
  document.cookie = 'kotobahub-ui-locale=id; Path=/';

  server.use(
    http.patch(`${root}/user-profile/preferences`, () =>
      HttpResponse.json(
        {
          status: {
            code: 150002999,
            traceId: 'trace',
            message: 'Server failure.',
            errorDetails: [],
          },
        },
        { status: 500 },
      ),
    ),
  );

  render(
    <FrontendContainerProvider
      bootstrap={{ session, preferences: { uiLocale: 'id', contentLocale: 'en' } }}>
      <Probe />
    </FrontendContainerProvider>,
  );

  await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Bahasa antarmuka' }), 'en');

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Bahasa belum dapat disimpan. Silakan coba lagi.',
  );
  expect(screen.getByRole('combobox', { name: 'Bahasa antarmuka' })).toHaveValue('id');
  expect(document.cookie).toContain('kotobahub-ui-locale=id');
});

test('a disposed locale write cannot replace a refreshed bootstrap or write a cookie', async () => {
  let resolve!: (preferences: UserPreferences) => void;
  const patch = jest.fn<Promise<UserPreferences>, [Partial<UserPreferences>, AbortSignal?]>(
    () =>
      new Promise<UserPreferences>((done) => {
        resolve = done;
      }),
  );

  const store = new LocaleStore({ patch, get: jest.fn() });
  const saving = store.setUiLocale('id', true);

  store.hydrate({ uiLocale: 'en', contentLocale: 'en' }, false);

  resolve({ uiLocale: 'id', contentLocale: 'id' });
  await saving;

  expect(patch.mock.calls[0][1]?.aborted).toBe(true);
  expect(store.preferences).toEqual({ uiLocale: 'en', contentLocale: 'en' });
  expect(document.cookie).not.toContain('kotobahub-ui-locale=');
});

test('the HTTP locale header is read from the current container for each request', async () => {
  const session = appReadySessionFixture();
  setMockSession(session);

  const seen: (string | null)[] = [];

  server.use(
    http.get(`${root}/user-profile/preferences`, ({ request }) => {
      seen.push(request.headers.get('X-UI-Locale'));

      return HttpResponse.json(envelope({ uiLocale: 'en', contentLocale: 'en' }));
    }),
  );

  const container = createFrontendContainer({
    bootstrap: { session, preferences: { uiLocale: 'id', contentLocale: 'en' } },
  });
  const service = container.get<ILocaleService>(SHARED_TYPES.LocaleService);

  await service.get();

  container
    .get<LocaleStore>(SHARED_TYPES.LocaleStore)
    .hydrate({ uiLocale: 'en', contentLocale: 'en' }, false);

  await service.get();

  expect(seen).toEqual(['id', 'en']);

  await container.unbindAll();
});
