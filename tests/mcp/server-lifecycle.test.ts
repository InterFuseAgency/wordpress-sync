import { describe, expect, test } from 'vitest';
import { waitForStdioShutdown } from '../../src/mcp/server.js';

type ShutdownEvent = 'end' | 'close';
type ShutdownHandler = () => void;

class FakeStdin {
  public resumed = false;
  private handlers: Record<ShutdownEvent, ShutdownHandler | null> = {
    end: null,
    close: null
  };

  resume(): this {
    this.resumed = true;
    return this;
  }

  once(event: ShutdownEvent, handler: ShutdownHandler): this {
    this.handlers[event] = handler;
    return this;
  }

  emit(event: ShutdownEvent): void {
    this.handlers[event]?.();
    this.handlers[event] = null;
  }
}

describe('waitForStdioShutdown', () => {
  test('resumes stdin and waits for end event', async () => {
    const stdin = new FakeStdin();
    const promise = waitForStdioShutdown(stdin);

    expect(stdin.resumed).toBe(true);

    let settled = false;
    promise.then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(false);

    stdin.emit('end');
    await promise;
    expect(settled).toBe(true);
  });

  test('also resolves when close event fires', async () => {
    const stdin = new FakeStdin();
    const promise = waitForStdioShutdown(stdin);

    stdin.emit('close');
    await expect(promise).resolves.toBeUndefined();
  });
});
