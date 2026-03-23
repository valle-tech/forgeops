export {
  normalizeName,
  serviceSlug,
  templateKeyForLanguage,
  languageFromTemplateId,
  defaultPort,
  exampleDbUrl,
  replacements,
  projectVarsFromManifest,
  resolveTemplateSource,
  mergeTemplateMissingFiles,
  collectMissingTemplatePaths,
  listBuiltinTemplateIds,
  builtinTemplatePath,
  copyTemplateIntoCustom,
  scaffoldService,
} from './scaffold-service.js';

export { writeGitHubCI, writeGitLabCI } from './ci.js';
export { writeDockerCompose, manifestToComposeVars, regenerateDockerCompose } from './compose.js';
export { writeMessagingExtras, writeDatabaseExtras, writeAuthExtras } from './extras.js';
export { listAllTemplateIds } from './shared.js';
