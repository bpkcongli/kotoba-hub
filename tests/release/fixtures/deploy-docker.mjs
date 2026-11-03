#!/usr/bin/env node
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.KOTOBA_DEPLOY_DIR;
const args = process.argv.slice(2);

appendFileSync(join(root, 'calls.jsonl'), `${JSON.stringify(args)}\n`);

const config = JSON.parse(readFileSync(join(root, 'fixture.json'), 'utf8'));

const release = () =>
  Object.fromEntries(
    readFileSync(args[args.indexOf('--env-file') + 1], 'utf8')
      .trim()
      .split('\n')
      .map((line) => line.split('=')),
  );
const active = () => readFileSync(join(root, 'active-app'), 'utf8');
const out = (value) => writeFileSync(1, `${value}\n`);

if (args[0] === 'info') out(root);
else if (args[0] === 'rm') process.exit(0);
else if (args[0] === 'image') {
  out(args.includes('{{.Id}}') ? `id-${args.at(-1)}` : config.commit);
} else if (args[0] === 'inspect') {
  const mysql = args.at(-1) === 'mysql-container';
  const format = args[args.indexOf('-f') + 1];

  if (format === '{{.State.Health.Status}}') out('healthy');
  else if (format === '{{.Config.Image}}') out(mysql ? config.mysql : active());
  else if (format === '{{.Image}}') out(`id-${active()}`);
  else process.exit(99);
} else if (args[0] === 'compose') {
  if (args.includes('version') || args.includes('config')) process.exit(0);
  else if (args.includes('ps')) out(args.at(-1) === 'mysql' ? 'mysql-container' : 'app-container');
  else if (args.includes('pull')) process.exit(config.failure === 'pull' ? 1 : 0);
  else if (args.includes('exec')) {
    if (config.failure === 'backup') process.exit(1);

    out('CREATE TABLE test (id INT);');
  } else if (args.includes('run')) {
    if (config.delay) await new Promise((done) => setTimeout(done, config.delay));

    process.exit(config.failure === 'migration' ? 1 : 0);
  } else if (args.includes('up')) {
    writeFileSync(join(root, 'active-app'), release().APP_IMAGE);
    process.exit(config.failure === 'startup' ? 1 : 0);
  } else process.exit(99);
} else process.exit(99);
