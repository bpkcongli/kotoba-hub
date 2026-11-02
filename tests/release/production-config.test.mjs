import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { test } from 'node:test';
import { gunzipSync } from 'node:zlib';

const root = resolve(import.meta.dirname, '../..');
const backupScript = join(root, 'scripts/backup-production-db.sh');
const databasePassword = 'test-$literal-${NOT_EXPANDED}-"quote"-space value';

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'kotoba production '));
  t.after(() => rm(directory, { recursive: true, force: true }));

  await copyFile(join(root, 'compose.production.yaml'), join(directory, 'compose.production.yaml'));

  await writeFile(
    join(directory, 'release.env'),
    [
      `APP_IMAGE=docker.io/example/kotoba-hub@sha256:${'a'.repeat(64)}`,
      `OPS_IMAGE=docker.io/example/kotoba-hub@sha256:${'b'.repeat(64)}`,
      `MYSQL_IMAGE=docker.io/library/mysql:8.4@sha256:${'c'.repeat(64)}`,
    ].join('\n'),
  );

  await writeFile(
    join(directory, 'mysql.env'),
    `MYSQL_DATABASE=kotoba_hub\nMYSQL_USER=kotoba\nMYSQL_PASSWORD=${databasePassword}\nMYSQL_ROOT_PASSWORD=test-root-only\n`,
  );

  await writeFile(
    join(directory, 'ops.env'),
    'DATABASE_URL=mysql://test:password@mysql/kotoba_hub\n',
  );

  await writeFile(
    join(directory, 'app.env'),
    'DATABASE_URL=mysql://test:password@mysql/kotoba_hub\nAUTH_SECRET=test-auth\nOPENAI_API_KEY=test-ai-only\n',
  );

  return directory;
}

function composeConfig(directory) {
  const environment = { ...process.env };

  for (const key of ['APP_IMAGE', 'OPS_IMAGE', 'MYSQL_IMAGE']) delete environment[key];

  return spawnSync(
    'docker',
    [
      'compose',
      '--env-file',
      join(directory, 'release.env'),
      '-f',
      join(directory, 'compose.production.yaml'),
      '--profile',
      'ops',
      'config',
      '--format',
      'json',
    ],
    { env: environment, encoding: 'utf8' },
  );
}

test('production Compose preserves literal secrets and isolates database, ops, and host ports', async (t) => {
  const directory = await fixture(t);

  const result = composeConfig(directory);

  // Never attach rendered config to assertions: it contains runtime credentials.
  assert.equal(result.status, 0, 'Docker Compose 2.30+ must validate production config');

  const config = JSON.parse(result.stdout);

  assert.equal(config.name, 'kotoba-hub');
  assert.deepEqual(Object.keys(config.services).sort(), ['app', 'mysql', 'ops']);

  // Compose versions may escape dollars when serializing a reloadable config.
  assert.ok(
    [databasePassword, databasePassword.replaceAll('$', () => '$$')].includes(
      config.services.mysql.environment.MYSQL_PASSWORD,
    ),
  );

  assert.equal(config.services.app.ports.length, 1);
  assert.equal(config.services.app.ports[0].host_ip, '127.0.0.1');
  assert.equal(config.services.app.ports[0].published, '3000');
  assert.equal(config.services.mysql.ports, undefined);
  assert.equal(config.services.ops.ports, undefined);

  assert.deepEqual(config.services.ops.profiles, ['ops']);
  assert.deepEqual(config.services.ops.entrypoint, ['bun']);
  assert.deepEqual(config.services.ops.command, ['run', 'db:migrate']);

  assert.deepEqual(Object.keys(config.services.ops.environment), ['DATABASE_URL']);
  assert.equal(config.services.app.environment.MYSQL_ROOT_PASSWORD, undefined);

  assert.equal(config.volumes['mysql-data'].name, 'kotoba-hub-mysql-data');

  for (const service of Object.values(config.services)) {
    assert.equal(service.build, undefined);
    assert.equal(service.platform, 'linux/amd64');
    assert.equal(service.logging.options['max-size'], '10m');
  }
});

