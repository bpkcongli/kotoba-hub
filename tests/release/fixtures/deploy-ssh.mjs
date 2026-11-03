#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const args = process.argv.slice(2);

assert.ok(args.includes('StrictHostKeyChecking=yes'));
assert.ok(args.includes('BatchMode=yes'));
assert.ok(args.includes('IdentitiesOnly=yes'));
assert.equal(args[args.indexOf('-F') + 1], '/dev/null');

const key = args[args.indexOf('-i') + 1];
const hosts = args.find((arg) => arg.startsWith('UserKnownHostsFile=')).split('=')[1];

assert.equal(statSync(key).mode & 0o777, 0o600);
assert.equal(statSync(hosts).mode & 0o777, 0o600);

assert.match(readFileSync(key, 'utf8'), /fake-private-key/);
assert.match(readFileSync(hosts, 'utf8'), /fake-known-host/);

const command = args.at(-1);
const request = readFileSync(join(process.env.RUNNER_TEMP, 'deploy.request'), 'utf8');

if (command === 'bash /opt/kotoba-hub/deploy.sh start') {
  assert.equal(readFileSync(0, 'utf8'), request);
  writeFileSync(join(process.env.RUNNER_TEMP, 'ssh-checked'), 'strict');
  writeFileSync(1, 'Started\n');
} else {
  const lines = request.trim().split('\n');
  assert.equal(command, `bash /opt/kotoba-hub/deploy.sh status ${lines[2]}`);

  writeFileSync(
    1,
    `result=success\ndeployment=${lines[2]}\ncommit=${lines[3]}\npublish_run=${lines[4]}\npublish_attempt=${lines[5]}\napp=${lines[6]}\nops=${lines[7]}\nscript_sha256=${lines[1]}\nscript_version=1\n`,
  );
}
