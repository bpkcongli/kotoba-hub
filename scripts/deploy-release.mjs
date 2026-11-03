import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isDeepStrictEqual, promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { createReleaseMetadata, readReleaseContext } from './release-metadata.mjs';

const execute = promisify(execFile);
const positive = /^[1-9][0-9]*$/;

async function readArchive(response) {
  const chunks = [];
  let size = 0;
  const reader = response.body?.getReader();

  if (!reader) throw new Error('Empty release archive.');

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return Buffer.concat(chunks);

      size += value.byteLength;
      if (size > 1_048_576) throw new Error('Release archive exceeds size limit.');

      chunks.push(Buffer.from(value));
    }
  } finally {
    await reader.cancel();
  }
}

export function validateDeployReceipt(state, request) {
  const fields = Object.fromEntries(
    state
      .trim()
      .split('\n')
      .map((line) => line.split('=')),
  );
  const lines = request.toString().trim().split('\n');

  for (const [key, value] of Object.entries({
    deployment: lines[2],
    commit: lines[3],
    publish_run: lines[4],
    publish_attempt: lines[5],
    app: lines[6],
    ops: lines[7],
    script_sha256: lines[1],
    script_version: '1',
  })) {
    if (fields[key] !== value)
      throw new Error(`VPS receipt differs from the selected deployment request (${key}).`);
  }

  if (!['running', 'success', 'failed', 'unknown'].includes(fields.result)) {
    throw new Error('Invalid VPS deployment result.');
  }

  return fields.result;
}

export function readDeployContext(env) {
  if (env.GITHUB_EVENT_NAME !== 'workflow_dispatch' || env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('Deployment requires workflow_dispatch from main.');
  }

  for (const key of ['PUBLISH_RUN_ID', 'GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT', 'VPS_PORT']) {
    if (!positive.test(env[key] ?? '')) throw new Error(`Invalid ${key}.`);
  }

  if (Number(env.VPS_PORT) > 65535) throw new Error('Invalid VPS_PORT.');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*$/.test(env.VPS_HOST ?? '')) {
    throw new Error('Invalid VPS_HOST; use an IPv4 address or SSH hostname.');
  }
  if (!/^[a-z_][a-z0-9_-]*$/.test(env.VPS_USER ?? '')) throw new Error('Invalid VPS_USER.');

  let url;

  try {
    url = new URL(env.APP_URL);
  } catch {
    throw new Error('Invalid APP_URL.');
  }

  if (url.protocol !== 'https:' || url.origin !== env.APP_URL || url.username || url.password) {
    throw new Error('APP_URL must be an HTTPS origin without a trailing slash.');
  }

  const release = readReleaseContext({
    ...env,
    GITHUB_EVENT_NAME: 'push',
    QUALITY_RESULT: 'success',
  });

  return {
    ...release,
    publishRunId: env.PUBLISH_RUN_ID,
    deployId: `${release.runId}-${release.runAttempt}`,
  };
}

export function validatePublishRun(run, workflow, context) {
  if (
    String(run.id) !== context.publishRunId ||
    run.repository?.full_name !== context.repository ||
    run.head_repository?.full_name !== context.repository ||
    run.path !== '.github/workflows/ci.yml' ||
    workflow.path !== '.github/workflows/ci.yml' ||
    workflow.id !== run.workflow_id ||
    run.event !== 'push' ||
    run.head_branch !== 'main' ||
    run.status !== 'completed' ||
    run.conclusion !== 'success' ||
    !/^[a-f0-9]{40}$/.test(run.head_sha ?? '') ||
    !positive.test(String(run.run_attempt))
  ) {
    throw new Error('Selected run must be a successful Quality push to main in this repository.');
  }
}

export function validatePublishJobs(jobs, run) {
  for (const name of ['quality', 'publish']) {
    const matches = jobs.filter((job) => job.name === name);

    if (
      matches.length !== 1 ||
      matches[0].status !== 'completed' ||
      matches[0].conclusion !== 'success' ||
      matches[0].head_sha !== run.head_sha ||
      String(matches[0].run_id) !== String(run.id) ||
      (matches[0].run_attempt !== undefined && matches[0].run_attempt !== run.run_attempt)
    ) {
      throw new Error(`Selected run attempt must contain one successful ${name} job.`);
    }
  }
}

