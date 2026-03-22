import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

export async function question(q) {
  const rl = readline.createInterface({ input, output });
  try {
    return (await rl.question(q)).trim();
  } finally {
    rl.close();
  }
}

export async function chooseFromList(message, choices, defaultIndex = 0) {
  console.log(message);
  choices.forEach((c, i) => console.log(`  ${i + 1}) ${c}`));
  const def = defaultIndex + 1;
  const raw = await question(`Enter choice [${def}]: `);
  const n = raw === '' ? def : parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1 || n > choices.length) {
    return choices[defaultIndex];
  }
  return choices[n - 1];
}

export async function askPort(defaultPort) {
  const raw = await question(`HTTP port [${defaultPort}]: `);
  if (raw === '') return defaultPort;
  const p = parseInt(raw, 10);
  if (Number.isNaN(p) || p < 1 || p > 65535) {
    console.log(`Invalid port, using ${defaultPort}.`);
    return defaultPort;
  }
  return p;
}
