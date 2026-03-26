import { describe, expect, test, vi } from 'vitest';
import { runNpxEntry } from '../../src/npx.js';

describe('npx entrypoint', () => {
  test('routes mcp argument to CLI mode', async () => {
    const runCli = vi.fn(async () => undefined);

    await runNpxEntry(['mcp'], { runCli });

    expect(runCli).toHaveBeenCalledTimes(1);
    expect(runCli).toHaveBeenCalledWith(['mcp']);
  });

  test('routes all other args to CLI mode', async () => {
    const runCli = vi.fn(async () => undefined);

    await runNpxEntry(['pull', '--all'], { runCli });

    expect(runCli).toHaveBeenCalledTimes(1);
    expect(runCli).toHaveBeenCalledWith(['pull', '--all']);
  });
});
