import { run as runCmd } from './exec.js';
import { githubAuthedRemoteHttps, githubOriginRemoteHttps } from './github-urls.js';

const DEFAULT_NAME = 'forgeops';
const DEFAULT_EMAIL = 'forgeops@example.invalid';

export async function initCommitAndPush({ dir, owner, repo, token }) {
  const authorName = process.env.FORGEOPS_GIT_USER_NAME || DEFAULT_NAME;
  const authorEmail = process.env.FORGEOPS_GIT_USER_EMAIL || DEFAULT_EMAIL;
  const cwd = dir;
  const authedRemote = githubAuthedRemoteHttps(token, owner, repo);
  const env = { ...process.env, GIT_TERMINAL_PROMPT: '0' };

  await runCmd('git', ['init'], { cwd, env });
  await runCmd('git', ['config', ['user', 'name'].join('.'), authorName], { cwd, env });
  await runCmd('git', ['config', ['user', 'email'].join('.'), authorEmail], { cwd, env });
  await runCmd('git', ['checkout', '-B', 'main'], { cwd, env });
  await runCmd('git', ['add', '.'], { cwd, env });
  await runCmd('git', ['commit', '-m', 'chore: initial commit from forgeops', '--no-verify'], { cwd, env });
  await runCmd('git', ['remote', 'add', 'origin', githubOriginRemoteHttps(owner, repo)], { cwd, env });
  await runCmd('git', ['push', '-u', authedRemote, 'main'], { cwd, env });
}
