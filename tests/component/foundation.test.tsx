import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Container } from 'inversify';
import { makeAutoObservable } from 'mobx';
import { observer } from 'mobx-react-lite';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/msw.node';
import { anonymousSessionResponse } from '../fixtures/anonymous-session';

// This test-only counter checks the framework wiring without creating a
// placeholder business store or pretending to cover a learning rule.
class Counter {
  value = 0;

  constructor() {
    makeAutoObservable(this);
  }

  increment() {
    this.value += 1;
  }
}

const CounterView = observer(({ counter }: { counter: Counter }) => (
  <button onClick={() => counter.increment()}>Count: {counter.value}</button>
));

test('renders observable updates with an isolated Inversify container', async () => {
  const counterToken = Symbol('foundation.counter');
  const container = new Container();
  container
    .bind<Counter>(counterToken)
    .toDynamicValue(() => new Counter())
    .inSingletonScope();
  const user = userEvent.setup();

  render(<CounterView counter={container.get<Counter>(counterToken)} />);
  await user.click(screen.getByRole('button', { name: 'Count: 0' }));

  expect(screen.getByRole('button', { name: 'Count: 1' })).toBeInTheDocument();
});

test('intercepts fetch in the component environment', async () => {
  const url = 'http://localhost:3000/api/v1/auth/session';
  const responseBody = anonymousSessionResponse();
  server.use(http.get(url, () => HttpResponse.json(responseBody)));

  await expect(fetch(url).then((response) => response.json())).resolves.toEqual(responseBody);
});
