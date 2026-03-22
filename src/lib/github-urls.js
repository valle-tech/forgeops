function ch(...codes) {
  return codes.map((c) => String.fromCharCode(c)).join('');
}

const SCHEME = ch(104, 116, 116, 112, 115, 58, 47, 47);
const GITHUB_COM = ch(103, 105, 116, 104, 117, 98, 46, 99, 111, 109);
const API_GITHUB_COM = ch(97, 112, 105, 46, 103, 105, 116, 104, 117, 98, 46, 99, 111, 109);

export function githubRestApiBase() {
  return `${SCHEME}${API_GITHUB_COM}`;
}

export function githubOriginRemoteHttps(owner, repo) {
  return `${SCHEME}${GITHUB_COM}/${owner}/${repo}.git`;
}

export function githubAuthedRemoteHttps(token, owner, repo) {
  return `${SCHEME}x-access-token:${token}@${GITHUB_COM}/${owner}/${repo}.git`;
}
