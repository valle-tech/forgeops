import { homedir } from 'node:os';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

export function forgeOpsDir() {
  return path.join(homedir(), '.forgeops');
}

export async function ensureForgeOpsDir() {
  await mkdir(forgeOpsDir(), { recursive: true });
}

export function registryPath() {
  return path.join(forgeOpsDir(), 'registry.json');
}

export function userConfigPath() {
  return path.join(forgeOpsDir(), 'config.json');
}

export function credentialsPath() {
  return path.join(forgeOpsDir(), 'credentials.json');
}

export function customTemplatesDir() {
  return path.join(forgeOpsDir(), 'templates');
}
