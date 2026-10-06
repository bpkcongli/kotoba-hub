jest.mock('@/mocks/msw.browser', () => ({
  worker: { start: jest.fn() },
}));

test.each([
  { mode: 'production', flag: 'true' },
  { mode: 'test', flag: 'true' },
  { mode: 'development', flag: 'false' },
] as const)('does not start browser mocks in $mode with flag=$flag', async ({ mode, flag }) => {
  jest.replaceProperty(process, 'env', {
    ...process.env,
    NODE_ENV: mode,
    NEXT_PUBLIC_API_MOCKING: flag,
  });

  await jest.isolateModulesAsync(async () => {
    const { worker } = await import('@/mocks/msw.browser');
    const { startMocking } = await import('@/mocks/main');
    await startMocking();
    expect(worker.start).not.toHaveBeenCalled();
  });
});

test('concurrent starts wait for one ready worker', async () => {
  jest.replaceProperty(process, 'env', {
    ...process.env,
    NODE_ENV: 'development',
    NEXT_PUBLIC_API_MOCKING: 'true',
  });

  await jest.isolateModulesAsync(async () => {
    const { worker: isolatedWorker } = await import('@/mocks/msw.browser');
    let ready!: () => void;
    const workerReady = new Promise<undefined>((resolve) => {
      ready = () => resolve(undefined);
    });
    jest.mocked(isolatedWorker.start).mockReturnValue(workerReady);
    const { startMocking } = await import('@/mocks/main');
    const first = startMocking();
    const second = startMocking();
    let settled = false;
    void first.then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);
    ready();
    await Promise.all([first, second]);
    expect(isolatedWorker.start).toHaveBeenCalledTimes(1);
  });
});

test('reports a startup failure and permits retry', async () => {
  jest.replaceProperty(process, 'env', {
    ...process.env,
    NODE_ENV: 'development',
    NEXT_PUBLIC_API_MOCKING: 'true',
  });

  await jest.isolateModulesAsync(async () => {
    const { worker: isolatedWorker } = await import('@/mocks/msw.browser');
    jest
      .mocked(isolatedWorker.start)
      .mockRejectedValueOnce(new Error('Worker unavailable'))
      .mockResolvedValueOnce(undefined);
    const { startMocking } = await import('@/mocks/main');

    await expect(startMocking()).rejects.toThrow('Worker unavailable');
    await expect(startMocking()).resolves.toBeUndefined();
    expect(isolatedWorker.start).toHaveBeenCalledTimes(2);
  });
});
