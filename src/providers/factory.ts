import 'dotenv/config';
import type { SyncProvider } from '../types.js';
import { WordPressRestProvider } from './rest-provider.js';

export type ProviderMode = 'rest';

export interface ProviderFactoryOptions {
  mode: ProviderMode;
  cwd?: string;
}

export interface ProviderFactoryResult {
  provider: SyncProvider;
  cleanup?: () => Promise<void>;
}

export function createProvider({
  mode = 'rest',
  cwd = process.cwd()
}: ProviderFactoryOptions): ProviderFactoryResult {
  void cwd;
  const baseUrl = process.env.WP_URL;
  const user = process.env.WP_APP_USER;
  const password = process.env.WP_APP_PASSWORD;
  const nonce = process.env.WP_NONCE;
  const cookie = process.env.WP_COOKIE;
  const rawAuthMode = process.env.WP_AUTH_MODE?.trim().toLowerCase();
  const authMode =
    rawAuthMode === 'basic' || rawAuthMode === 'auto' || rawAuthMode === 'session'
      ? rawAuthMode
      : undefined;

  if (!baseUrl) {
    throw new Error('WP_URL environment variable is required');
  }

  const restProvider = new WordPressRestProvider({
    baseUrl,
    user,
    password,
    nonce,
    cookie,
    authMode
  });

  if (mode === 'rest') {
    return { provider: restProvider };
  }

  throw new Error('MCP provider mode has been removed. Use REST provider mode.');
}
