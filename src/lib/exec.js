import { access, constants } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';

export function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: opts.stdio ?? 'inherit',
      shell: false,
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
    });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      if (signal) reject(new Error(`Command killed (${signal})`));
      else if (code !== 0) reject(new Error(`Command exited with code ${code}`));
      else resolve();
    });
  });
}

export async function whichAvailable(cmd) {
  return new Promise((resolve) => {
    const child = spawn(process.platform === 'win32' ? 'where' : 'which', [cmd], {
      stdio: 'ignore',
    });
    child.on('close', (code) => resolve(code === 0));
    child.on('error', () => resolve(false));
  });
}

export async function composeFileInDir(cwd) {
  for (const f of ['docker-compose.yml', 'docker-compose.yaml']) {
    try {
      await access(path.join(cwd, f), constants.F_OK);
      return f;
    } catch {
    }
  }
  return null;
}

export async function runDockerComposeUp(cwd, { detach = false } = {}) {
  const file = await composeFileInDir(cwd);
  if (!file) {
    throw new Error(`No docker-compose.yml (or .yaml) in ${cwd}`);
  }
  const upArgs = ['up', ...(detach ? ['-d'] : [])];
  try {
    await run('docker', ['compose', ...upArgs], { cwd });
  } catch (e1) {
    try {
      await run('docker-compose', upArgs, { cwd });
    } catch (e2) {
      throw new Error(
        `Could not start Compose in ${cwd}.\n  docker compose: ${e1.message || e1}\n  docker-compose: ${e2.message || e2}`,
      );
    }
  }
}

export async function runDockerComposeLogs(cwd, serviceName, { follow = true } = {}) {
  const file = await composeFileInDir(cwd);
  if (!file) {
    throw new Error(`No docker-compose.yml (or .yaml) in ${cwd}`);
  }
  const logArgs = ['logs', ...(follow ? ['-f'] : []), serviceName];
  try {
    await run('docker', ['compose', ...logArgs], { cwd });
  } catch (e1) {
    try {
      await run('docker-compose', logArgs, { cwd });
    } catch (e2) {
      throw new Error(
        `Could not stream logs in ${cwd}.\n  docker compose: ${e1.message || e1}\n  docker-compose: ${e2.message || e2}`,
      );
    }
  }
}
