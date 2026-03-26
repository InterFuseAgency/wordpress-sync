#!/usr/bin/env node
import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SyncEngine } from '../core/engine.js';
import { createProvider, type ProviderMode } from '../providers/factory.js';
import type { SyncTargetKind, WpObject } from '../types.js';
import { isDirectEntry } from '../utils/is-direct-entry.js';
import {
  ensureGitInitialized,
  getMissingConnectionKeys,
  loadProjectEnv,
  type RequiredConnectionKey,
  upsertProjectEnv
} from '../core/setup.js';

interface RuntimeContext {
  root: string;
  mode: ProviderMode;
  historyMode: 'json-patch' | 'full';
}

interface WorkspaceRootResolveOptions {
  wpSyncRoot?: string;
  cwd?: string;
  pwd?: string;
  initCwd?: string;
  listRoots?: () => Promise<{ roots: Array<{ uri: string }> }>;
}

export interface ShutdownReadable {
  once(event: 'end' | 'close', listener: () => void): this;
  resume(): this;
}

interface CachedEngineState {
  engine: SyncEngine;
  cleanup?: () => Promise<void>;
  root: string;
  mode: ProviderMode;
  historyMode: 'json-patch' | 'full';
  envSignature: string;
}

interface SetupInput {
  wpUrl?: string;
  wpAppUser?: string;
  wpAppPassword?: string;
  wpAuthMode?: 'session' | 'auto' | 'basic';
}

interface ListRemoteInput {
  search?: string;
  limit?: number;
}

interface RemoteListItem {
  id: number;
  kind: SyncTargetKind;
  source: 'wordpress-theme' | 'elementor';
  type: string | null;
  slug: string | null;
  title: string;
  status: string | null;
  link: string | null;
}

let cachedEngineState: CachedEngineState | null = null;
const LIST_LIMIT_DEFAULT = 200;
const LIST_LIMIT_MAX = 2000;

function jsonResult(value: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }]
  };
}

function normalizeRootCandidate(input: string | undefined): string | null {
  const trimmed = input?.trim();
  if (!trimmed) {
    return null;
  }
  return path.resolve(trimmed);
}

export async function resolveWorkspaceRoot(
  options: WorkspaceRootResolveOptions
): Promise<string> {
  const explicitRoot = normalizeRootCandidate(options.wpSyncRoot);
  if (explicitRoot) {
    return explicitRoot;
  }

  if (options.listRoots) {
    try {
      const listed = await options.listRoots();
      for (const root of listed.roots) {
        try {
          const parsed = new URL(root.uri);
          if (parsed.protocol !== 'file:') {
            continue;
          }

          const asPath = path.resolve(fileURLToPath(parsed));
          if (asPath !== '/') {
            return asPath;
          }
        } catch {
          // Ignore invalid URLs in roots payload
        }
      }
    } catch {
      // Ignore unsupported roots/list capability
    }
  }

  const fromEnvironment = [
    normalizeRootCandidate(options.pwd),
    normalizeRootCandidate(options.initCwd),
    normalizeRootCandidate(options.cwd)
  ];
  const nonRoot = fromEnvironment.find(
    (candidate): candidate is string => Boolean(candidate && candidate !== '/')
  );
  if (nonRoot) {
    return nonRoot;
  }

  throw new Error(
    'Unable to determine workspace root (resolved "/"). Set WP_SYNC_ROOT to your project path in MCP config.'
  );
}

async function getRuntimeContext(server: McpServer): Promise<RuntimeContext> {
  const root = await resolveWorkspaceRoot({
    wpSyncRoot: process.env.WP_SYNC_ROOT,
    pwd: process.env.PWD,
    initCwd: process.env.INIT_CWD,
    cwd: process.cwd(),
    listRoots: async () => server.server.listRoots()
  });
  const mode: ProviderMode = process.env.WP_SYNC_PROVIDER === 'mcp' ? 'mcp' : 'rest';
  const historyMode = process.env.WP_SYNC_HISTORY_MODE
    ? SyncEngine.historyModeFromCli(process.env.WP_SYNC_HISTORY_MODE)
    : 'json-patch';

  return { root, mode, historyMode };
}

function getEnvSignature(): string {
  return [
    process.env.WP_URL || '',
    process.env.WP_APP_USER || '',
    process.env.WP_APP_PASSWORD || '',
    process.env.WP_NONCE || '',
    process.env.WP_COOKIE || '',
    process.env.WP_AUTH_MODE || '',
    process.env.WP_SYNC_HISTORY_MODE || '',
    process.env.ELEMENTOR_MCP_COMMAND || '',
    process.env.ELEMENTOR_MCP_ARGS || ''
  ].join('|');
}

function getWpObjectTitle(value: WpObject): string {
  const title = typeof value.title === 'string' ? value.title : value.title?.rendered;
  const trimmed = typeof title === 'string' ? title.trim() : '';
  return trimmed || `item-${value.id}`;
}

