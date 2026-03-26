import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import {
  ensureGitInitialized,
  getMissingConnectionKeys,
  upsertProjectEnv
} from '../../src/core/setup.js';

describe('setup helpers', () => {
  test('returns missing required connection keys', () => {
    const missing = getMissingConnectionKeys({
      WP_URL: 'https://example.com'
    });

    expect(missing).toEqual(['WP_APP_USER', 'WP_APP_PASSWORD']);
  });

  test('upsertProjectEnv writes and updates project .env entries', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wp-sync-setup-'));
    const envPath = path.join(root, '.env');
    writeFileSync(envPath, 'FOO=bar\nWP_URL=https://old.example.com\n');

    await upsertProjectEnv(root, {
      WP_URL: 'https://new.example.com',
      WP_APP_USER: 'admin',
      WP_APP_PASSWORD: 'secret value',
      WP_AUTH_MODE: 'session'
    });

    const saved = readFileSync(envPath, 'utf8');
    expect(saved).toContain('FOO=bar');
    expect(saved).toContain('WP_URL=https://new.example.com');
    expect(saved).toContain('WP_APP_USER=admin');
    expect(saved).toContain('WP_APP_PASSWORD="secret value"');
    expect(saved).toContain('WP_AUTH_MODE=session');
  });

  test('ensureGitInitialized initializes git when .git is absent', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wp-sync-git-'));
    const runGitInit = vi.fn(async (cwd: string) => {
      mkdirSync(path.join(cwd, '.git'), { recursive: true });
    });

    const created = await ensureGitInitialized(root, runGitInit);

    expect(created).toBe(true);
    expect(runGitInit).toHaveBeenCalledWith(root);
    expect(existsSync(path.join(root, '.git'))).toBe(true);
  });

  test('ensureGitInitialized skips git init when repository already exists', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wp-sync-git-existing-'));
    mkdirSync(path.join(root, '.git'), { recursive: true });
    const runGitInit = vi.fn(async () => undefined);

    const created = await ensureGitInitialized(root, runGitInit);

    expect(created).toBe(false);
    expect(runGitInit).not.toHaveBeenCalled();
  });
});
