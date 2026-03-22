import { readFile, writeFile } from 'node:fs/promises';

import { credentialsPath } from '../lib/paths.js';
import { promptLine } from '../cli/login-prompt.js';

export function registerAuthCommands(program) {
  program
    .command('login')
    .description('Store platform credentials locally (stub for future API auth)')
    .option('--email <email>')
    .option('--token <token>')
    .action(async (opts) => {
      let email = opts.email;
      let token = opts.token;
      if (!email) {
        email = await promptLine('Email: ');
      }
      if (!token) {
        token = await promptLine('Token: ', true);
      }
      const cred = { email, token, savedAt: new Date().toISOString() };
      await writeFile(credentialsPath(), JSON.stringify(cred, null, 2), 'utf8');
      console.log('Credentials saved to ~/.forgeops/credentials.json');
    });

  program
    .command('whoami')
    .description('Show saved login identity')
    .action(async () => {
      try {
        const raw = await readFile(credentialsPath(), 'utf8');
        const c = JSON.parse(raw);
        console.log(`Email: ${c.email || '(none)'}`);
        console.log(`Token: ${c.token ? '********' + String(c.token).slice(-4) : '(none)'}`);
      } catch {
        console.log('Not logged in. Run forgeops login');
      }
    });
}
