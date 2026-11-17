import { appendFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const imagePart = /^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*$/;
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const manifestTypes = [
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
  'application/vnd.docker.distribution.manifest.v2+json',
].join(', ');

export function readReleaseContext(env) {
  if (env.GITHUB_EVENT_NAME !== 'push' || env.GITHUB_REF !== 'refs/heads/main') {
    throw new Error('Publishing requires a push to main.');
  }
  if (env.QUALITY_RESULT !== 'success') throw new Error('Quality must succeed before publish.');

  if (!/^[a-f0-9]{40}$/.test(env.GITHUB_SHA ?? '')) throw new Error('Invalid release commit.');
  if (!/^[\w.-]+\/[\w.-]+$/.test(env.GITHUB_REPOSITORY ?? '')) {
    throw new Error('Invalid GitHub repository.');
  }

  for (const key of ['GITHUB_RUN_ID', 'GITHUB_RUN_ATTEMPT']) {
    if (!/^[1-9][0-9]*$/.test(env[key] ?? '')) throw new Error(`Invalid ${key}.`);
  }

  for (const key of ['DOCKERHUB_USERNAME', 'DOCKERHUB_REPOSITORY']) {
    if (!imagePart.test(env[key] ?? '')) throw new Error(`Invalid ${key}.`);
  }

  const image = `${env.DOCKERHUB_USERNAME}/${env.DOCKERHUB_REPOSITORY}`;
  if (image.length > 255) throw new Error('Docker Hub image name is too long.');

  return {
    commit: env.GITHUB_SHA,
    repository: env.GITHUB_REPOSITORY,
    image,
    username: env.DOCKERHUB_USERNAME,
    runId: env.GITHUB_RUN_ID,
    runAttempt: env.GITHUB_RUN_ATTEMPT,
    tags: { app: `sha-${env.GITHUB_SHA}`, ops: `ops-sha-${env.GITHUB_SHA}` },
  };
}

export function createReleaseMetadata(context, digests) {
  const images = {};

  for (const [name, target] of [
    ['app', 'runner'],
    ['ops', 'ops'],
  ]) {
    const digest = digests[name];
    if (!digestPattern.test(digest ?? '')) throw new Error(`Invalid ${name} digest.`);

    images[name] = {
      target,
      tag: `docker.io/${context.image}:${context.tags[name]}`,
      digest,
      ref: `docker.io/${context.image}@${digest}`,
    };
  }

  return {
    schemaVersion: 1,
    commit: context.commit,
    repository: context.repository,
    workflow: '.github/workflows/ci.yml',
    publishRun: {
      id: context.runId,
      attempt: context.runAttempt,
      url: `https://github.com/${context.repository}/actions/runs/${context.runId}/attempts/${context.runAttempt}`,
    },
    quality: { job: 'quality', result: 'success' },
    platform: 'linux/amd64',
    images,
  };
}

async function registryRequest(fetchImpl, url, options) {
  try {
    return await fetchImpl(url, {
      ...options,
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    // Fetch errors can include request details; credentials must never reach the log.
    throw new Error('Docker Hub request failed or timed out.');
  }
}

export async function checkRegistry(context, credential, digests, fetchImpl = fetch) {
  if (!credential || /[\r\n]/.test(credential)) throw new Error('DOCKERHUB_TOKEN is required.');
  if (digests) createReleaseMetadata(context, digests);

  const authUrl = new URL('https://auth.docker.io/token');
  authUrl.searchParams.set('service', 'registry.docker.io');
  authUrl.searchParams.set('scope', `repository:${context.image}:pull`);
  const auth = await registryRequest(fetchImpl, authUrl, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${context.username}:${credential}`).toString('base64')}`,
    },
  });
  if (!auth.ok) throw new Error(`Docker Hub authentication failed (HTTP ${auth.status}).`);

  let token;
  try {
    const body = await auth.json();
    token = body.token ?? body.access_token;
  } catch {
    throw new Error('Invalid Docker Hub token response.');
  }
  if (typeof token !== 'string' || !token || /[\r\n]/.test(token)) {
    throw new Error('Invalid Docker Hub token response.');
  }

  for (const name of ['app', 'ops']) {
    const response = await registryRequest(
      fetchImpl,
      `https://registry-1.docker.io/v2/${context.image}/manifests/${context.tags[name]}`,
      { method: 'HEAD', headers: { Authorization: `Bearer ${token}`, Accept: manifestTypes } },
    );
    if (!digests) {
      if (response.status === 404) continue;
      if (response.ok) throw new Error(`${name} commit tag already exists; refusing to overwrite.`);
    } else if (response.ok) {
      if (response.headers.get('docker-content-digest') !== digests[name]) {
        throw new Error(`${name} registry digest does not match the published build.`);
      }
      continue;
    }
    throw new Error(`Cannot verify ${name} commit tag (HTTP ${response.status}).`);
  }
}

export async function runReleaseCommand(command, env = process.env, fetchImpl = fetch) {
  const context = readReleaseContext(env);

  if (command === 'prepare') {
    await checkRegistry(context, env.DOCKERHUB_TOKEN, undefined, fetchImpl);

    if (!env.GITHUB_OUTPUT) throw new Error('GITHUB_OUTPUT is required.');
    await appendFile(
      env.GITHUB_OUTPUT,
      `app_tag=docker.io/${context.image}:${context.tags.app}\nops_tag=docker.io/${context.image}:${context.tags.ops}\n`,
    );

    return;
  }

  if (command !== 'write') throw new Error('Expected prepare or write command.');

  const digests = { app: env.APP_DIGEST, ops: env.OPS_DIGEST };
  const metadata = createReleaseMetadata(context, digests);

  await checkRegistry(context, env.DOCKERHUB_TOKEN, digests, fetchImpl);

  if (!env.RUNNER_TEMP) throw new Error('RUNNER_TEMP is required.');
  await writeFile(
    resolve(env.RUNNER_TEMP, 'release-metadata.json'),
    `${JSON.stringify(metadata, null, 2)}\n`,
    {
      flag: 'wx',
    },
  );

  if (env.GITHUB_STEP_SUMMARY) {
    await appendFile(
      env.GITHUB_STEP_SUMMARY,
      `Published commit \`${context.commit}\`\n\n- App: \`${metadata.images.app.ref}\`\n- Ops: \`${metadata.images.ops.ref}\`\n`,
    );
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runReleaseCommand(process.argv[2]).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
