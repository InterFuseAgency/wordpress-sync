import { describe, expect, test, vi } from 'vitest';
import { runNpxEntry } from '../../src/npx.js';

describe('npx entrypoint', () => {
  test('routes to MCP mode when first arg is mcp', async () => {
    const runCli = vi.fn(async () => undefined);
    const runMcp = vi.fn(async () => undefined);

    await runNpxEntry(['mcp'], { runCli, runMcp });

    expect(runMcp).toHaveBeenCalledTimes(1);
    expect(runMcp).toHaveBeenCalledWith([]);
    expect(runCli).not.toHaveBeenCalled();
  });

  test('routes all other args to CLI mode', async () => {
    const runCli = vi.fn(async () => undefined);
    const runMcp = vi.fn(async () => undefined);

    await runNpxEntry(['pull', '--all'], { runCli, runMcp });

    expect(runCli).toHaveBeenCalledTimes(1);
    expect(runCli).toHaveBeenCalledWith(['pull', '--all']);
    expect(runMcp).not.toHaveBeenCalled();
  });
});
