import { getConfigValue, setConfigValue } from '../lib/config-store.js';

export function registerUserConfigCommands(program) {
  const cfg = program.command('config').description('Read/write ~/.forgeops/config.json (dot paths, e.g. github.token)');

  cfg
    .command('set')
    .argument('<key>', 'Dot path, e.g. github.token')
    .argument('[values...]', 'Value (remaining words are joined with spaces)')
    .description('Set a nested config value')
    .action(async (key, values) => {
      const value = Array.isArray(values) ? values.join(' ') : String(values ?? '');
      if (!value.trim()) {
        console.error('Value required, e.g. forgeops config set github.token ghp_xxx');
        process.exitCode = 1;
        return;
      }
      await setConfigValue(key, value);
      console.log(`Set ${key}`);
    });

  cfg
    .command('get')
    .argument('<key>', 'Dot path')
    .description('Print a nested config value')
    .action(async (key) => {
      const v = await getConfigValue(key);
      if (v === undefined) {
        console.log('(not set)');
        process.exitCode = 1;
        return;
      }
      console.log(typeof v === 'object' ? JSON.stringify(v) : String(v));
    });
}
