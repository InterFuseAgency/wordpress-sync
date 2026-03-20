import { describe, expect, test, vi } from 'vitest';
import { runCli } from '../../src/cli.js';

describe('CLI', () => {
  test('routes init command to engine.init', async () => {
    const engine = {
      init: vi.fn(async () => undefined),
      pull: vi.fn(),
      status: vi.fn(),
      commit: vi.fn(),
      push: vi.fn(),
      rollback: vi.fn(),
      pushFile: vi.fn()
    };

    await runCli(['init'], async () => engine as never);
    expect(engine.init).toHaveBeenCalledTimes(1);
  });
});
