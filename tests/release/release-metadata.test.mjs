import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  checkRegistry,
  createReleaseMetadata,
  readReleaseContext,
  runReleaseCommand,
} from '../../scripts/release-metadata.mjs';

const env = {
  GITHUB_EVENT_NAME: 'push',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_SHA: 'a'.repeat(40),
  GITHUB_REPOSITORY: 'owner/kotoba-hub',
  GITHUB_RUN_ID: '12345',
  GITHUB_RUN_ATTEMPT: '1',
  DOCKERHUB_USERNAME: 'example',
  DOCKERHUB_REPOSITORY: 'kotoba-hub',
  QUALITY_RESULT: 'success',
  DOCKERHUB_TOKEN: 'fake-registry-credential',
};

const digests = { app: `sha256:${'b'.repeat(64)}`, ops: `sha256:${'c'.repeat(64)}` };
const context = readReleaseContext(env);

function registryMock(statuses, headers = []) {
  const calls = [];
  const mockFetch = async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).startsWith('https://auth.docker.io/token?')) {
      return Response.json({ token: 'fake-bearer-token' });
    }

    const index = calls.length - 2;
    assert.ok(index < statuses.length, 'Unexpected registry request');

    return new Response(null, { status: statuses[index], headers: headers[index] });
  };

  return { calls, mockFetch };
}

