import { describe, expect, test } from 'vitest';
import { resolveWorkspaceRoot } from '../../src/mcp/server.js';

describe('resolveWorkspaceRoot', () => {
  test('uses explicit WP_SYNC_ROOT first', async () => {
    const root = await resolveWorkspaceRoot({
      wpSyncRoot: '/tmp/my-project',
      cwd: '/',
      pwd: '/',
      initCwd: '/'
    });

    expect(root).toBe('/tmp/my-project');
  });

  test('uses first file:// root from MCP roots when WP_SYNC_ROOT is absent', async () => {
    const root = await resolveWorkspaceRoot({
      cwd: '/',
      listRoots: async () => ({
        roots: [{ uri: 'file:///Users/artemkadev/Desktop/wordpress%20mcp' }]
      })
    });

    expect(root).toBe('/Users/artemkadev/Desktop/wordpress mcp');
  });

  test('falls back to PWD when MCP roots are unavailable', async () => {
    const root = await resolveWorkspaceRoot({
      cwd: '/',
      pwd: '/Users/artemkadev/Desktop/wordpress mcp'
    });

    expect(root).toBe('/Users/artemkadev/Desktop/wordpress mcp');
  });

  test('throws when only / can be resolved and no explicit WP_SYNC_ROOT', async () => {
    await expect(
      resolveWorkspaceRoot({
        cwd: '/',
        pwd: '/',
        initCwd: '/'
      })
    ).rejects.toThrow('Unable to determine workspace root');
  });
});
