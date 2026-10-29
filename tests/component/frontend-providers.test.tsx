import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Container } from 'inversify';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { http, HttpResponse } from 'msw';
import { StrictMode } from 'react';
import { anonymousSessionResponse } from '@tests/fixtures/anonymous-session';
import { useAppSessionStore, useFrontendContainer } from '@/frontend/shared/hooks';
import type { FeatureContainerOptions } from '@/frontend/shared/interfaces';
import {
  AppSessionBootstrap,
  FeatureContainerProvider,
  FrontendContainerProvider,
} from '@/frontend/shared/providers';
import { createFeatureContainer } from '@/frontend/shared/services/container';
import { appReadySessionFixture } from '@/mocks/fixtures/session';
import { server } from '@/mocks/msw.node';

const featureToken = Symbol('test.feature');
const disposed = new Set<FeatureStore>();

class FeatureStore {
  count = 0;

  constructor() {
    makeAutoObservable(this);
  }

  increment() {
    this.count += 1;
  }

  dispose() {
    disposed.add(this);
  }
}

function createTestFeature(options: FeatureContainerOptions): Container {
  const container = createFeatureContainer(options);

  container
    .bind<FeatureStore>(featureToken)
    .toDynamicValue(() => new FeatureStore())
    .inSingletonScope()
    .onDeactivation((store) => store.dispose());

  return container;
}

const FeatureProbe = observer(function FeatureProbe({
  onStore,
}: {
  onStore: (store: FeatureStore) => void;
}) {
  const store = useFrontendContainer().get<FeatureStore>(featureToken);

  onStore(store);

  return <button onClick={() => store.increment()}>Answer count: {store.count}</button>;
});

test('feature scopes survive Strict Mode setup and clean up when session scope changes', async () => {
  const user = userEvent.setup();
  const session = appReadySessionFixture();

  let currentStore!: FeatureStore;
  const onStore = (store: FeatureStore) => {
    currentStore = store;
  };

  const workspace = (scopeKey: string) => (
    <StrictMode>
      <FrontendContainerProvider bootstrap={{ session }}>
        <FeatureContainerProvider scopeKey={scopeKey} createContainer={createTestFeature}>
          <FeatureProbe onStore={onStore} />
        </FeatureContainerProvider>
      </FrontendContainerProvider>
    </StrictMode>
  );

  const { rerender, unmount } = render(workspace('session-one'));

  await user.click(screen.getByRole('button', { name: 'Answer count: 0' }));

  expect(screen.getByRole('button', { name: 'Answer count: 1' })).toBeInTheDocument();

  const firstStore = currentStore;

  expect(disposed.has(firstStore)).toBe(false);

  rerender(workspace('session-one'));

  expect(screen.getByRole('button', { name: 'Answer count: 1' })).toBeInTheDocument();
  expect(currentStore).toBe(firstStore);

  rerender(workspace('session-two'));

  expect(screen.getByRole('button', { name: 'Answer count: 0' })).toBeInTheDocument();
  expect(currentStore).not.toBe(firstStore);

  await waitFor(() => expect(disposed.has(firstStore)).toBe(true));

  const secondStore = currentStore;

  unmount();

  await waitFor(() => expect(disposed.has(secondStore)).toBe(true));
});

const SessionProbe = observer(function SessionProbe() {
  const session = useAppSessionStore();

  return (
    <div>
      <p>Current visitor: {session.snapshot?.authorization.appAccess ?? 'UNKNOWN'}</p>
      <button
        onClick={() => {
          void session.signOut();
        }}>
        Sign out
      </button>
    </div>
  );
});

test('bootstrap leaves descendants active when the session later changes after sign-out', async () => {
  const session = appReadySessionFixture();
  const user = userEvent.setup();
  let currentStore!: FeatureStore;

  server.use(
    http.post('http://localhost:3000/api/v1/auth/sign-out', () =>
      HttpResponse.json({ status: anonymousSessionResponse().status }),
    ),
  );

  render(
    <FrontendContainerProvider bootstrap={{ session }}>
      <AppSessionBootstrap session={session}>
        <SessionProbe />
        <FeatureContainerProvider scopeKey="active-session" createContainer={createTestFeature}>
          <FeatureProbe
            onStore={(store) => {
              currentStore = store;
            }}
          />
        </FeatureContainerProvider>
      </AppSessionBootstrap>
    </FrontendContainerProvider>,
  );

  expect(await screen.findByText('Current visitor: APP_READY')).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: 'Answer count: 0' }));

  const previousIdentityStore = currentStore;

  await user.click(screen.getByRole('button', { name: 'Sign out' }));

  expect(await screen.findByText('Current visitor: ANONYMOUS')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Answer count: 0' })).toBeInTheDocument();
  expect(currentStore).not.toBe(previousIdentityStore);

  await waitFor(() => expect(disposed.has(previousIdentityStore)).toBe(true));
});
