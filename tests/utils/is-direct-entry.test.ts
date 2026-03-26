import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterEach, describe, expect, test } from 'vitest';
import { isDirectEntry } from '../../src/utils/is-direct-entry.js';

const tmpDirs: string[] = [];

afterEach(() => {
  while (tmpDirs.length > 0) {
    const dir = tmpDirs.pop();
    if (dir) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

function createTempModule(): { modulePath: string; metaUrl: string; dir: string } {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'wp-sync-entry-'));
  tmpDirs.push(dir);
  const modulePath = path.join(dir, 'entry.js');
  writeFileSync(modulePath, 'export {};\n', 'utf8');
  return {
    modulePath,
    metaUrl: pathToFileURL(modulePath).href,
    dir
  };
}

describe('isDirectEntry', () => {
  test('returns true for direct file execution', () => {
    const { modulePath, metaUrl } = createTempModule();
    expect(isDirectEntry(metaUrl, modulePath)).toBe(true);
  });

  test('returns true when invoked path is a symlink', () => {
    const { modulePath, metaUrl, dir } = createTempModule();
    const symlinkPath = path.join(dir, 'entry-link.js');
    symlinkSync(modulePath, symlinkPath);
    expect(isDirectEntry(metaUrl, symlinkPath)).toBe(true);
  });

  test('returns false for unrelated file', () => {
    const first = createTempModule();
    const second = createTempModule();
    expect(isDirectEntry(first.metaUrl, second.modulePath)).toBe(false);
  });

  test('returns false when argv path is undefined', () => {
    const { metaUrl } = createTempModule();
    expect(isDirectEntry(metaUrl, undefined)).toBe(false);
  });
});
