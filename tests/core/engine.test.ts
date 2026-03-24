import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { SyncEngine } from '../../src/core/engine.js';
import type { PullSelector, PushSelector, SyncProvider, SyncTargetKind, WpObject } from '../../src/types.js';

class MockProvider implements SyncProvider {
  constructor(private store: Record<string, WpObject>) {}

  async list(kind: SyncTargetKind): Promise<WpObject[]> {
    return Object.values(this.store).filter((item) => (kind === 'page' ? item.type === 'page' : item.type === 'elementor_library'));
  }

  async getById(kind: SyncTargetKind, id: number): Promise<WpObject> {
    const key = `${kind}:${id}`;
    const data = this.store[key];
    if (!data) throw new Error(`Not found ${key}`);
    return structuredClone(data);
  }

  async getBySlug(kind: SyncTargetKind, slug: string): Promise<WpObject | null> {
    const type = kind === 'page' ? 'page' : 'elementor_library';
    const found = Object.values(this.store).find((item) => item.type === type && item.slug === slug);
    return found ? structuredClone(found) : null;
  }

  async updateById(kind: SyncTargetKind, id: number, payload: { elementor_data: string; title?: string; status?: string; content?: string; }): Promise<WpObject> {
    const key = `${kind}:${id}`;
    const current = this.store[key];
    if (!current) throw new Error(`Not found ${key}`);
    current.meta = current.meta || {};
    current.meta._elementor_data = payload.elementor_data;
    return structuredClone(current);
  }
}

function samplePage(id: number, slug: string, elementorId: string): WpObject {
  return {
    id,
    type: 'page',
    slug,
    title: { rendered: `Title ${id}` },
    status: 'publish',
    meta: {
      _elementor_data: [{ id: elementorId, elType: 'section' }]
    }
  };
}

describe('SyncEngine', () => {
  test('pull removes content fields for elementor pages', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wp-sync-'));
    const provider = new MockProvider({
      'page:10': {
        ...samplePage(10, 'main-page', '10'),
        content: {
          raw: '<p>raw that should be stripped for elementor</p>',
          rendered: '<p>rendered that should be stripped for elementor</p>'
        },
        excerpt: {
          raw: '',
          rendered: '<p>excerpt</p>'
        }
      }
    });

    const engine = new SyncEngine(root, provider);
    await engine.init();
    await engine.pull({ all: true });

    const file = path.join(root, 'wordpress', 'pages', 'main-page', '10.json');
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    expect(parsed.content).toBeUndefined();
    expect(parsed.excerpt).toBeUndefined();
  });

  test('pull stores string elementor data as parsed json', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wp-sync-'));
    const provider = new MockProvider({
      'page:10': {
        ...samplePage(10, 'main-page', '10'),
        meta: {
          _elementor_data: '[{"id":"10","elType":"section"}]'
        }
      }
    });

    const engine = new SyncEngine(root, provider);
    await engine.init();
    await engine.pull({ all: true });

    const file = path.join(root, 'wordpress', 'pages', 'main-page', '10.json');
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    expect(Array.isArray(parsed.meta._elementor_data)).toBe(true);
    expect(parsed.meta._elementor_data).toEqual([{ id: '10', elType: 'section' }]);
  });

  test('status detects modified files', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wp-sync-'));
    const provider = new MockProvider({
      'page:10': samplePage(10, 'main-page', '10')
    });

    const engine = new SyncEngine(root, provider);
    await engine.init();
    await engine.pull({ all: true });
    await engine.commit({ message: 'initial', all: true });

    const file = path.join(root, 'wordpress', 'pages', 'main-page', '10.json');
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    parsed.meta._elementor_data = [{ id: '11', elType: 'section' }];
    writeFileSync(file, JSON.stringify(parsed, null, 2));

    const status = await engine.status();
    expect(status.modified).toContain('page:10');
  });

  test('push skips unchanged remote content and updates changed', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wp-sync-'));
    const provider = new MockProvider({
      'page:10': samplePage(10, 'main-page', '10')
    });

    const engine = new SyncEngine(root, provider);
    await engine.init();
    await engine.pull({ all: true });
    await engine.commit({ message: 'initial', all: true });

    let result = await engine.push({ all: true });
    expect(result.skipped).toContain('page:10');

    const file = path.join(root, 'wordpress', 'pages', 'main-page', '10.json');
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    parsed.meta._elementor_data = [{ id: '999', elType: 'section' }];
    writeFileSync(file, JSON.stringify(parsed, null, 2));

    result = await engine.push({ all: true });
    expect(result.updated).toContain('page:10');

    const remote = await provider.getById('page', 10);
    expect(typeof remote.meta?._elementor_data).toBe('string');
    expect(remote.meta?._elementor_data).toContain('"id":"999"');
  });

  test('commit creates snapshot and rollback restores previous version', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wp-sync-'));
    const provider = new MockProvider({
      'page:10': samplePage(10, 'main-page', '10')
    });

    const engine = new SyncEngine(root, provider);
    await engine.init();
    await engine.pull({ all: true });
    const firstCommit = await engine.commit({ message: 'initial', all: true });

    const file = path.join(root, 'wordpress', 'pages', 'main-page', '10.json');
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    parsed.meta._elementor_data = [{ id: '2000', elType: 'section' }];
    writeFileSync(file, JSON.stringify(parsed, null, 2));
    await engine.commit({ message: 'second', all: true });

    await engine.rollback({ commitId: firstCommit.commitId });
    const restored = JSON.parse(readFileSync(file, 'utf8'));
    expect(restored.meta._elementor_data[0].id).toBe('10');
  });
});
