import 'dotenv/config';
import type { SyncProvider } from '../types.js';
import { ElementorMcpProvider } from './mcp-provider.js';
import { McpToolClient } from './mcp-tool-client.js';
import { WordPressRestProvider } from './rest-provider.js';

export type ProviderMode = 'rest' | 'mcp';

export interface ProviderFactoryOptions {
  mode: ProviderMode;
  cwd?: string;
}

export interface ProviderFactoryResult {
  provider: SyncProvider;
  cleanup?: () => Promise<void>;
}

export function createProvider({
  mode,
  cwd = process.cwd()
}: ProviderFactoryOptions): ProviderFactoryResult {
  const baseUrl = process.env.WP_URL;
  const user = process.env.WP_APP_USER;
  const password = process.env.WP_APP_PASSWORD;

  if (!baseUrl) {
    throw new Error('WP_URL environment variable is required');
  }

  const restProvider = new WordPressRestProvider({ baseUrl, user, password });

  if (mode === 'rest') {
    return { provider: restProvider };
  }

  const command = process.env.ELEMENTOR_MCP_COMMAND || 'npx';
  const args =
    process.env.ELEMENTOR_MCP_ARGS?.split(/\s+/).filter(Boolean) ??
    ['-y', 'elementor-mcp'];
  const client = new McpToolClient({
    command,
    args,
    cwd,
    env: {
      ...process.env,
      WP_URL: baseUrl,
      WP_APP_USER: user || '',
      WP_APP_PASSWORD: password || ''
    } as Record<string, string>
  });

  return {
    provider: new ElementorMcpProvider({
      callTool: client.callTool.bind(client),
      fallback: restProvider
    }),
    cleanup: () => client.close()
  };
}
