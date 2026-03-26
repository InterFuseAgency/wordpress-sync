#!/usr/bin/env node
import { runCli } from './cli.js';
import { isDirectEntry } from './utils/is-direct-entry.js';

export interface NpxEntryHandlers {
  runCli: (argv: string[]) => Promise<void>;
}

const defaultHandlers: NpxEntryHandlers = {
  runCli
};

export async function runNpxEntry(
  argv: string[],
  handlers: NpxEntryHandlers = defaultHandlers
): Promise<void> {
  await handlers.runCli(argv);
}

if (isDirectEntry(import.meta.url)) {
  runNpxEntry(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
