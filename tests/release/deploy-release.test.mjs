import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'node:test';
import { createReleaseMetadata, readReleaseContext } from '../../scripts/release-metadata.mjs';
import {
  prepareDeploy,
  deployOverSsh,
  readDeployContext,
  validateDeployReceipt,
  validateDeployMetadata,
  validatePublishJobs,
  validatePublishRun,
} from '../../scripts/deploy-release.mjs';

const execute = promisify(execFile);
const env = {
  GITHUB_EVENT_NAME: 'workflow_dispatch',
  GITHUB_REF: 'refs/heads/main',
  GITHUB_SHA: 'd'.repeat(40),
  GITHUB_REPOSITORY: 'owner/kotoba-hub',
  GITHUB_RUN_ID: '6789',
  GITHUB_RUN_ATTEMPT: '1',
  PUBLISH_RUN_ID: '12345',
  DOCKERHUB_USERNAME: 'example',
  DOCKERHUB_REPOSITORY: 'kotoba-hub',
  VPS_HOST: '192.0.2.1',
  VPS_PORT: '22',
  VPS_USER: 'deploy',
  APP_URL: 'https://kotoba.example.com',
  GITHUB_TOKEN: 'fake-github-secret',
};

const context = readDeployContext(env);

const run = {
  id: 12345,
  run_attempt: 2,
  workflow_id: 99,
  path: '.github/workflows/ci.yml',
  event: 'push',
  head_branch: 'main',
  head_sha: 'a'.repeat(40),
  status: 'completed',
  conclusion: 'success',
  repository: { full_name: env.GITHUB_REPOSITORY },
  head_repository: { full_name: env.GITHUB_REPOSITORY },
};

const workflow = { id: 99, path: '.github/workflows/ci.yml' };
const jobs = ['quality', 'publish'].map((name) => ({
  name,
  status: 'completed',
  conclusion: 'success',
  head_sha: run.head_sha,
  run_id: run.id,
  run_attempt: run.run_attempt,
}));

const metadata = createReleaseMetadata(
  readReleaseContext({
    ...env,
    GITHUB_EVENT_NAME: 'push',
    GITHUB_SHA: run.head_sha,
    GITHUB_RUN_ID: String(run.id),
    GITHUB_RUN_ATTEMPT: String(run.run_attempt),
    QUALITY_RESULT: 'success',
  }),
  { app: `sha256:${'b'.repeat(64)}`, ops: `sha256:${'c'.repeat(64)}` },
);

for (const [key, value] of [
  ['GITHUB_EVENT_NAME', 'push'],
  ['GITHUB_REF', 'refs/heads/feature'],
  ['PUBLISH_RUN_ID', '1; touch /tmp/pwned'],
  ['GITHUB_RUN_ATTEMPT', '0'],
  ['VPS_HOST', '-oProxyCommand=evil'],
  ['VPS_USER', 'deploy;id'],
  ['VPS_PORT', '65536'],
  ['APP_URL', 'http://kotoba.example.com'],
  ['APP_URL', 'https://kotoba.example.com/'],
  ['APP_URL', 'https://user:password@kotoba.example.com'],
  ['DOCKERHUB_REPOSITORY', 'other/repo'],
]) {
  test(`deploy rejects unsafe context ${key}`, () => {
    assert.throws(() => readDeployContext({ ...env, [key]: value }));
  });
}

test('only a completed successful push-main run of the allowed workflow and repository is accepted', () => {
  validatePublishRun(run, workflow, context);

  for (const patch of [
    { id: 999 },
    { event: 'pull_request' },
    { event: 'workflow_dispatch' },
    { head_branch: 'feature' },
    { conclusion: 'failure' },
    { status: 'in_progress' },
    { path: '.github/workflows/other.yml' },
    { workflow_id: 88 },
    { repository: { full_name: 'attacker/repo' } },
    { head_repository: { full_name: 'attacker/repo' } },
    { head_sha: 'abc' },
  ])
    assert.throws(() => validatePublishRun({ ...run, ...patch }, workflow, context));
});