function toRemoteListItem(kind: SyncTargetKind, value: WpObject): RemoteListItem {
  return {
    id: value.id,
    kind,
    source: kind === 'page' ? 'wordpress-theme' : 'elementor',
    type: typeof value.type === 'string' ? value.type : null,
    slug: typeof value.slug === 'string' ? value.slug : null,
    title: getWpObjectTitle(value),
    status: typeof value.status === 'string' ? value.status : null,
    link: typeof value.link === 'string' ? value.link : null
  };
}

function toNormalizedQuery(input: string | undefined): string | null {
  const normalized = input?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function applyRemoteListFilter(
  items: RemoteListItem[],
  input: ListRemoteInput
): { items: RemoteListItem[]; totalMatched: number } {
  const query = toNormalizedQuery(input.search);
  const filtered = query
    ? items.filter((item) =>
        `${item.id} ${item.slug ?? ''} ${item.title}`.toLowerCase().includes(query)
      )
    : items;

  const requestedLimit = input.limit ?? LIST_LIMIT_DEFAULT;
  const limit = Math.min(Math.max(requestedLimit, 1), LIST_LIMIT_MAX);
  return {
    items: filtered.slice(0, limit),
    totalMatched: filtered.length
  };
}

async function listRemoteByKind(
  engine: SyncEngine,
  kind: SyncTargetKind,
  input: ListRemoteInput
): Promise<{ kind: SyncTargetKind; items: RemoteListItem[]; totalMatched: number }> {
  const all = await engine.listRemote(kind);
  const mapped = all.map((item) => toRemoteListItem(kind, item));
  const { items, totalMatched } = applyRemoteListFilter(mapped, input);
  return {
    kind,
    items,
    totalMatched
  };
}

function normalizeAuthMode(raw: string | undefined): 'session' | 'auto' | 'basic' {
  const normalized = raw?.trim().toLowerCase();
  if (normalized === 'auto' || normalized === 'basic' || normalized === 'session') {
    return normalized;
  }
  return 'session';
}

function applyConnectionToEnv(input: {
  wpUrl: string;
  wpAppUser: string;
  wpAppPassword: string;
  wpAuthMode: 'session' | 'auto' | 'basic';
}): void {
  process.env.WP_URL = input.wpUrl;
  process.env.WP_APP_USER = input.wpAppUser;
  process.env.WP_APP_PASSWORD = input.wpAppPassword;
  process.env.WP_AUTH_MODE = input.wpAuthMode;
}

function toEnvCandidate(input?: SetupInput): Record<string, string | undefined> {
  return {
    WP_URL: input?.wpUrl ?? process.env.WP_URL,
    WP_APP_USER: input?.wpAppUser ?? process.env.WP_APP_USER,
    WP_APP_PASSWORD: input?.wpAppPassword ?? process.env.WP_APP_PASSWORD
  };
}

async function closeCachedEngine(): Promise<void> {
  if (cachedEngineState?.cleanup) {
    await cachedEngineState.cleanup();
  }
  cachedEngineState = null;
}

async function getEngine(context: RuntimeContext): Promise<SyncEngine> {
  const envSignature = getEnvSignature();
  if (
    cachedEngineState &&
    cachedEngineState.root === context.root &&
    cachedEngineState.mode === context.mode &&
    cachedEngineState.historyMode === context.historyMode &&
    cachedEngineState.envSignature === envSignature
  ) {
    return cachedEngineState.engine;
  }

  await closeCachedEngine();

  const providerResult = createProvider({
    mode: context.mode,
    cwd: context.root
  });
  const engine = new SyncEngine(context.root, providerResult.provider, {
    historyMode: context.historyMode
  });
  cachedEngineState = {
    engine,
    cleanup: providerResult.cleanup,
    root: context.root,
    mode: context.mode,
    historyMode: context.historyMode,
    envSignature
  };

  return engine;
}

async function elicitMissingConnection(
  server: McpServer,
  missing: RequiredConnectionKey[]
): Promise<Partial<SetupInput>> {
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  if (missing.includes('WP_URL')) {
    properties.wpUrl = {
      type: 'string',
      title: 'WordPress URL',
      description: 'Example: https://example.com'
    };
    required.push('wpUrl');
  }

  if (missing.includes('WP_APP_USER')) {
    properties.wpAppUser = {
      type: 'string',
      title: 'WordPress App Username',
      description: 'Application username'
    };
    required.push('wpAppUser');
  }

  if (missing.includes('WP_APP_PASSWORD')) {
    properties.wpAppPassword = {
      type: 'string',
      title: 'WordPress App Password',
      description: 'Application password'
    };
    required.push('wpAppPassword');
  }

  properties.wpAuthMode = {
    type: 'string',
    title: 'Auth mode',
    oneOf: [
      { const: 'session', title: 'session (recommended)' },
      { const: 'auto', title: 'auto' },
      { const: 'basic', title: 'basic' }
    ],
    default: 'session'
  };

  const result = await server.server.elicitInput({
    mode: 'form',
    message:
      'WordPress sync needs connection details. Fill missing fields to continue and save them into this project .env file.',
    requestedSchema: {
      type: 'object',
      properties,
      required
    } as never
  });

  if (result.action !== 'accept' || !result.content) {
    throw new Error('Connection setup was cancelled by user');
  }

  const content = result.content as Record<string, unknown>;
  return {
    wpUrl: typeof content.wpUrl === 'string' ? content.wpUrl : undefined,
    wpAppUser: typeof content.wpAppUser === 'string' ? content.wpAppUser : undefined,
    wpAppPassword:
      typeof content.wpAppPassword === 'string' ? content.wpAppPassword : undefined,
    wpAuthMode:
      content.wpAuthMode === 'session' ||
      content.wpAuthMode === 'auto' ||
      content.wpAuthMode === 'basic'
        ? content.wpAuthMode
        : undefined
  };
}

async function ensureConfigured(
  server: McpServer,
  options: {
    allowPrompt: boolean;
    forcePersist: boolean;
    input?: SetupInput;
  }
): Promise<{ context: RuntimeContext; gitInitialized: boolean; credentialsSaved: boolean }> {
  const context = await getRuntimeContext(server);
  const gitInitialized = await ensureGitInitialized(context.root);
  loadProjectEnv(context.root);

  let missing = getMissingConnectionKeys(toEnvCandidate(options.input));
  let promptedValues: Partial<SetupInput> = {};
  let prompted = false;

  if (missing.length > 0 && options.allowPrompt) {
    try {
      promptedValues = await elicitMissingConnection(server, missing);
      prompted = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/Client does not support form elicitation/i.test(message)) {
        throw new Error(
          `Missing ${missing.join(', ')}. Client does not support elicitation; set MCP env or call sync_setup with explicit arguments.`
        );
      }
      throw error;
    }
  }

  const combined = {
    wpUrl: options.input?.wpUrl ?? promptedValues.wpUrl ?? process.env.WP_URL,
    wpAppUser: options.input?.wpAppUser ?? promptedValues.wpAppUser ?? process.env.WP_APP_USER,
    wpAppPassword:
      options.input?.wpAppPassword ??
      promptedValues.wpAppPassword ??
      process.env.WP_APP_PASSWORD,
    wpAuthMode: normalizeAuthMode(
      options.input?.wpAuthMode ?? promptedValues.wpAuthMode ?? process.env.WP_AUTH_MODE
    )
  };

  missing = getMissingConnectionKeys({
    WP_URL: combined.wpUrl,
    WP_APP_USER: combined.wpAppUser,
    WP_APP_PASSWORD: combined.wpAppPassword
  });
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Run sync_setup first or configure MCP env.`
    );
  }

  applyConnectionToEnv({
    wpUrl: combined.wpUrl as string,
    wpAppUser: combined.wpAppUser as string,
    wpAppPassword: combined.wpAppPassword as string,
    wpAuthMode: combined.wpAuthMode
  });

  const shouldPersist = options.forcePersist || prompted;
  if (shouldPersist) {
    await upsertProjectEnv(context.root, {
      WP_URL: combined.wpUrl as string,
      WP_APP_USER: combined.wpAppUser as string,
      WP_APP_PASSWORD: combined.wpAppPassword as string,
      WP_AUTH_MODE: combined.wpAuthMode
    });
    await closeCachedEngine();
  }

  return {
    context,
    gitInitialized,
    credentialsSaved: shouldPersist
  };
}

async function prepareEngine(
  server: McpServer
): Promise<{ engine: SyncEngine; context: RuntimeContext }> {
  const setup = await ensureConfigured(server, {
    allowPrompt: true,
    forcePersist: false
  });
  const engine = await getEngine(setup.context);
  return { engine, context: setup.context };
}

export function waitForStdioShutdown(
  stdin: ShutdownReadable = process.stdin
): Promise<void> {
  stdin.resume();
  return new Promise((resolve) => {
    let resolved = false;
    const done = (): void => {
      if (resolved) {
        return;
      }
      resolved = true;
      resolve();
    };

    stdin.once('end', done);
    stdin.once('close', done);
  });
}

export async function runMcpServer(): Promise<void> {
  const server = new McpServer({
    name: 'WordPressSyncMcp',
    version: '1.0.0',
    description: 'Git-like sync utilities for WordPress Elementor JSON content.'
  });

  server.registerTool(
    'sync_setup',
    {
      description:
        'Initialize workspace and save WordPress connection config into current project .env',
      inputSchema: {
        wpUrl: z.string().url().optional(),
        wpAppUser: z.string().min(1).optional(),
        wpAppPassword: z.string().min(1).optional(),
        wpAuthMode: z.enum(['session', 'auto', 'basic']).optional()
      }
    },
    async (input) => {
      const setup = await ensureConfigured(server, {
        allowPrompt: true,
        forcePersist: true,
        input
      });

      return jsonResult({
        ok: true,
        root: setup.context.root,
        provider: setup.context.mode,
        historyMode: setup.context.historyMode,
        gitInitialized: setup.gitInitialized,
        credentialsSaved: setup.credentialsSaved
      });
    }
  );

  const listToolsSchema = {
    search: z.string().optional(),
    limit: z.number().int().positive().max(LIST_LIMIT_MAX).optional()
  };

  server.registerTool(
    'sync_list_pages',
    {
      description: 'List remote WordPress pages (theme pages) without pulling files to workspace',
      inputSchema: listToolsSchema
    },
    async (input) => {
      const { engine } = await prepareEngine(server);
      const result = await listRemoteByKind(engine, 'page', input);
      return jsonResult({
        ...result,
        returned: result.items.length
      });
    }
  );

  server.registerTool(
    'sync_list_components',
    {
      description: 'List remote Elementor components/templates without pulling files to workspace',
      inputSchema: listToolsSchema
    },
    async (input) => {
      const { engine } = await prepareEngine(server);
      const result = await listRemoteByKind(engine, 'component', input);
      return jsonResult({
        ...result,
        returned: result.items.length
      });
    }
  );

  server.registerTool(
    'sync_pull',
    {
      description: 'Pull WordPress page/component JSON into local workspace',
      inputSchema: {
        all: z.boolean().optional(),
        id: z.number().int().positive().optional(),
        kind: z.enum(['page', 'component']).optional(),
        slug: z.string().optional(),
        historyMode: z.enum(['json-patch', 'full']).optional()
      }
    },
    async (input) => {
      const { engine } = await prepareEngine(server);
      await engine.init();
      const result = await engine.pull(
        {
          all: input.all,
          id: input.id,
          kind: input.kind,
          slug: input.slug
        },
        { historyMode: input.historyMode }
      );
      return jsonResult({ pulled: result });
    }
  );

  server.registerTool('sync_status', { description: 'Get local workspace sync status' }, async () => {
    const { engine } = await prepareEngine(server);
    await engine.init();
    const result = await engine.status();
    return jsonResult(result);
  });

  server.registerTool(
    'sync_commit',
    {
      description: 'Create local commit entry with diff-based history',
      inputSchema: {
        message: z.string(),
        all: z.boolean().optional(),
        file: z.string().optional(),
        historyMode: z.enum(['json-patch', 'full']).optional()
      }
    },
    async (input) => {
      const { engine } = await prepareEngine(server);
      await engine.init();
      const result = await engine.commit(
        {
          message: input.message,
          all: input.all,
          file: input.file
        },
        { historyMode: input.historyMode }
      );
      return jsonResult(result);
    }
  );

  server.registerTool(
    'sync_push',
    {
      description: 'Push changed JSON objects to WordPress only when content differs',
      inputSchema: {
        all: z.boolean().optional(),
        file: z.string().optional(),
        id: z.number().int().positive().optional(),
        kind: z.enum(['page', 'component']).optional(),
        dryRun: z.boolean().optional()
      }
    },
    async (input) => {
      const { engine } = await prepareEngine(server);
      await engine.init();
      const result = await engine.push({
        all: input.all,
        file: input.file,
        id: input.id,
        kind: input.kind,
        dryRun: input.dryRun
      });
      return jsonResult(result);
    }
  );

  server.registerTool(
    'sync_rollback',
    {
      description: 'Rollback local workspace to a previous commit state',
      inputSchema: {
        commitId: z.string(),
        file: z.string().optional(),
        id: z.number().int().positive().optional(),
        kind: z.enum(['page', 'component']).optional()
      }
    },
    async (input) => {
      const { engine } = await prepareEngine(server);
      await engine.init();
      await engine.rollback({
        commitId: input.commitId,
        file: input.file,
        id: input.id,
        kind: input.kind
      });
      return jsonResult({ ok: true });
    }
  );

  server.registerTool(
    'sync_push_file',
    {
      description: 'Push one local JSON file to WordPress if changed',
      inputSchema: {
        file: z.string(),
        dryRun: z.boolean().optional()
      }
    },
    async (input) => {
      const { engine } = await prepareEngine(server);
      await engine.init();
      const result = await engine.pushFile(input.file, input.dryRun);
      return jsonResult(result);
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  await waitForStdioShutdown();
}

if (isDirectEntry(import.meta.url)) {
  runMcpServer().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
