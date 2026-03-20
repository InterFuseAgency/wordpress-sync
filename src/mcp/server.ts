#!/usr/bin/env node
import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import path from 'node:path';
import { SyncEngine } from '../core/engine.js';
import { createProvider, type ProviderMode } from '../providers/factory.js';

let cachedEngine: SyncEngine | null = null;

function getEngine(): SyncEngine {
  if (cachedEngine) return cachedEngine;

  const root = path.resolve(process.env.WP_SYNC_ROOT || process.cwd());
  const mode: ProviderMode = process.env.WP_SYNC_PROVIDER === 'mcp' ? 'mcp' : 'rest';
  const provider = createProvider({ mode, cwd: root }).provider;
  cachedEngine = new SyncEngine(root, provider);
  return cachedEngine;
}

function jsonResult(value: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }]
  };
}

async function main(): Promise<void> {
  const server = new McpServer({
    name: 'WordPressSyncMcp',
    version: '1.0.0',
    description: 'Git-like sync utilities for WordPress Elementor JSON content.'
  });

  server.tool(
    'sync_pull',
    'Pull WordPress page/component JSON into local workspace',
    {
      all: z.boolean().optional(),
      id: z.number().int().positive().optional(),
      kind: z.enum(['page', 'component']).optional(),
      slug: z.string().optional()
    },
    async (input) => {
      const engine = getEngine();
      await engine.init();
      const result = await engine.pull({
        all: input.all,
        id: input.id,
        kind: input.kind,
        slug: input.slug
      });
      return jsonResult({ pulled: result });
    }
  );

  server.tool('sync_status', 'Get local workspace sync status', async () => {
    const engine = getEngine();
    await engine.init();
    const result = await engine.status();
    return jsonResult(result);
  });

  server.tool(
    'sync_commit',
    'Create local commit snapshot with hashes and manifest',
    {
      message: z.string(),
      all: z.boolean().optional(),
      file: z.string().optional()
    },
    async (input) => {
      const engine = getEngine();
      await engine.init();
      const result = await engine.commit({
        message: input.message,
        all: input.all,
        file: input.file
      });
      return jsonResult(result);
    }
  );

  server.tool(
    'sync_push',
    'Push changed JSON objects to WordPress only when content differs',
    {
      all: z.boolean().optional(),
      file: z.string().optional(),
      id: z.number().int().positive().optional(),
      kind: z.enum(['page', 'component']).optional(),
      dryRun: z.boolean().optional()
    },
    async (input) => {
      const engine = getEngine();
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

  server.tool(
    'sync_rollback',
    'Rollback local workspace to a previous commit snapshot',
    {
      commitId: z.string(),
      file: z.string().optional(),
      id: z.number().int().positive().optional(),
      kind: z.enum(['page', 'component']).optional()
    },
    async (input) => {
      const engine = getEngine();
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

  server.tool(
    'sync_push_file',
    'Push one local JSON file to WordPress if changed',
    {
      file: z.string(),
      dryRun: z.boolean().optional()
    },
    async (input) => {
      const engine = getEngine();
      await engine.init();
      const result = await engine.pushFile(input.file, input.dryRun);
      return jsonResult(result);
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
