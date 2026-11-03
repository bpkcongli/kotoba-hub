import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { test } from 'node:test';

const execute = promisify(execFile);
const script = resolve('scripts/deploy-production.sh');
const image = 'docker.io/example/kotoba-hub';
const app = `${image}@sha256:${'b'.repeat(64)}`;
const ops = `${image}@sha256:${'c'.repeat(64)}`;
const old = `${image}@sha256:${'a'.repeat(64)}`;
const mysql = `docker.io/library/mysql:8.4@sha256:${'e'.repeat(64)}`;
const commit = 'f'.repeat(40);

async function fixture(t, failure = '', delay = 0) {
  const root = await mkdtemp(join(tmpdir(), 'kotoba-vps-'));
  t.after(() => rm(root, { recursive: true, force: true }));

  const bin = join(root, 'bin');
  await mkdir(bin);
  await mkdir(join(root, 'backups'), { mode: 0o700 });

  for (const [name, file] of [
    ['docker', 'deploy-docker.mjs'],
    ['curl', 'deploy-curl.mjs'],
  ]) {
    await copyFile(resolve('tests/release/fixtures', file), join(bin, name));
    await chmod(join(bin, name), 0o700);
  }

  await copyFile(resolve('scripts/backup-production-db.sh'), join(root, 'backup-production-db.sh'));
  await chmod(join(root, 'backup-production-db.sh'), 0o700);
  await writeFile(join(root, 'compose.production.yaml'), 'name: kotoba-hub\n');

  const release = `APP_IMAGE=${old}\nOPS_IMAGE=${old}\nMYSQL_IMAGE=${mysql}\n`;
  for (const [name, body] of Object.entries({
    'release.env': release,
    'app.env': 'SECRET=do-not-log-app\n',
    'ops.env': 'SECRET=do-not-log-ops\n',
    'mysql.env': 'SECRET=do-not-log-db\n',
    'deploy.conf': `IMAGE_REPOSITORY=${image}\nAPP_URL=https://kotoba.example.com\nBACKUP_DIR=${root}/backups\nMIN_FREE_MB=1\n`,
    'fixture.json': JSON.stringify({ failure, delay, commit, mysql }),
    'active-app': old,
  }))
    await writeFile(join(root, name), body, { mode: 0o600 });

  const hash = createHash('sha256')
    .update(await readFile(script))
    .digest('hex');
  const request = (id = '100-1') =>
    [
      'kotoba-deploy-v1',
      hash,
      id,
      commit,
      '123',
      '1',
      app,
      ops,
      'https://kotoba.example.com',
      '',
    ].join('\n');

  const childEnv = { ...process.env, KOTOBA_DEPLOY_DIR: root, PATH: `${bin}:${process.env.PATH}` };

  const invoke = (args, input) =>
    new Promise((done, reject) => {
      const child = execFile(
        'bash',
        [script, ...args],
        { env: childEnv, timeout: 15_000 },
        (error, stdout, stderr) =>
          error ? reject(Object.assign(error, { stdout, stderr })) : done(stdout),
      );

      child.stdin.on('error', () => {});
      child.stdin.end(input);
    });

  const wait = async (id = '100-1') => {
    for (let i = 0; i < 200; i++) {
      const status = await invoke(['status', id]);

      if (!status.startsWith('result=running\n')) {
        try {
          await execute('flock', ['-n', join(root, '.deployment.lock'), 'true']);
          return status;
        } catch {
          // A terminal receipt is written immediately before the worker releases its lock.
        }
      }

      await new Promise((done) => setTimeout(done, 25));
    }

    throw new Error('Worker did not finish');
  };

  const calls = async () =>
    (await readFile(join(root, 'calls.jsonl'), 'utf8')).trim().split('\n').map(JSON.parse);

  return { root, request, invoke, wait, calls, release, childEnv };
}

test('check validates active configuration and health without migration, backup or app recreation', async (t) => {
  const f = await fixture(t);

  assert.match(await f.invoke(['check']), /Preflight and active app health passed/);

  assert.ok(
    !(await f.calls()).some(
      (args) =>
        args.includes('pull') ||
        args.includes('exec') ||
        args.includes('run') ||
        args.includes('up'),
    ),
  );
});

test('an interrupted worker with a free lock reports unknown and holds the gate for operator diagnosis', async (t) => {
  const f = await fixture(t);
  const record = join(f.root, '.deployments/100-1');

  await mkdir(record, { recursive: true });
  await writeFile(join(record, 'status'), 'result=running\nphase=migrating\n');
  await writeFile(join(f.root, '.deployments/pending'), '100-1\n');

  assert.match(await f.invoke(['status', '100-1']), /^result=unknown\nphase=migrating\n/);

  await assert.rejects(f.invoke(['start'], f.request('101-1')));

  await f.invoke(['acknowledge', '100-1']);
});

