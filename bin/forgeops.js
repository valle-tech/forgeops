#!/usr/bin/env node
import { runCli } from '../src/index.js';

runCli(process.argv).catch((err) => {
  console.error(err.message || String(err));
  process.exitCode = 1;
});
