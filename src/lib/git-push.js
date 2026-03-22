import { run as runCmd } from './exec.js';

const DEFAULT_NAME = 'forgeops';
const DEFAULT_EMAIL = 'forgeops@users.noreply.github.com';

export async function initCommitAndPush({ dir, owner, repo, token }) {
  const authorName = process.env.FORGEOPS_GIT_USER_NAME || DEFAULT_NAME;
  const authorEmail = process.env.FORGEOPS_GIT_USER_EMAIL || DEFAULT_EMAIL;
  const cwd = dir;
  const authedRemote = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' };

  await runCmd('git', ['init'], { cwd, env });
  await runCmd('git', ['config', 'user.name', authorName], { cwd, env });
  await runCmd('git', ['config', 'user.email', authorEmail], { cwd, env });
  await runCmd('git', ['checkout', '-B', 'main'], { cwd, env });
  await runCmd('git', ['add', '.'], { cwd, env });
  await runCmd('git', ['commit', '-m', 'chore: initial commit from forgeops', '--no-verify'], { cwd, env });
  await runCmd('git', ['remote', 'add', 'origin', `https://github.com/${owner}/${repo}.git`], { cwd, env });
  await runCmd('git', ['push', '-u', authedRemote, 'main'], { cwd, env });
}
