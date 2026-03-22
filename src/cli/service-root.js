import { resolveServiceRoot } from '../lib/registry.js';

/**
 * @returns {Promise<{ root: string, entry: object, source: string } | null>}
 */
export async function resolveServiceOrExit(name) {
  const ctx = await resolveServiceRoot(name);
  if (!ctx.root) {
    console.error(`Unknown service: ${name}`);
    process.exitCode = 1;
    return null;
  }
  return ctx;
}