test('detached deploy holds one lock, backs up before migration, replaces only app, commits after health, and repeats safely', async (t) => {
  const f = await fixture(t);

  await f.invoke(['start'], f.request());

  assert.match(await f.wait(), /^result=success\nphase=complete\n/);

  const active = await readFile(join(f.root, 'release.env'), 'utf8');
  assert.equal(active, `APP_IMAGE=${app}\nOPS_IMAGE=${ops}\nMYSQL_IMAGE=${mysql}\n`);
  assert.equal(await readFile(join(f.root, 'release.previous.env'), 'utf8'), f.release);

  const calls = await f.calls();
  const migration = calls.findIndex((args) => args.includes('db:migrate'));
  const backup = calls.findIndex((args) => args.includes('mysqldump') || args.includes('exec'));
  const up = calls.find((args) => args.includes('up'));

  assert.ok(backup >= 0 && migration > backup);
  assert.ok(up.includes('--no-deps') && up.includes('--no-build') && up.at(-1) === 'app');

  assert.ok(
    !calls.some((args) => args.includes('down') || args.some((arg) => arg.includes('db:seed'))),
  );

  const dump = (await readFile(join(f.root, '.deployments/100-1/backup.path'), 'utf8')).trim();
  await execute('gzip', ['-t', dump]);
  await execute('sha256sum', ['-c', `${dump}.sha256`], { cwd: join(f.root, 'backups') });

  assert.ok(
    !(await readFile(join(f.root, '.deployments/100-1/operation.log'), 'utf8')).includes(
      'do-not-log',
    ),
  );

  await f.invoke(['start'], f.request());
  await f.invoke(['start'], f.request('101-1'));
  assert.match(await f.wait('101-1'), /^result=success\nphase=already-healthy\n/);
  assert.equal((await f.calls()).filter((args) => args.includes('db:migrate')).length, 1);
});

for (const failure of [
  'pull',
  'backup',
  'migration',
  'startup',
  'public-health',
  'session-envelope',
]) {
  test(`${failure} failure preserves active release and requires diagnosis before another attempt`, async (t) => {
    const f = await fixture(t, failure);

    await f.invoke(['start'], f.request());

    assert.match(await f.wait(), /^result=failed\n/);
    assert.equal(await readFile(join(f.root, 'release.env'), 'utf8'), f.release);
    await assert.rejects(f.invoke(['start'], f.request('101-1')), /Command failed/);
    assert.match(await f.invoke(['start'], f.request()), /^result=failed\n/);

    const calls = await f.calls();

    if (['pull', 'backup', 'migration'].includes(failure))
      assert.ok(!calls.some((args) => args.includes('up')));
    if (['pull', 'backup'].includes(failure))
      assert.ok(!calls.some((args) => args.includes('db:migrate')));
    assert.ok(!calls.some((args) => args.includes('down') || args.includes('restore')));

    await f.invoke(['acknowledge', '100-1']);
    assert.match(await f.invoke(['start'], f.request()), /^result=failed\n/);
  });
}

test('a second operator cannot overlap a detached migration or acknowledge while the worker holds the lock', async (t) => {
  const f = await fixture(t, '', 500);

  await f.invoke(['start'], f.request());

  await assert.rejects(f.invoke(['start'], f.request('101-1')));
  await assert.rejects(f.invoke(['acknowledge', '100-1']));
  await assert.rejects(
    execute('bash', [join(f.root, 'backup-production-db.sh'), f.root, join(f.root, 'backups')], {
      env: f.childEnv,
    }),
  );
  assert.match(await f.wait(), /^result=success\n/);
});

test('wrong script, image allowlist and shell-bearing request are rejected before touching Docker', async (t) => {
  const f = await fixture(t);

  for (const request of [
    f.request().replace('kotoba-deploy-v1', 'wrong-version'),
    f.request().replace(app, app.replace('example/', 'attacker/')),
    f.request().replace(commit, '$(touch /tmp/pwned)'),
    f.request().replace('https://kotoba.example.com', 'https://attacker.example'),
  ])
    await assert.rejects(f.invoke(['start'], request));

  await assert.rejects(readFile(join(f.root, 'calls.jsonl')));
  await assert.rejects(
    execute(
      'bash',
      [join(f.root, 'backup-production-db.sh'), '--lock-held', f.root, join(f.root, 'backups')],
      { env: f.childEnv },
    ),
  );
});
