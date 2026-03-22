import { githubRestApiBase } from './github-urls.js';

const GITHUB_API = githubRestApiBase();

export function getGithubToken() {
  return (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || '').trim();
}

export async function resolveGithubToken() {
  const env = getGithubToken();
  if (env) return env;
  const { getConfigValue } = await import('./config-store.js');
  const v = await getConfigValue('github.token');
  return String(v || '').trim();
}

export async function githubFetch(path, token, opts = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...opts,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { message: text };
  }
  if (!res.ok) {
    const msg = body.message || body.errors?.[0]?.message || res.statusText || `HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body;
}

export async function getViewerLogin(token) {
  const u = await githubFetch('/user', token);
  if (!u?.login) throw new Error('GitHub API did not return a user login');
  return u.login;
}

export async function createUserRepository(token, { name, description, private: isPrivate = true }) {
  return githubFetch('/user/repos', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      description: description || `Service ${name} (scaffolded with forgeops)`,
      private: isPrivate,
      auto_init: false,
    }),
  });
}
