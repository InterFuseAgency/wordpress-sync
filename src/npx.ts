#!/usr/bin/env node
import { runCli } from './cli.js';
import { runMcpServer } from './mcp/server.js';
import { isDirectEntry } from './utils/is-direct-entry.js';

export interface NpxEntryHandlers {
  runCli: (argv: string[]) => Promise<void>;
  runMcp: (argv: string[]) => Promise<void>;
}

const defaultHandlers: NpxEntryHandlers = {
  runCli,
  runMcp: async () => runMcpServer()
};

export async function runNpxEntry(
  argv: string[],
  handlers: NpxEntryHandlers = defaultHandlers
): Promise<void> {
  const [command, ...rest] = argv;
  if (command === 'mcp' || command === 'server') {
    await handlers.runMcp(rest);
    return;
  }

  await handlers.runCli(argv);
}

if (isDirectEntry(import.meta.url)) {
  runNpxEntry(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
