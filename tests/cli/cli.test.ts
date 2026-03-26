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

  test('uses WP_SYNC_HISTORY_MODE for global engine options', async () => {
    const engine = {
      init: vi.fn(async () => undefined),
      pull: vi.fn(async () => []),
      status: vi.fn(),
      commit: vi.fn(),
      push: vi.fn(),
      rollback: vi.fn(),
      pushFile: vi.fn()
    };

    const previous = process.env.WP_SYNC_HISTORY_MODE;
    process.env.WP_SYNC_HISTORY_MODE = 'full';

    try {
      const factory = vi.fn(async () => engine as never);
      await runCli(['init'], factory);
      expect(factory).toHaveBeenCalledWith(expect.objectContaining({
        historyMode: 'full'
      }));
    } finally {
      if (previous === undefined) {
        delete process.env.WP_SYNC_HISTORY_MODE;
      } else {
        process.env.WP_SYNC_HISTORY_MODE = previous;
      }
    }
  });

  test('command history-mode overrides commit write mode', async () => {
    const engine = {
      init: vi.fn(async () => undefined),
      pull: vi.fn(async () => []),
      status: vi.fn(),
      commit: vi.fn(async () => ({ commitId: 'id', changedObjects: [] })),
      push: vi.fn(),
      rollback: vi.fn(),
      pushFile: vi.fn()
    };

    await runCli(
      ['commit', '--all', '-m', 'msg', '--history-mode', 'full'],
      async () => engine as never
    );

    expect(engine.commit).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'msg', all: true }),
      { historyMode: 'full' }
    );
  });
});
