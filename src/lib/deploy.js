import { access, constants } from 'node:fs/promises';
import path from 'node:path';

import { run, runCapture, runWithInput, whichAvailable } from './exec.js';

const DEPLOY_ENVS = new Set(['dev', 'staging', 'prod']);

export function normalizeDeployEnvironment(raw) {
  const env = String(raw || 'dev').trim().toLowerCase();
  if (!DEPLOY_ENVS.has(env)) {
    throw new Error(`Unsupported deploy environment "${raw}". Use dev, staging, or prod.`);
  }
  return env;
}

async function fileExists(p) {
  try {
    await access(p, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function requireCommand(cmd, hint) {
  if (await whichAvailable(cmd)) return;
  throw new Error(`${cmd} CLI not found. ${hint}`);
}

async function ensurePulumiDependencies(infraDir) {
  if (await fileExists(path.join(infraDir, 'node_modules'))) return;
  await requireCommand('npm', 'Install Node.js/npm to install the generated Pulumi project dependencies.');
  console.log('Installing Pulumi project dependencies in infra/ ...');
  await run('npm', ['install'], { cwd: infraDir });
}

async function selectOrInitPulumiStack(infraDir, stack) {
  try {
    await run('pulumi', ['stack', 'select', stack], { cwd: infraDir });
  } catch {
    await run('pulumi', ['stack', 'init', stack], { cwd: infraDir });
  }
}

async function setPulumiConfig(infraDir, stack, key, value) {
  await run('pulumi', ['config', 'set', key, String(value), '--stack', stack, '--plaintext'], { cwd: infraDir });
}

async function readPulumiOutputs(infraDir, stack) {
  const { stdout } = await runCapture('pulumi', ['stack', 'output', '--json', '--stack', stack], { cwd: infraDir });
  return JSON.parse(stdout);
}

function buildImageTag(serviceSlug, env, rawTag) {
  if (rawTag) return String(rawTag).trim();
  return `${env}-${serviceSlug}-${Date.now()}`;
}

async function loginToEcr(repositoryUrl, region, cwd) {
  const registry = String(repositoryUrl || '').split('/')[0];
  if (!registry) throw new Error('Could not determine the ECR registry URL from Pulumi outputs.');
  const { stdout } = await runCapture('aws', ['ecr', 'get-login-password', '--region', region], { cwd });
  await runWithInput('docker', ['login', '--username', 'AWS', '--password-stdin', registry], stdout, { cwd });
}

async function waitForEcsStability(outputs, root) {
  if (!outputs.ecsClusterName || !outputs.ecsServiceName || !outputs.awsRegion) return false;
  if (!(await whichAvailable('aws'))) return false;
  await run(
    'aws',
    ['ecs', 'wait', 'services-stable', '--cluster', outputs.ecsClusterName, '--services', outputs.ecsServiceName, '--region', outputs.awsRegion],
    { cwd: root },
  );
  return true;
}

async function waitForHealthcheck(baseUrl, env) {
  const deadline = Date.now() + 180000;
  const trimmed = String(baseUrl || '').replace(/\/+$/, '');
  const url = `${trimmed}/health`;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { headers: { 'x-forgeops-env': env } });
      if (res.ok) return true;
    } catch {
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`Deployment became reachable at ${trimmed}, but /health did not return 200 within 180 seconds.`);
}

export async function deployPulumiService(root, manifest, opts = {}) {
  const env = normalizeDeployEnvironment(opts.env);
  const infraDir = path.join(root, 'infra');
  if (!(await fileExists(infraDir))) {
    throw new Error(`No infra/ directory found in ${root}. Create the service with --infra pulumi or provision infrastructure first.`);
  }
  await requireCommand('pulumi', 'Install the Pulumi CLI to deploy AWS-backed services.');
  await requireCommand('docker', 'Install Docker to build and push the service image.');
  await requireCommand('aws', 'Install and configure the AWS CLI so Forgeops can push to ECR and update ECS.');
  await ensurePulumiDependencies(infraDir);
  await selectOrInitPulumiStack(infraDir, env);

  console.log(`Provisioning shared infrastructure for ${env} ...`);
  await run('pulumi', ['up', '--yes', '--stack', env], { cwd: infraDir });
  const initialOutputs = await readPulumiOutputs(infraDir, env);

  if (!initialOutputs.ecrRepositoryUrl) {
    throw new Error('Pulumi stack did not expose ecrRepositoryUrl. Re-run with the updated forgeops-generated infra template.');
  }

  const imageTag = buildImageTag(manifest.serviceSlug || manifest.slug || manifest.name || 'service', env, opts.imageTag);
  const remoteTag = `${initialOutputs.ecrRepositoryUrl}:${imageTag}`;

  console.log(`Logging in to ECR and pushing ${remoteTag} ...`);
  await loginToEcr(initialOutputs.ecrRepositoryUrl, initialOutputs.awsRegion, root);
  await run('docker', ['build', '-t', remoteTag, '.'], { cwd: root });
  await run('docker', ['push', remoteTag], { cwd: root });

  await setPulumiConfig(infraDir, env, 'imageTag', imageTag);
  await setPulumiConfig(infraDir, env, 'desiredCount', '1');

  console.log(`Rolling out ${manifest.serviceName || manifest.name} to ${env} ...`);
  await run('pulumi', ['up', '--yes', '--stack', env], { cwd: infraDir });
  const outputs = await readPulumiOutputs(infraDir, env);

  if (opts.wait) {
    const waitedForEcs = await waitForEcsStability(outputs, root);
    if (!waitedForEcs) {
      console.warn('Skipping ECS stability wait because ecsClusterName/ecsServiceName outputs or the AWS CLI are unavailable.');
    }
    if (outputs.serviceUrl) {
      await waitForHealthcheck(outputs.serviceUrl, env);
    } else {
      console.warn('Skipping HTTP health verification because the Pulumi stack did not expose a serviceUrl output.');
    }
  }

  return {
    env,
    imageTag,
    imageUri: remoteTag,
    serviceUrl: outputs.serviceUrl || '',
  };
}

export async function triggerGitHubWorkflow(root, env) {
  const wf = path.join(root, '.github', 'workflows', 'ci.yml');
  if (!(await fileExists(wf))) return false;
  if (!(await whichAvailable('gh'))) return false;
  await run('gh', ['workflow', 'run', 'ci.yml', '-f', `environment=${env}`], { cwd: root, stdio: 'inherit' });
  return true;
}
