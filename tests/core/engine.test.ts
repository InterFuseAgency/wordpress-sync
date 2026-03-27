import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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

  async updateById(
    kind: SyncTargetKind,
    id: number,
    payload: {
      elementor_data: string;
      title?: string;
      status?: string;
      content?: string;
      slug?: string;
    }
  ): Promise<WpObject> {
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

function sampleComponent(id: number, slug: string, elementorId: string): WpObject {
  return {
    id,
    type: 'elementor_library',
    slug,
    title: { rendered: `Component ${id}` },
    status: 'publish',
    meta: {
      _elementor_data: [{ id: elementorId, elType: 'section' }]
    }
  };
}

describe('SyncEngine', () => {
  test('pull stores full history record and next commit stores diff', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wp-sync-'));
    const provider = new MockProvider({
      'page:10': samplePage(10, 'main-page', '10')
    });

    const engine = new SyncEngine(root, provider);
    await engine.init();
    await engine.pull({ all: true });

    let manifest = JSON.parse(readFileSync(path.join(root, 'wordpress', 'git.json'), 'utf8'));
    const pullCommit = manifest.commits[0];
    expect(pullCommit.mode).toBe('full');
    expect(pullCommit.snapshotPath.endsWith('/entry.json')).toBe(true);

    const pullRecord = JSON.parse(readFileSync(path.join(root, pullCommit.snapshotPath), 'utf8'));
    expect(pullRecord.mode).toBe('full');
    expect(pullRecord.changes[0].mode).toBe('full');

    const file = path.join(root, 'wordpress', 'pages', 'main-page', '10.json');
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    parsed.meta._elementor_data = [{ id: '999', elType: 'section' }];
    writeFileSync(file, JSON.stringify(parsed, null, 2));

    const commit = await engine.commit({ message: 'diff commit', all: true });
    manifest = JSON.parse(readFileSync(path.join(root, 'wordpress', 'git.json'), 'utf8'));
    const diffCommit = manifest.commits.find((entry: { id: string; }) => entry.id === commit.commitId);

    expect(diffCommit?.mode).toBe('diff');
    expect(diffCommit?.snapshotPath.endsWith('/entry.json')).toBe(true);

    const diffRecord = JSON.parse(readFileSync(path.join(root, diffCommit.snapshotPath), 'utf8'));
    const diffChange = diffRecord.changes.find((entry: { key: string; }) => entry.key === 'page:10');
    expect(diffRecord.mode).toBe('diff');
    expect(diffChange.mode).toBe('diff');
    expect(diffChange.format).toBe('json-patch');
    expect(Array.isArray(diffChange.patch)).toBe(true);
    expect(diffChange.patch.length).toBeGreaterThan(0);
    expect(diffChange.patch[0]).toEqual(expect.objectContaining({
      op: expect.any(String),
      path: expect.any(String)
    }));
  });

  test('commit stores full objects when history mode is full', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wp-sync-'));
    const provider = new MockProvider({
      'page:10': samplePage(10, 'main-page', '10')
    });

    const engine = new SyncEngine(root, provider, { historyMode: 'full' });
    await engine.init();
    await engine.pull({ all: true });

    const file = path.join(root, 'wordpress', 'pages', 'main-page', '10.json');
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    parsed.meta._elementor_data = [{ id: 'full-mode', elType: 'section' }];
    writeFileSync(file, JSON.stringify(parsed, null, 2));

    const commit = await engine.commit({ message: 'full mode commit', all: true });
    const manifest = JSON.parse(readFileSync(path.join(root, 'wordpress', 'git.json'), 'utf8'));
    const entry = manifest.commits.find((item: { id: string; }) => item.id === commit.commitId);
    const record = JSON.parse(readFileSync(path.join(root, entry.snapshotPath), 'utf8'));
    const change = record.changes.find((item: { key: string; }) => item.key === 'page:10');

    expect(record.mode).toBe('full');
    expect(change.mode).toBe('full');
    expect(change.object.meta._elementor_data[0].id).toBe('full-mode');
  });

  test('json-patch mode stores added files as diff patch', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wp-sync-'));
    const provider = new MockProvider({
      'page:10': samplePage(10, 'main-page', '10')
    });

    const engine = new SyncEngine(root, provider, { historyMode: 'json-patch' });
    await engine.init();
    await engine.pull({ all: true });

    const dir = path.join(root, 'wordpress', 'pages', 'new-local-page');
    const newFile = path.join(dir, '99.json');
    const newObject = samplePage(99, 'new-local-page', '99');
    mkdirSync(dir, { recursive: true });
    writeFileSync(newFile, JSON.stringify(newObject, null, 2));
    expect(existsSync(newFile)).toBe(true);

    const commit = await engine.commit({ message: 'add local file', all: true });
    const manifest = JSON.parse(readFileSync(path.join(root, 'wordpress', 'git.json'), 'utf8'));
    const entry = manifest.commits.find((item: { id: string; }) => item.id === commit.commitId);
    const record = JSON.parse(readFileSync(path.join(root, entry.snapshotPath), 'utf8'));
    const change = record.changes.find((item: { key: string; }) => item.key === 'page:99');

    expect(change.mode).toBe('diff');
    expect(change.format).toBe('json-patch');
    expect(Array.isArray(change.patch)).toBe(true);
    expect(change.patch[0].op).toBe('add');
    expect(change.patch[0].path).toBe('');
    expect(change.object).toBeUndefined();
  });

  test('pull creates history entry and supports rollback without manual commit', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wp-sync-'));
    const provider = new MockProvider({
      'page:10': samplePage(10, 'main-page', '10')
    });

    const engine = new SyncEngine(root, provider);
    await engine.init();
    await engine.pull({ all: true });

    const manifestFile = path.join(root, 'wordpress', 'git.json');
    const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
    expect(manifest.commits.length).toBe(1);
    expect(manifest.head).toBeTruthy();
    expect(manifest.commits[0].changedObjects).toContain('page:10');

    const file = path.join(root, 'wordpress', 'pages', 'main-page', '10.json');
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    parsed.meta._elementor_data = [{ id: '999', elType: 'section' }];
    writeFileSync(file, JSON.stringify(parsed, null, 2));

    await engine.rollback({ commitId: manifest.head });

    const restored = JSON.parse(readFileSync(file, 'utf8'));
    expect(restored.meta._elementor_data[0].id).toBe('10');
  });

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

  test('pull --all with --kind pulls only the requested kind', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wp-sync-'));
    const provider = new MockProvider({
      'page:10': samplePage(10, 'main-page', '10'),
      'component:11': sampleComponent(11, 'hero-banner', '11')
    });

    const engine = new SyncEngine(root, provider);
    await engine.init();
    await engine.pull({ all: true, kind: 'page' });

    expect(existsSync(path.join(root, 'wordpress', 'pages', 'main-page', '10.json'))).toBe(true);
    expect(existsSync(path.join(root, 'wordpress', 'components', 'hero-banner', '11.json'))).toBe(false);

    const manifest = JSON.parse(readFileSync(path.join(root, 'wordpress', 'git.json'), 'utf8'));
    expect(Object.keys(manifest.objects)).toEqual(['page:10']);
  });

  test('pull removes stale opposite-kind entry for the same id', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wp-sync-'));
    const provider = new MockProvider({
      'page:10': samplePage(10, 'main-page', '10')
    });

    const staleFilePath = path.join(root, 'wordpress', 'components', 'main-page', '10.json');
    mkdirSync(path.dirname(staleFilePath), { recursive: true });
    writeFileSync(staleFilePath, JSON.stringify(samplePage(10, 'main-page', '10'), null, 2));

    const manifestPath = path.join(root, 'wordpress', 'git.json');
    mkdirSync(path.dirname(manifestPath), { recursive: true });
    writeFileSync(
      manifestPath,
      JSON.stringify(
        {
          version: 2,
          head: null,
          commits: [],
          objects: {
            'component:10': {
              id: 10,
              kind: 'component',
              slug: 'main-page',
              title: 'Title 10',
              filePath: 'wordpress/components/main-page/10.json',
              localHash: 'stale',
              lastPushedHash: null,
              lastPulledHash: null,
              updatedAt: new Date().toISOString()
            }
          },
          updatedAt: new Date().toISOString()
        },
        null,
        2
      )
    );

    const engine = new SyncEngine(root, provider);
    await engine.pull({ all: true });

    const manifest = JSON.parse(readFileSync(path.join(root, 'wordpress', 'git.json'), 'utf8'));
    expect(Object.keys(manifest.objects)).toEqual(['page:10']);
    expect(existsSync(staleFilePath)).toBe(false);
    expect(existsSync(path.join(root, 'wordpress', 'pages', 'main-page', '10.json'))).toBe(true);
  });

  test('pull decodes percent-encoded slug/link for local files', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wp-sync-'));
    const encodedSlug = '%d0%b3%d0%be%d0%bb%d0%be%d0%b2%d0%bd%d0%b0';
    const decodedSlug = 'головна';
    const provider = new MockProvider({
      'page:10': {
        ...samplePage(10, encodedSlug, '10'),
        link: `https://example.com/uk/${encodedSlug}/`
      }
    });

    const engine = new SyncEngine(root, provider);
    await engine.init();
    await engine.pull({ all: true });

    const file = path.join(root, 'wordpress', 'pages', decodedSlug, '10.json');
    expect(existsSync(file)).toBe(true);
    const parsed = JSON.parse(readFileSync(file, 'utf8'));
    expect(parsed.slug).toBe(decodedSlug);
    expect(parsed.link).toBe(`https://example.com/uk/${decodedSlug}/`);
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

  test('listRemote returns remote objects for requested kind', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'wp-sync-'));
    const provider = new MockProvider({
      'page:10': samplePage(10, 'main-page', '10'),
      'component:11': {
        id: 11,
        type: 'elementor_library',
        slug: 'hero-banner',
        title: { rendered: 'Hero Banner' },
        status: 'publish',
        meta: {
          _elementor_data: [{ id: '11', elType: 'section' }]
        }
      }
    });

    const engine = new SyncEngine(root, provider);

    const pages = await engine.listRemote('page');
    const components = await engine.listRemote('component');

    expect(pages).toHaveLength(1);
    expect(pages[0].id).toBe(10);
    expect(components).toHaveLength(1);
    expect(components[0].id).toBe(11);
    expect(existsSync(path.join(root, 'wordpress'))).toBe(false);
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

  test('commit creates history entry and rollback restores previous version', async () => {
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