async function temporaryEnv(t) {
  const dir = await mkdtemp(join(tmpdir(), 'kotoba-release-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  return {
    ...env,
    RUNNER_TEMP: dir,
    GITHUB_OUTPUT: join(dir, 'outputs'),
    GITHUB_STEP_SUMMARY: join(dir, 'summary'),
    APP_DIGEST: digests.app,
    OPS_DIGEST: digests.ops,
  };
}

test('full commit tags and digest references describe a single release with a fixed schema', () => {
  const poisonedEnv = { ...env, DATABASE_URL: 'secret-database', OPENAI_API_KEY: 'secret-ai' };

  const metadata = createReleaseMetadata(readReleaseContext(poisonedEnv), digests);

  assert.deepEqual(metadata, {
    schemaVersion: 1,
    commit: env.GITHUB_SHA,
    repository: 'owner/kotoba-hub',
    workflow: '.github/workflows/ci.yml',
    publishRun: {
      id: '12345',
      attempt: '1',
      url: 'https://github.com/owner/kotoba-hub/actions/runs/12345/attempts/1',
    },
    quality: { job: 'quality', result: 'success' },
    platform: 'linux/amd64',
    images: {
      app: {
        target: 'runner',
        tag: `docker.io/example/kotoba-hub:sha-${env.GITHUB_SHA}`,
        digest: digests.app,
        ref: `docker.io/example/kotoba-hub@${digests.app}`,
      },
      ops: {
        target: 'ops',
        tag: `docker.io/example/kotoba-hub:ops-sha-${env.GITHUB_SHA}`,
        digest: digests.ops,
        ref: `docker.io/example/kotoba-hub@${digests.ops}`,
      },
    },
  });

  for (const secret of ['secret-database', 'secret-ai', env.DOCKERHUB_TOKEN, 'MYSQL_IMAGE']) {
    assert.ok(!JSON.stringify(metadata).includes(secret));
  }
});

for (const [key, value] of [
  ['GITHUB_EVENT_NAME', 'pull_request'],
  ['GITHUB_EVENT_NAME', 'workflow_dispatch'],
  ['GITHUB_REF', 'refs/heads/feature'],
  ['QUALITY_RESULT', 'failure'],
  ['QUALITY_RESULT', 'cancelled'],
  ['QUALITY_RESULT', 'skipped'],
  ['GITHUB_SHA', 'abc123'],
  ['GITHUB_REPOSITORY', 'owner/repo\nother=data'],
  ['GITHUB_RUN_ID', '0'],
  ['GITHUB_RUN_ATTEMPT', '-1'],
  ['DOCKERHUB_USERNAME', 'example/other'],
  ['DOCKERHUB_REPOSITORY', 'repo\napp_tag=evil'],
  ['DOCKERHUB_REPOSITORY', 'Uppercase'],
  ['DOCKERHUB_REPOSITORY', 'x'.repeat(256)],
]) {
  test(`rejects invalid release input ${key}=${JSON.stringify(value)}`, () => {
    assert.throws(() => readReleaseContext({ ...env, [key]: value }));
  });
}

test('both immutable tags must be absent before publishing, with scoped read-only token checks', async () => {
  const { calls, mockFetch } = registryMock([404, 404]);

  await checkRegistry(context, env.DOCKERHUB_TOKEN, undefined, mockFetch);

  const authUrl = new URL(calls[0].url);
  assert.equal(authUrl.searchParams.get('scope'), 'repository:example/kotoba-hub:pull');

  for (const call of calls.slice(1)) {
    assert.equal(call.options.method, 'HEAD');
    assert.equal(call.options.redirect, 'error');
    assert.equal(call.options.headers.Authorization, 'Bearer fake-bearer-token');
  }

  assert.ok(calls[1].url.endsWith(`/sha-${env.GITHUB_SHA}`));
  assert.ok(calls[2].url.endsWith(`/ops-sha-${env.GITHUB_SHA}`));
});

for (const statuses of [[200], [404, 200]]) {
  test(`refuses to overwrite either existing tag (${statuses})`, async () => {
    await assert.rejects(
      checkRegistry(context, env.DOCKERHUB_TOKEN, undefined, registryMock(statuses).mockFetch),
      /already exists/,
    );
  });
}

for (const status of [401, 403, 429, 500]) {
  test(`registry HTTP ${status} is a failure, never evidence that a tag is absent`, async () => {
    await assert.rejects(
      checkRegistry(context, env.DOCKERHUB_TOKEN, undefined, registryMock([status]).mockFetch),
      /Cannot verify/,
    );
  });
}

test('authentication and network errors fail without printing credentials or provider bodies', async () => {
  for (const mockFetch of [
    async () => new Response(env.DOCKERHUB_TOKEN, { status: 401 }),
    async () => Response.json({ unexpected: env.DOCKERHUB_TOKEN }),
    async () => new Response(env.DOCKERHUB_TOKEN),
    async () => {
      throw new Error(env.DOCKERHUB_TOKEN);
    },
  ]) {
    await assert.rejects(
      checkRegistry(context, env.DOCKERHUB_TOKEN, undefined, mockFetch),
      (error) => {
        assert.ok(!error.message.includes(env.DOCKERHUB_TOKEN));
        return true;
      },
    );
  }
});

test('prepare writes only validated tags after the registry accepts both absence checks', async (t) => {
  const config = await temporaryEnv(t);

  await runReleaseCommand('prepare', config, registryMock([404, 404]).mockFetch);

  assert.equal(
    await readFile(config.GITHUB_OUTPUT, 'utf8'),
    `app_tag=docker.io/example/kotoba-hub:sha-${env.GITHUB_SHA}\nops_tag=docker.io/example/kotoba-hub:ops-sha-${env.GITHUB_SHA}\n`,
  );
});

test('metadata file and summary are produced only after both published digests match the registry', async (t) => {
  const config = await temporaryEnv(t);

  await runReleaseCommand(
    'write',
    config,
    registryMock(
      [200, 200],
      [{ 'docker-content-digest': digests.app }, { 'docker-content-digest': digests.ops }],
    ).mockFetch,
  );

  const metadata = JSON.parse(
    await readFile(join(config.RUNNER_TEMP, 'release-metadata.json'), 'utf8'),
  );
  assert.deepEqual(metadata, createReleaseMetadata(context, digests));
  assert.ok(!(await readFile(config.GITHUB_STEP_SUMMARY, 'utf8')).includes(env.DOCKERHUB_TOKEN));
});

for (const [statuses, headers] of [
  [[200, 404], [{ 'docker-content-digest': digests.app }]],
  [[200], [{ 'docker-content-digest': digests.ops }]],
  [
    [200, 200],
    [{ 'docker-content-digest': digests.app }, {}],
  ],
]) {
  test(`partial publication or a mismatched digest never produces metadata (${JSON.stringify(headers)})`, async (t) => {
    const config = await temporaryEnv(t);

    await assert.rejects(
      runReleaseCommand('write', config, registryMock(statuses, headers).mockFetch),
    );

    assert.deepEqual(await readdir(config.RUNNER_TEMP), []);
  });
}

for (const digest of ['', 'sha256:123', 'latest', `sha256:${'b'.repeat(64)}\nextra=data`]) {
  test(`rejects invalid digest ${JSON.stringify(digest)} before making requests`, async (t) => {
    const config = await temporaryEnv(t);
    let requested = false;

    await assert.rejects(
      runReleaseCommand('write', { ...config, OPS_DIGEST: digest }, async () => {
        requested = true;
      }),
      /Invalid ops digest/,
    );

    assert.equal(requested, false);
    assert.deepEqual(await readdir(config.RUNNER_TEMP), []);
  });
}

test('an existing metadata file cannot be silently replaced on retry', async (t) => {
  const config = await temporaryEnv(t);
  const path = join(config.RUNNER_TEMP, 'release-metadata.json');
  await writeFile(path, 'previous release');

  await assert.rejects(
    runReleaseCommand(
      'write',
      config,
      registryMock(
        [200, 200],
        [{ 'docker-content-digest': digests.app }, { 'docker-content-digest': digests.ops }],
      ).mockFetch,
    ),
    /EEXIST/,
  );

  assert.equal(await readFile(path, 'utf8'), 'previous release');
});
