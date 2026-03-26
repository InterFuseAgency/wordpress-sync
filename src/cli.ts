#!/usr/bin/env node
import { Command } from 'commander';
import path from 'node:path';
import { SyncEngine } from './core/engine.js';
import { createProvider, type ProviderMode } from './providers/factory.js';
import type { CommitResult, HistoryMode, PushResult, SyncDiff } from './types.js';
import { isDirectEntry } from './utils/is-direct-entry.js';

type EngineLike = Pick<
  SyncEngine,
  'init' | 'pull' | 'status' | 'commit' | 'push' | 'rollback' | 'pushFile'
>;

export interface CliGlobalOptions {
  root: string;
  provider: ProviderMode;
  historyMode: HistoryMode;
}

export interface EngineContext {
  engine: EngineLike;
  cleanup?: () => Promise<void>;
}

export type EngineFactory = (
  options: CliGlobalOptions
) => Promise<EngineLike | EngineContext>;

function isEngineContext(input: EngineLike | EngineContext): input is EngineContext {
  return 'engine' in input;
}

function defaultFactory(options: CliGlobalOptions): Promise<EngineContext> {
  const providerResult = createProvider({
    mode: options.provider,
    cwd: options.root
  });
  return Promise.resolve({
    engine: new SyncEngine(options.root, providerResult.provider, {
      historyMode: options.historyMode
    }),
    cleanup: providerResult.cleanup
  });
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function withEngine<T>(
  options: CliGlobalOptions,
  engineFactory: EngineFactory,
  run: (engine: EngineLike) => Promise<T>
): Promise<T> {
  const candidate = await engineFactory(options);
  const context = isEngineContext(candidate)
    ? candidate
    : { engine: candidate, cleanup: undefined };

  try {
    return await run(context.engine);
  } finally {
    if (context.cleanup) {
      await context.cleanup();
    }
  }
}

export async function runCli(
  argv: string[],
  engineFactory: EngineFactory = defaultFactory
): Promise<void> {
  const program = new Command();
  program
    .name('wordpress-sync')
    .option('--root <path>', 'workspace root', process.cwd())
    .option('--provider <mode>', 'provider mode: rest|mcp', 'rest')
    .option(
      '--history-mode <mode>',
      'history mode: json-patch|full (env: WP_SYNC_HISTORY_MODE)',
      process.env.WP_SYNC_HISTORY_MODE ?? 'json-patch'
    )
    .showSuggestionAfterError();

  const getGlobals = (): CliGlobalOptions => {
    const opts = program.opts<{ root: string; provider: string; historyMode: string }>();
    const provider = opts.provider === 'mcp' ? 'mcp' : 'rest';
    return {
      root: path.resolve(opts.root),
      provider,
      historyMode: SyncEngine.historyModeFromCli(opts.historyMode)
    };
  };

  program
    .command('init')
    .description('Initialize wordpress workspace files')
    .action(async () => {
      await withEngine(getGlobals(), engineFactory, async (engine) => {
        await engine.init();
      });
      printJson({ ok: true });
    });

  program
    .command('pull')
    .option('--all', 'pull all pages and components')
    .option('--id <id>', 'pull by id')
    .option('--kind <kind>', 'page|component')
    .option('--slug <slug>', 'pull by slug')
    .option('--history-mode <mode>', 'override history mode for this command')
    .action(async (args) => {
      const id = args.id !== undefined ? Number.parseInt(args.id, 10) : undefined;
      const kind = args.kind ? SyncEngine.kindFromCli(args.kind) : undefined;
      const historyModeInput =
        (args.historyMode as string | undefined) ??
        program.opts<{ historyMode?: string }>().historyMode;
      const historyMode = historyModeInput
        ? SyncEngine.historyModeFromCli(historyModeInput)
        : undefined;
      const selector = {
        all: Boolean(args.all),
        id,
        kind,
        slug: args.slug as string | undefined
      };

      const result = await withEngine(getGlobals(), engineFactory, (engine) =>
        engine.pull(selector, { historyMode })
      );
      printJson({ pulled: result });
    });

  program
    .command('status')
    .action(async () => {
      const result = await withEngine(getGlobals(), engineFactory, (engine) =>
        engine.status()
      );
      printJson(result satisfies SyncDiff);
    });

  program
    .command('commit')
    .requiredOption('-m, --message <message>', 'commit message')
    .option('--all', 'commit all changed files')
    .option('--file <file>', 'commit one file')
    .option('--history-mode <mode>', 'override history mode for this command')
    .action(async (args) => {
      const historyModeInput =
        (args.historyMode as string | undefined) ??
        program.opts<{ historyMode?: string }>().historyMode;
      const historyMode = historyModeInput
        ? SyncEngine.historyModeFromCli(historyModeInput)
        : undefined;
      const result = await withEngine(getGlobals(), engineFactory, (engine) =>
        engine.commit({
          all: Boolean(args.all),
          file: args.file as string | undefined,
          message: args.message as string
        }, { historyMode })
      );
      printJson(result satisfies CommitResult);
    });

  program
    .command('push')
    .option('--all', 'push all tracked objects')
    .option('--file <file>', 'push a single JSON file')
    .option('--id <id>', 'push by object id')
    .option('--kind <kind>', 'page|component')
    .option('--dry-run', 'calculate push result without uploading')
    .action(async (args) => {
      const id = args.id !== undefined ? Number.parseInt(args.id, 10) : undefined;
      const kind = args.kind ? SyncEngine.kindFromCli(args.kind) : undefined;
      const result = await withEngine(getGlobals(), engineFactory, (engine) =>
        engine.push({
          all: Boolean(args.all),
          file: args.file as string | undefined,
          id,
          kind,
          dryRun: Boolean(args.dryRun)
        })
      );
      printJson(result satisfies PushResult);
    });

  program
    .command('rollback <commitId>')
    .option('--file <file>', 'rollback only a single file')
    .option('--id <id>', 'rollback by object id')
    .option('--kind <kind>', 'page|component')
    .action(async (commitId: string, args) => {
      const id = args.id !== undefined ? Number.parseInt(args.id, 10) : undefined;
      const kind = args.kind ? SyncEngine.kindFromCli(args.kind) : undefined;
      await withEngine(getGlobals(), engineFactory, (engine) =>
        engine.rollback({
          commitId,
          file: args.file as string | undefined,
          id,
          kind
        })
      );
      printJson({ ok: true });
    });

  program
    .command('push-file <file>')
    .option('--dry-run', 'calculate push result without uploading')
    .action(async (file: string, args) => {
      const result = await withEngine(getGlobals(), engineFactory, (engine) =>
        engine.pushFile(file, Boolean(args.dryRun))
      );
      printJson(result);
    });

  await program.parseAsync(argv, { from: 'user' });
}

if (isDirectEntry(import.meta.url)) {
  runCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