test('production Compose refuses a missing image reference before contacting a daemon', async (t) => {
  const directory = await fixture(t);
  await writeFile(join(directory, 'release.env'), 'OPS_IMAGE=test\nMYSQL_IMAGE=test\n');

  const result = composeConfig(directory);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /APP_IMAGE/);
  assert.equal(result.stdout, '');
});

async function backupFixture(t) {
  const directory = await fixture(t);
  const bin = join(directory, 'bin');
  const backups = join(directory, 'backups');

  await mkdir(bin);
  await mkdir(backups, { mode: 0o700 });

  const sql = 'CREATE TABLE example (id INT);\nINSERT INTO example VALUES (1);\n';
  const source = join(directory, 'fixture.sql');
  const args = join(directory, 'docker-args');

  await writeFile(source, sql);

  await writeFile(
    join(bin, 'docker'),
    '#!/usr/bin/env bash\nprintf "%s\\n" "$@" > "$TEST_DOCKER_ARGS"\ncat "$TEST_SQL_FILE"\nexit "${TEST_DUMP_EXIT:-0}"\n',
    { mode: 0o700 },
  );

  const environment = {
    ...process.env,
    PATH: `${bin}:${process.env.PATH}`,
    TEST_DOCKER_ARGS: args,
    TEST_SQL_FILE: source,
  };

  const run = (overrides = {}) =>
    spawnSync('bash', [backupScript, directory, backups], {
      env: { ...environment, ...overrides },
      encoding: 'utf8',
    });

  return { directory, backups, args, sql, run };
}

test('backup writes a private gzip and verifiable checksum without passing credentials to Docker argv', async (t) => {
  const { backups, args, sql, run } = await backupFixture(t);

  const result = run();

  assert.equal(result.status, 0, result.stderr);

  const file = result.stdout.trim();
  assert.equal(resolve(file, '..'), backups);

  const compressed = await readFile(file);
  assert.equal(gunzipSync(compressed).toString(), sql);

  assert.equal((await stat(file)).mode & 0o777, 0o600);
  assert.equal((await stat(`${file}.sha256`)).mode & 0o777, 0o600);

  assert.equal(
    await readFile(`${file}.sha256`, 'utf8'),
    `${createHash('sha256').update(compressed).digest('hex')}  ${basename(file)}\n`,
  );

  const invocation = await readFile(args, 'utf8');

  assert.match(invocation, /exec\n-T\nmysql\nsh\n-eu\n-c/);
  assert.match(invocation, /--single-transaction/);
  assert.match(invocation, /--set-gtid-purged=OFF/);
  assert.ok(!invocation.includes(databasePassword));
  assert.ok(!invocation.includes('test-root-only'));

  assert.deepEqual(
    (await readdir(backups)).sort(),
    [basename(file), `${basename(file)}.sha256`].sort(),
  );
});

test('failed dump propagates failure through gzip and leaves no successful or partial backup', async (t) => {
  const { backups, run } = await backupFixture(t);

  const result = run({ TEST_DUMP_EXIT: '42' });

  assert.equal(result.status, 42);
  assert.equal(result.stdout, '');
  assert.deepEqual(await readdir(backups), []);
});

test('backup refuses a directory readable by other users', async (t) => {
  const { backups, run } = await backupFixture(t);
  await chmod(backups, 0o755);

  const result = run();

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /0700/);
  assert.deepEqual(await readdir(backups), []);
});

test('backup refuses overlap with a database operation holding the deployment lock', async (t) => {
  const { directory, backups, run } = await backupFixture(t);

  const holder = spawn('flock', [
    join(directory, '.deployment.lock'),
    'sh',
    '-c',
    'echo locked; cat',
  ]);

  const exited = new Promise((resolveExit) => holder.on('exit', resolveExit));

  t.after(async () => {
    holder.stdin.end();
    await exited;
  });

  await new Promise((resolveReady, reject) => {
    holder.stdout.once('data', resolveReady);
    holder.once('error', reject);
    holder.once('exit', () => reject(new Error('Lock holder exited before readiness')));
  });

  const result = run();

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /holds .deployment.lock/);
  assert.deepEqual(await readdir(backups), []);
});
