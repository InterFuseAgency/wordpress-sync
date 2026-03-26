#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { runCli } from './cli.js';
import { runMcpServer } from './mcp/server.js';

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

const directEntryHref = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : undefined;

if (directEntryHref && import.meta.url === directEntryHref) {
  runNpxEntry(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
