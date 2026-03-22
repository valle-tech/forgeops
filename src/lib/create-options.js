import { chooseFromList, askPort, question } from './prompt.js';
import { getGithubToken } from './github.js';
import {
  listAllTemplateIds,
  languageFromTemplateId,
  templateKeyForLanguage,
  defaultPort,
} from './scaffold.js';

export async function resolveCreateOptions(opts, command) {
  const fromCli = (k) => command.getOptionValueSource(k) === 'cli';
  const interactive =
    !opts.noInteractive &&
    process.stdin.isTTY &&
    !process.env.CI &&
    !process.env.FORGEOPS_NO_INTERACTIVE;

  let template = opts.template;
  let language = opts.language;

  if (interactive) {
    if (fromCli('template') && fromCli('language')) {
      language = String(opts.language).toLowerCase();
    } else if (!fromCli('template') && !fromCli('language')) {
      const all = await listAllTemplateIds();
      const defIdx = Math.max(0, all.indexOf('nestjs-clean'));
      template = await chooseFromList('Choose template:', all, defIdx);
      language = languageFromTemplateId(template);
    } else if (fromCli('language')) {
      language = String(opts.language).toLowerCase();
      template = templateKeyForLanguage(language);
    } else {
      language = languageFromTemplateId(template);
    }

    let database = fromCli('db') ? opts.db : undefined;
    if (database === undefined) {
      database = await chooseFromList('Database:', ['none', 'postgres', 'mongo'], 0);
    }

    let messaging = fromCli('messaging') ? opts.messaging : undefined;
    if (messaging === undefined) {
      messaging = await chooseFromList('Messaging:', ['none', 'kafka', 'rabbitmq'], 0);
    }

    let ci = fromCli('ci') ? opts.ci : undefined;
    if (ci === undefined) {
      ci = await chooseFromList('CI provider:', ['github', 'gitlab', 'none'], 0);
    }

    let infra = fromCli('infra') ? opts.infra : undefined;
    if (infra === undefined) {
      infra = await chooseFromList('Infra:', ['none', 'pulumi'], 0);
    }

    let port;
    if (fromCli('port')) {
      port = parseInt(String(opts.port), 10);
      if (Number.isNaN(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid --port: ${opts.port}`);
      }
    } else {
      port = await askPort(defaultPort(language));
    }

    let auth;
    if (fromCli('auth')) {
      auth = Boolean(opts.auth);
    } else {
      const a = await question('Enable JWT scaffolding? [y/N]: ');
      auth = /^y(es)?$/i.test(a);
    }

    let github;
    if (fromCli('github')) {
      github = Boolean(opts.github);
    } else if (getGithubToken()) {
      const a = await question('Create GitHub repo and push? (uses GITHUB_TOKEN) [y/N]: ');
      github = /^y(es)?$/i.test(a);
    } else {
      github = false;
    }

    return {
      template,
      language,
      database,
      messaging,
      ci,
      infra,
      port,
      auth,
      github,
      githubPublic: Boolean(opts.githubPublic),
    };
  }

  language = String(
    opts.language || languageFromTemplateId(opts.template || templateKeyForLanguage('node')),
  ).toLowerCase();
  template = opts.template || templateKeyForLanguage(language);
  let port =
    opts.port !== undefined && opts.port !== null && String(opts.port) !== ''
      ? parseInt(String(opts.port), 10)
      : defaultPort(language);
  if (Number.isNaN(port) || port < 1 || port > 65535) {
    port = defaultPort(language);
  }

  return {
    template,
    language,
    database: opts.db ?? 'none',
    messaging: opts.messaging ?? 'none',
    ci: opts.ci ?? 'github',
    infra: opts.infra ?? 'none',
    port,
    auth: Boolean(opts.auth),
    github: Boolean(opts.github),
    githubPublic: Boolean(opts.githubPublic),
  };
}