export function validateDeployMetadata(metadata, run, context) {
  const release = readReleaseContext({
    GITHUB_EVENT_NAME: 'push',
    GITHUB_REF: 'refs/heads/main',
    QUALITY_RESULT: 'success',
    GITHUB_REPOSITORY: context.repository,
    GITHUB_SHA: run.head_sha,
    GITHUB_RUN_ID: String(run.id),
    GITHUB_RUN_ATTEMPT: String(run.run_attempt),
    DOCKERHUB_USERNAME: context.username,
    DOCKERHUB_REPOSITORY: context.image.split('/')[1],
  });

  const canonical = createReleaseMetadata(release, {
    app: metadata?.images?.app?.digest,
    ops: metadata?.images?.ops?.digest,
  });

  if (!isDeepStrictEqual(metadata, canonical)) {
    throw new Error('Release metadata does not match the trusted run, schema, or image allowlist.');
  }

  return canonical;
}

async function githubRequest(path, env, fetchImpl, redirect = 'error') {
  if (!env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required.');

  let response;

  try {
    response = await fetchImpl(`https://api.github.com/repos/${env.GITHUB_REPOSITORY}/${path}`, {
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      redirect,
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Error('GitHub request failed or timed out.');
  }

  if (!response.ok && response.status !== 302) {
    throw new Error(`GitHub request failed (HTTP ${response.status}).`);
  }

  return response;
}

async function collect(path, key, env, fetchImpl) {
  const items = [];

  for (let page = 1; page <= 100; page++) {
    const body = await (
      await githubRequest(`${path}?per_page=100&page=${page}`, env, fetchImpl)
    ).json();

    if (!Array.isArray(body[key])) throw new Error('Invalid GitHub list response.');

    items.push(...body[key]);
    if (body[key].length < 100) return items;
  }

  throw new Error('GitHub list exceeds deployment limit.');
}

export async function prepareDeploy(env = process.env, fetchImpl = fetch) {
  const context = readDeployContext(env);
  const base = `actions/runs/${context.publishRunId}`;
  const workflow = await (await githubRequest('actions/workflows/ci.yml', env, fetchImpl)).json();
  const run = await (await githubRequest(base, env, fetchImpl)).json();

  validatePublishRun(run, workflow, context);

  const jobs = await collect(`${base}/attempts/${run.run_attempt}/jobs`, 'jobs', env, fetchImpl);
  validatePublishJobs(jobs, run);

  const artifacts = (await collect(`${base}/artifacts`, 'artifacts', env, fetchImpl)).filter(
    (artifact) => artifact.name === 'release-metadata',
  );
  const artifact = artifacts[0];

  if (
    artifacts.length !== 1 ||
    artifact.expired !== false ||
    !positive.test(String(artifact.id)) ||
    !Number.isSafeInteger(artifact.size_in_bytes) ||
    artifact.size_in_bytes <= 0 ||
    artifact.size_in_bytes > 1_048_576 ||
    artifact.workflow_run?.id !== run.id ||
    artifact.workflow_run?.head_sha !== run.head_sha
  ) {
    throw new Error(
      'Expected one unexpired release-metadata artifact belonging to the selected run.',
    );
  }

  const redirect = await githubRequest(
    `actions/artifacts/${artifact.id}/zip`,
    env,
    fetchImpl,
    'manual',
  );
  const location = new URL(redirect.headers.get('location'));

  if (
    redirect.status !== 302 ||
    location.protocol !== 'https:' ||
    location.username ||
    location.password
  ) {
    throw new Error('Invalid GitHub artifact download redirect.');
  }

  // The signed artifact URL must never receive the GitHub Authorization header.
  let download;

  try {
    download = await fetchImpl(location, {
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new Error('Artifact download failed or timed out.');
  }

  if (!download.ok) throw new Error('Artifact download failed.');

  const archive = await readArchive(download);

  if (!env.RUNNER_TEMP) throw new Error('RUNNER_TEMP is required.');

  const dir = await mkdtemp(resolve(env.RUNNER_TEMP, 'deploy-metadata-'));
  let metadata;

  try {
    const zip = resolve(dir, 'release.zip');
    await writeFile(zip, archive, { mode: 0o600 });

    const { stdout: entries } = await execute('unzip', ['-Z1', zip], { maxBuffer: 65_536 });
    if (entries !== 'release-metadata.json\n')
      throw new Error('Unexpected release archive entries.');

    const { stdout } = await execute('unzip', ['-p', zip, 'release-metadata.json'], {
      maxBuffer: 65_536,
    });

    let decoded;

    try {
      decoded = JSON.parse(stdout);
    } catch {
      throw new Error('Release metadata must contain valid JSON.');
    }

    metadata = validateDeployMetadata(decoded, run, context);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  const current = await (await githubRequest(base, env, fetchImpl)).json();
  validatePublishRun(current, workflow, context);

  if (current.run_attempt !== run.run_attempt || current.head_sha !== run.head_sha) {
    throw new Error('Publish run changed during validation; select it again after completion.');
  }

  const scriptHash = createHash('sha256')
    .update(await readFile('scripts/deploy-production.sh'))
    .digest('hex');
  const request =
    [
      'kotoba-deploy-v1',
      scriptHash,
      context.deployId,
      metadata.commit,
      metadata.publishRun.id,
      metadata.publishRun.attempt,
      metadata.images.app.ref,
      metadata.images.ops.ref,
      env.APP_URL,
    ].join('\n') + '\n';

  await writeFile(resolve(env.RUNNER_TEMP, 'deploy.request'), request, { mode: 0o600, flag: 'wx' });

  if (env.GITHUB_STEP_SUMMARY) {
    await appendFile(
      env.GITHUB_STEP_SUMMARY,
      `Selected publish run ${metadata.publishRun.id}, attempt ${metadata.publishRun.attempt}\n\n` +
        `Commit: \`${metadata.commit}\`\n\nApp: \`${metadata.images.app.ref}\`\n\nOps: \`${metadata.images.ops.ref}\`\n`,
    );
  }
}

export async function deployOverSsh(env = process.env) {
  const context = readDeployContext(env);
  if (!env.VPS_SSH_PRIVATE_KEY || !env.VPS_SSH_KNOWN_HOSTS || !env.RUNNER_TEMP) {
    throw new Error('SSH key, verified known_hosts, and RUNNER_TEMP are required.');
  }

  const request = await readFile(resolve(env.RUNNER_TEMP, 'deploy.request'));
  const dir = await mkdtemp(resolve(env.RUNNER_TEMP, 'deploy-ssh-'));

  try {
    const key = resolve(dir, 'key');
    const hosts = resolve(dir, 'known_hosts');
    await writeFile(key, `${env.VPS_SSH_PRIVATE_KEY.trim()}\n`, { mode: 0o600 });
    await writeFile(hosts, `${env.VPS_SSH_KNOWN_HOSTS.trim()}\n`, { mode: 0o600 });

    const args = [
      '-F',
      '/dev/null',
      '-i',
      key,
      '-p',
      env.VPS_PORT,
      '-o',
      `UserKnownHostsFile=${hosts}`,
      '-o',
      'GlobalKnownHostsFile=/dev/null',
      '-o',
      'StrictHostKeyChecking=yes',
      '-o',
      'BatchMode=yes',
      '-o',
      'IdentitiesOnly=yes',
      '-o',
      'ConnectTimeout=15',
      '-o',
      'ServerAliveInterval=15',
      '-o',
      'ServerAliveCountMax=3',
      `${env.VPS_USER}@${env.VPS_HOST}`,
    ];

    const ssh = (command, input) =>
      new Promise((resolveCommand, reject) => {
        const child = execFile(
          'ssh',
          [...args, command],
          { timeout: 60_000, maxBuffer: 65_536 },
          (error, stdout) =>
            error
              ? reject(new Error('SSH command failed; inspect persisted VPS state before retry.'))
              : resolveCommand(stdout),
        );

        child.stdin.on('error', () => {});
        child.stdin.end(input);
      });

    // An uncertain start is recovered by querying the same id, never by starting another migration.

    try {
      console.log(await ssh('bash /opt/kotoba-hub/deploy.sh start', request));
    } catch {
      console.log(`Start acknowledgement unavailable; checking deployment ${context.deployId}.`);
    }

    let lastState;
    for (let attempt = 0; attempt < 150; attempt++) {
      let state;

      try {
        state = await ssh(`bash /opt/kotoba-hub/deploy.sh status ${context.deployId}`);
      } catch {
        if (attempt < 5) {
          await new Promise((done) => setTimeout(done, 10_000));
          continue;
        }
        throw new Error(`SSH recovery failed. Inspect .deployments/${context.deployId} on VPS.`);
      }

      const result = validateDeployReceipt(state, request);

      if (state !== lastState) {
        console.log(state.trim());
        lastState = state;
      }

      if (result === 'success') {
        if (env.GITHUB_STEP_SUMMARY) {
          await appendFile(
            env.GITHUB_STEP_SUMMARY,
            `\nVPS deployment result:\n\n\`\`\`text\n${state}\`\`\`\n`,
          );
        }

        return;
      }

      if (result !== 'running') {
        throw new Error(
          `Deployment failed or requires diagnosis. Inspect .deployments/${context.deployId} on VPS; no database restore was attempted.`,
        );
      }

      await new Promise((done) => setTimeout(done, 10_000));
    }
    throw new Error(
      `Deployment wait timed out; the worker may still be running. Inspect .deployments/${context.deployId} on VPS.`,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const command = process.argv[2];
  const operation =
    command === 'prepare' ? prepareDeploy : command === 'deploy' ? deployOverSsh : undefined;

  if (!operation) {
    console.error('Expected prepare or deploy command.');
    process.exitCode = 1;
  } else
    operation().catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
