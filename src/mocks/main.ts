import { isApplicationApiRequest } from './msw.router';

let startup: Promise<void> | undefined;

export function startMocking(): Promise<void> {
  if (
    typeof window === 'undefined' ||
    process.env.NODE_ENV !== 'development' ||
    process.env.NEXT_PUBLIC_API_MOCKING !== 'true'
  ) {
    return Promise.resolve();
  }

  startup ??= import('./msw.browser')
    .then(async ({ worker }) => {
      await worker.start({
        serviceWorker: { url: '/mockServiceWorker.js' },
        onUnhandledRequest(request, print) {
          if (isApplicationApiRequest(request)) print.error();
        },
      });
    })
    .catch((error: unknown) => {
      startup = undefined;
      throw error;
    });

  return startup;
}