test('quality and publish must both succeed in the selected attempt, without duplicate job names', () => {
  validatePublishJobs(jobs, run);

  validatePublishJobs(
    jobs.map((job) => {
      const withoutOptionalAttempt = { ...job };
      delete withoutOptionalAttempt.run_attempt;
      return withoutOptionalAttempt;
    }),
    run,
  );

  for (const invalid of [
    jobs.slice(0, 1),
    [...jobs, jobs[1]],
    jobs.map((job) => ({ ...job, conclusion: 'skipped' })),
    jobs.map((job) => ({ ...job, run_attempt: 1 })),
    jobs.map((job) => ({ ...job, head_sha: env.GITHUB_SHA })),
  ])
    assert.throws(() => validatePublishJobs(invalid, run));
});

test('metadata matches exact canonical schema, trusted run/attempt/commit and image allowlist', () => {
  assert.deepEqual(validateDeployMetadata(metadata, run, context), metadata);

  const changes = [
    (m) => {
      m.commit = env.GITHUB_SHA;
    },
    (m) => {
      m.publishRun.attempt = '1';
    },
    (m) => {
      m.publishRun.url = 'https://attacker.example';
    },
    (m) => {
      m.images.app.ref = m.images.app.tag;
    },
    (m) => {
      m.images.ops.tag = m.images.app.tag;
    },
    (m) => {
      m.images.app.digest = 'sha256:bad';
    },
    (m) => {
      m.images.app.ref = m.images.app.ref.replace('example/', 'attacker/');
    },
    (m) => {
      m.images.mysql = { ref: 'malicious' };
    },
    (m) => {
      m.secret = 'untrusted-extra-field';
    },
    (m) => {
      m.schemaVersion = 2;
    },
  ];

  for (const change of changes) {
    const modified = structuredClone(metadata);
    change(modified);

    assert.throws(() => validateDeployMetadata(modified, run, context));
  }
});

async function fixture(t, mutate = () => {}, extraEntry = false) {
  const dir = await mkdtemp(join(tmpdir(), 'kotoba-deploy-metadata-'));
  t.after(() => rm(dir, { recursive: true, force: true }));

  await writeFile(join(dir, 'release-metadata.json'), JSON.stringify(metadata));
  if (extraEntry) await writeFile(join(dir, 'unexpected.txt'), 'untrusted');
  await execute(
    'zip',
    ['-q', 'release.zip', 'release-metadata.json', ...(extraEntry ? ['unexpected.txt'] : [])],
    { cwd: dir },
  );

  const archive = await readFile(join(dir, 'release.zip'));
  await rm(join(dir, 'release.zip'));
  await rm(join(dir, 'release-metadata.json'));
  if (extraEntry) await rm(join(dir, 'unexpected.txt'));

  const artifacts = [
    {
      id: 111,
      name: 'release-metadata',
      expired: false,
      size_in_bytes: archive.length,
      workflow_run: { id: run.id, head_sha: run.head_sha },
    },
  ];

  const data = { artifacts, run: structuredClone(run), jobs: structuredClone(jobs), workflow };
  mutate(data);

  const calls = [];
  let runReads = 0;

  const fetchImpl = async (url, options) => {
    const path = String(url);
    calls.push({ url: path, options });

    if (path === 'https://storage.example/release.zip') {
      assert.equal(options.headers, undefined);
      return new Response(archive);
    }

    assert.equal(options.headers.Authorization, `Bearer ${env.GITHUB_TOKEN}`);
    if (path.endsWith('/workflows/ci.yml')) return Response.json(data.workflow);
    if (path.endsWith(`/runs/${run.id}`)) {
      runReads++;
      return Response.json(data.changedRun && runReads > 1 ? data.changedRun : data.run);
    }

    if (path.includes('/jobs?')) return Response.json({ jobs: data.jobs });
    if (path.includes('/artifacts?')) return Response.json({ artifacts: data.artifacts });
    if (path.endsWith('/artifacts/111/zip'))
      return new Response(null, {
        status: 302,
        headers: { location: 'https://storage.example/release.zip' },
      });

    throw new Error('Unexpected request');
  };

  return { dir, calls, fetchImpl };
}

