import { existsSync } from 'node:fs';
import {
  copyFile,
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  unlink
} from 'node:fs/promises';
import path from 'node:path';
import type {
  CommitResult,
  CommitSelector,
  GitManifest,
  PullSelector,
  PushResult,
  PushSelector,
  RollbackSelector,
  SyncDiff,
  SyncProvider,
  SyncTargetKind,
  TrackedObject,
  WpObject
} from '../types.js';
import { loadManifest, saveManifest } from './manifest.js';
import { resolveWorkspacePaths } from './paths.js';
import {
  buildUpdatePayloadFromWpObject,
  elementorHashFromWpObject,
  normalizeWpObjectElementorData,
  prepareWpObjectForLocalEdit
} from '../utils/elementor.js';
import { writePrettyJsonFile, readJsonFile, toPosixPath } from '../utils/json.js';
import { slugify } from '../utils/slug.js';

type ScannedEntry = {
  tracked: TrackedObject;
  object: WpObject;
};

function objectKey(kind: SyncTargetKind, id: number): string {
  return `${kind}:${id}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function randomCommitId(): string {
  const random = Math.random().toString(16).slice(2, 10);
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  return `${stamp}-${random}`;
}

function kindFromWpType(type?: string): SyncTargetKind {
  return type === 'elementor_library' ? 'component' : 'page';
}

function wpTypeFromKind(kind: SyncTargetKind): string {
  return kind === 'component' ? 'elementor_library' : 'page';
}

function getTitle(value: WpObject): string {
  const title = typeof value.title === 'string' ? value.title : value.title?.rendered;
  return title?.trim() || `item-${value.id}`;
}

async function directoryExists(target: string): Promise<boolean> {
  try {
    const info = await stat(target);
    return info.isDirectory();
  } catch {
    return false;
  }
}

export class SyncEngine {
  private readonly paths;

  constructor(private readonly root: string, private readonly provider: SyncProvider) {
    this.paths = resolveWorkspacePaths(root);
  }

  async init(): Promise<void> {
    await mkdir(this.paths.wordpressDir, { recursive: true });
    await mkdir(this.paths.pagesDir, { recursive: true });
    await mkdir(this.paths.componentsDir, { recursive: true });
    await mkdir(this.paths.historyDir, { recursive: true });

    if (!existsSync(this.paths.gitFile)) {
      const empty = await loadManifest(this.paths.gitFile);
      await saveManifest(this.paths.gitFile, empty);
    }
  }

  async pull(selector: PullSelector): Promise<string[]> {
    await this.init();
    const manifest = await loadManifest(this.paths.gitFile);
    const objects = await this.resolvePullObjects(selector);
    const changedKeys: string[] = [];

    for (const object of objects) {
      const kind = selector.kind ?? kindFromWpType(object.type);
      const normalizedObject = prepareWpObjectForLocalEdit(object);
      const slug = slugify(object.slug || getTitle(object));
      const kindDir = this.kindDirectory(kind);
      const dir = path.join(kindDir, slug);
      const filePath = path.join(dir, `${normalizedObject.id}.json`);
      await mkdir(dir, { recursive: true });
      await writePrettyJsonFile(filePath, normalizedObject);

      const relPath = toPosixPath(path.relative(this.root, filePath));
      const key = objectKey(kind, normalizedObject.id);
      const hash = elementorHashFromWpObject(normalizedObject);
      const previous = manifest.objects[key];

      manifest.objects[key] = {
        id: normalizedObject.id,
        kind,
        slug,
        title: getTitle(normalizedObject),
        filePath: relPath,
        localHash: hash,
        lastPulledHash: hash,
        lastPushedHash: previous?.lastPushedHash ?? null,
        updatedAt: nowIso()
      };

      changedKeys.push(key);
    }

    await saveManifest(this.paths.gitFile, manifest);
    return changedKeys;
  }

  async status(): Promise<SyncDiff> {
    await this.init();
    const manifest = await loadManifest(this.paths.gitFile);
    const scanned = await this.scanWorkspace();
    const added: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];

    for (const [key, scannedEntry] of scanned.entries()) {
      const tracked = manifest.objects[key];
      if (!tracked) {
        added.push(key);
        continue;
      }
      if (tracked.localHash !== scannedEntry.tracked.localHash) {
        modified.push(key);
      }
    }

    for (const key of Object.keys(manifest.objects)) {
      if (!scanned.has(key)) {
        deleted.push(key);
      }
    }

    return { added, modified, deleted };
  }

  async commit(selector: CommitSelector): Promise<CommitResult> {
    await this.init();
    const manifest = await loadManifest(this.paths.gitFile);
    const scanned = await this.scanWorkspace();
    const diff = await this.status();
    const changed = new Set<string>([...diff.added, ...diff.modified, ...diff.deleted]);

    if (selector.file) {
      const key = this.objectKeyFromFile(selector.file);
      if (key) {
        changed.clear();
        changed.add(key);
      }
    }

    if (!selector.file && manifest.head === null && selector.all) {
      for (const key of scanned.keys()) {
        changed.add(key);
      }
    }

    if (changed.size === 0) {
      return { commitId: manifest.head ?? 'noop', changedObjects: [] };
    }

    for (const [key, entry] of scanned.entries()) {
      const current = manifest.objects[key];
      manifest.objects[key] = {
        ...entry.tracked,
        lastPulledHash: current?.lastPulledHash ?? null,
        lastPushedHash: current?.lastPushedHash ?? null,
        updatedAt: nowIso()
      };
    }

    for (const key of Object.keys(manifest.objects)) {
      if (!scanned.has(key)) {
        delete manifest.objects[key];
      }
    }

    const commitId = randomCommitId();
    const snapshotPath = toPosixPath(path.join('wordpress', '.history', commitId));
    const entry = {
      id: commitId,
      message: selector.message,
      createdAt: nowIso(),
      changedObjects: Array.from(changed).sort(),
      snapshotPath
    };

    manifest.commits.push(entry);
    manifest.head = commitId;
    await saveManifest(this.paths.gitFile, manifest);
    await this.createSnapshot(commitId);

    return { commitId, changedObjects: entry.changedObjects };
  }

  async push(selector: PushSelector): Promise<PushResult> {
    await this.init();
    const manifest = await loadManifest(this.paths.gitFile);
    const scanned = await this.scanWorkspace();
    const selectedKeys = await this.resolvePushKeys(selector, scanned);
    const result: PushResult = { updated: [], skipped: [], failed: [] };

    for (const key of selectedKeys) {
      const local = scanned.get(key);
      if (!local) {
        result.failed.push({ key, error: 'Local file is missing' });
        continue;
      }

      try {
        const remote = await this.provider.getById(local.tracked.kind, local.tracked.id);
        const remoteHash = elementorHashFromWpObject(remote);
        const localHash = local.tracked.localHash;

        if (remoteHash === localHash) {
          result.skipped.push(key);
          manifest.objects[key] = {
            ...local.tracked,
            lastPulledHash: manifest.objects[key]?.lastPulledHash ?? localHash,
            lastPushedHash: manifest.objects[key]?.lastPushedHash ?? localHash
          };
          continue;
        }

        if (!selector.dryRun) {
          const payload = buildUpdatePayloadFromWpObject(local.object);
          await this.provider.updateById(local.tracked.kind, local.tracked.id, payload);
          manifest.objects[key] = {
            ...local.tracked,
            lastPulledHash: manifest.objects[key]?.lastPulledHash ?? null,
            lastPushedHash: localHash,
            updatedAt: nowIso()
          };
        }

        result.updated.push(key);
      } catch (error) {
        result.failed.push({
          key,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if (!selector.dryRun) {
      await saveManifest(this.paths.gitFile, manifest);
    }
    return result;
  }

  async rollback(selector: RollbackSelector): Promise<void> {
    await this.init();
    const manifest = await loadManifest(this.paths.gitFile);
    const commit = manifest.commits.find((item) => item.id === selector.commitId);
    if (!commit) {
      throw new Error(`Commit '${selector.commitId}' not found`);
    }

    const snapshotRoot = path.join(this.root, commit.snapshotPath, 'wordpress');
    const snapshotManifestFile = path.join(snapshotRoot, 'git.json');
    const snapshotManifest = await readJsonFile<GitManifest>(snapshotManifestFile);

    const hasSelector = selector.file || selector.id !== undefined;
    if (!hasSelector) {
      await rm(this.paths.pagesDir, { recursive: true, force: true });
      await rm(this.paths.componentsDir, { recursive: true, force: true });
      await mkdir(this.paths.pagesDir, { recursive: true });
      await mkdir(this.paths.componentsDir, { recursive: true });

      const snapPages = path.join(snapshotRoot, 'pages');
      const snapComponents = path.join(snapshotRoot, 'components');
      if (await directoryExists(snapPages)) {
        await cp(snapPages, this.paths.pagesDir, { recursive: true });
      }
      if (await directoryExists(snapComponents)) {
        await cp(snapComponents, this.paths.componentsDir, { recursive: true });
      }
      await saveManifest(this.paths.gitFile, snapshotManifest);
      return;
    }

    const key =
      selector.file !== undefined
        ? this.objectKeyFromFile(selector.file)
        : selector.kind && selector.id !== undefined
          ? objectKey(selector.kind, selector.id)
          : null;

    if (!key) {
      throw new Error('Could not resolve rollback target');
    }

    const current = await loadManifest(this.paths.gitFile);
    const snapshotTracked = snapshotManifest.objects[key];
    if (!snapshotTracked) {
      const existing = current.objects[key];
      if (existing) {
        await unlink(path.join(this.root, existing.filePath)).catch(() => undefined);
        delete current.objects[key];
        await saveManifest(this.paths.gitFile, current);
      }
      return;
    }

    const source = path.join(snapshotRoot, snapshotTracked.filePath.replace(/^wordpress\//, ''));
    const target = path.join(this.root, snapshotTracked.filePath);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(source, target);
    current.objects[key] = snapshotTracked;
    await saveManifest(this.paths.gitFile, current);
  }

  async pushFile(filePath: string, dryRun = false): Promise<PushResult> {
    return this.push({ file: filePath, dryRun });
  }

  private async resolvePullObjects(selector: PullSelector): Promise<WpObject[]> {
    if (selector.all) {
      const [pages, components] = await Promise.all([
        this.provider.list('page'),
        this.provider.list('component')
      ]);
      return [...pages, ...components];
    }

    if (selector.id !== undefined) {
      if (!selector.kind) {
        throw new Error('pull by id requires --kind');
      }
      return [await this.provider.getById(selector.kind, selector.id)];
    }

    if (selector.slug) {
      if (selector.kind) {
        const found = await this.provider.getBySlug(selector.kind, selector.slug);
        return found ? [found] : [];
      }
      const both = await Promise.all([
        this.provider.getBySlug('page', selector.slug),
        this.provider.getBySlug('component', selector.slug)
      ]);
      return both.filter((item): item is WpObject => item !== null);
    }

    throw new Error('Invalid pull selector. Use --all, --id/--kind or --slug');
  }

  private async resolvePushKeys(
    selector: PushSelector,
    scanned: Map<string, ScannedEntry>
  ): Promise<string[]> {
    if (selector.file) {
      const key = this.objectKeyFromFile(selector.file);
      if (!key) {
        throw new Error(`Could not resolve tracked object for file '${selector.file}'`);
      }
      return [key];
    }

    if (selector.id !== undefined) {
      if (!selector.kind) {
        throw new Error('push by id requires --kind');
      }
      return [objectKey(selector.kind, selector.id)];
    }

    if (selector.all) {
      return Array.from(scanned.keys()).sort();
    }

    const diff = await this.status();
    return [...diff.added, ...diff.modified].sort();
  }

  private async createSnapshot(commitId: string): Promise<void> {
    const snapshotRoot = path.join(this.paths.historyDir, commitId, 'wordpress');
    await mkdir(snapshotRoot, { recursive: true });
    await cp(this.paths.pagesDir, path.join(snapshotRoot, 'pages'), {
      recursive: true
    }).catch(() => undefined);
    await cp(this.paths.componentsDir, path.join(snapshotRoot, 'components'), {
      recursive: true
    }).catch(() => undefined);
    await copyFile(this.paths.gitFile, path.join(snapshotRoot, 'git.json'));
  }

  private async scanWorkspace(): Promise<Map<string, ScannedEntry>> {
    const out = new Map<string, ScannedEntry>();
    await this.scanKindDirectory('page', this.paths.pagesDir, out);
    await this.scanKindDirectory('component', this.paths.componentsDir, out);
    return out;
  }

  private async scanKindDirectory(
    kind: SyncTargetKind,
    baseDir: string,
    out: Map<string, ScannedEntry>
  ): Promise<void> {
    if (!(await directoryExists(baseDir))) {
      return;
    }

    const slugDirs = await readdir(baseDir, { withFileTypes: true });
    for (const dirent of slugDirs) {
      if (!dirent.isDirectory()) continue;
      const slug = dirent.name;
      const objectDir = path.join(baseDir, slug);
      const files = await readdir(objectDir, { withFileTypes: true });
      for (const file of files) {
        if (!file.isFile() || !file.name.endsWith('.json')) continue;
        const idText = file.name.replace(/\.json$/, '');
        const id = Number(idText);
        if (!Number.isInteger(id)) continue;

        const absolutePath = path.join(objectDir, file.name);
        const wpObjectRaw = await readJsonFile<WpObject>(absolutePath);
        const wpObject = normalizeWpObjectElementorData(wpObjectRaw);
        const hash = elementorHashFromWpObject(wpObject);
        const relPath = toPosixPath(path.relative(this.root, absolutePath));
        const key = objectKey(kind, id);

        out.set(key, {
          object: wpObject,
          tracked: {
            id,
            kind,
            slug,
            title: getTitle(wpObject),
            filePath: relPath,
            localHash: hash,
            lastPulledHash: null,
            lastPushedHash: null,
            updatedAt: nowIso()
          }
        });
      }
    }
  }

  private objectKeyFromFile(inputPath: string): string | null {
    const absolute = path.isAbsolute(inputPath)
      ? inputPath
      : path.resolve(this.root, inputPath);
    const rel = toPosixPath(path.relative(this.root, absolute));
    const match = rel.match(/^wordpress\/(pages|components)\/[^/]+\/(\d+)\.json$/);
    if (!match) return null;
    const kind: SyncTargetKind = match[1] === 'pages' ? 'page' : 'component';
    return objectKey(kind, Number(match[2]));
  }

  private kindDirectory(kind: SyncTargetKind): string {
    return kind === 'page' ? this.paths.pagesDir : this.paths.componentsDir;
  }

  static kindFromCli(value: string): SyncTargetKind {
    if (value === 'page' || value === 'component') return value;
    throw new Error(`Unsupported kind '${value}'. Expected 'page' or 'component'.`);
  }

  static wpTypeFromKind(kind: SyncTargetKind): string {
    return wpTypeFromKind(kind);
  }
}
