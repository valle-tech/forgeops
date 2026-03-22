import { resolveServiceRoot } from '../lib/registry.js';

export async function resolveServiceOrExit(name) {
  const ctx = await resolveServiceRoot(name);
  if (!ctx.root) {
    console.error(`Unknown service: ${name}`);
    process.exitCode = 1;
    return null;
  }
  return ctx;
}