test('SSH uses verified hosts and 0600 credentials, sends only request data, validates receipt, and cleans up', async (t) => {
  const f = await fixture(t);
  await prepareDeploy({ ...env, RUNNER_TEMP: f.dir }, f.fetchImpl);

  const bin = join(f.dir, 'bin');
  await mkdir(bin);
  await copyFile('tests/release/fixtures/deploy-ssh.mjs', join(bin, 'ssh'));
  await chmod(join(bin, 'ssh'), 0o700);

  const oldPath = process.env.PATH;
  const oldTemp = process.env.RUNNER_TEMP;
  process.env.PATH = `${bin}:${oldPath}`;
  process.env.RUNNER_TEMP = f.dir;

  t.after(() => {
    process.env.PATH = oldPath;
    if (oldTemp === undefined) delete process.env.RUNNER_TEMP;
    else process.env.RUNNER_TEMP = oldTemp;
  });

  await deployOverSsh({
    ...env,
    RUNNER_TEMP: f.dir,
    VPS_SSH_PRIVATE_KEY: 'fake-private-key',
    VPS_SSH_KNOWN_HOSTS: 'fake-known-host',
  });

  assert.equal(await readFile(join(f.dir, 'ssh-checked'), 'utf8'), 'strict');
  assert.ok(!(await readdir(f.dir)).some((name) => name.startsWith('deploy-ssh-')));

  const request = await readFile(join(f.dir, 'deploy.request'));
  assert.throws(() => validateDeployReceipt('result=success\n', request), /differs/);
});

test('artifact download produces only a bounded request with digests and script hash, without credentials', async (t) => {
  const f = await fixture(t);
  await prepareDeploy({ ...env, RUNNER_TEMP: f.dir }, f.fetchImpl);

  const request = await readFile(join(f.dir, 'deploy.request'), 'utf8');
  assert.equal(request.split('\n').length, 10);
  assert.ok(request.includes(metadata.images.app.ref));
  assert.ok(request.includes(`\n${metadata.commit}\n${run.id}\n2\n`));
  assert.ok(!request.includes(env.GITHUB_TOKEN));
  assert.deepEqual(await readdir(f.dir), ['deploy.request']);
});

test('extra archive entries and oversized downloads are rejected without a request file', async (t) => {
  const extra = await fixture(t, undefined, true);
  await assert.rejects(
    prepareDeploy({ ...env, RUNNER_TEMP: extra.dir }, extra.fetchImpl),
    /archive entries/,
  );
  assert.deepEqual(await readdir(extra.dir), []);

  const large = await fixture(t);
  await assert.rejects(
    prepareDeploy({ ...env, RUNNER_TEMP: large.dir }, (url, options) => {
      if (String(url) === 'https://storage.example/release.zip')
        return new Response(new Uint8Array(1_048_577));
      return large.fetchImpl(url, options);
    }),
    /size limit/,
  );
  assert.deepEqual(await readdir(large.dir), []);
});

for (const [name, mutate] of [
  [
    'missing artifact',
    (d) => {
      d.artifacts = [];
    },
  ],
  [
    'expired artifact',
    (d) => {
      d.artifacts[0].expired = true;
    },
  ],
  [
    'duplicate artifacts',
    (d) => {
      d.artifacts.push(d.artifacts[0]);
    },
  ],
  [
    'wrong artifact commit',
    (d) => {
      d.artifacts[0].workflow_run.head_sha = env.GITHUB_SHA;
    },
  ],
  [
    'failed publish',
    (d) => {
      d.jobs[1].conclusion = 'failure';
    },
  ],
  [
    'concurrent rerun',
    (d) => {
      d.changedRun = { ...d.run, run_attempt: 3 };
    },
  ],
]) {
  test(`${name} never produces a deploy request`, async (t) => {
    const f = await fixture(t, mutate);
    await assert.rejects(prepareDeploy({ ...env, RUNNER_TEMP: f.dir }, f.fetchImpl));
    assert.deepEqual(await readdir(f.dir), []);
  });
}
