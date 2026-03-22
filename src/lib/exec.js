import { spawn } from 'node:child_process';

export function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
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
