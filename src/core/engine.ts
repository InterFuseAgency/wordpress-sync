import { existsSync } from 'node:fs';
import { mkdir, readdir, rm, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import type {
  CommitEntry,
  CommitResult,
  CommitSelector,
  GitManifest,
  HistoryMode,
  HistoryWriteOptions,
  PullSelector,
  PushResult,
  PushSelector,
  RollbackSelector,
  SyncEngineOptions,
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
import { decodePercentEncoded, slugify } from '../utils/slug.js';

type ScannedEntry = {
  tracked: TrackedObject;
  object: WpObject;
};

type JsonPatchOperation =
  | {
      op: 'add' | 'replace';
      path: string;
      value: unknown;
    }
  | {
      op: 'remove';
      path: string;
    };

type LegacyJsonDiffOperation =
  | {
      op: 'set';
      path: Array<string | number>;
      value: unknown;
    }
  | {
      op: 'remove';
      path: Array<string | number>;
    };

type HistoryObjectChange =
  | {
      key: string;
      mode: 'full';
      tracked: TrackedObject;
      object: WpObject;
    }
  | {
      key: string;
      mode: 'diff';
      tracked: TrackedObject;
      format: 'json-patch' | 'legacy-set-remove';
      patch?: JsonPatchOperation[];
      diff?: LegacyJsonDiffOperation[];
    }
  | {
      key: string;
      mode: 'delete';
    };

type HistoryCommitRecord = {
  id: string;
  message: string;
  createdAt: string;
  changedObjects: string[];
  mode: 'full' | 'diff';
  changes: HistoryObjectChange[];
};

type HistoryStateEntry = {
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cloneValue<T>(value: T): T {
  if (value === undefined) {
    return value;
  }
  return structuredClone(value);
}

function encodeJsonPointerToken(input: string): string {
  return input.replace(/~/g, '~0').replace(/\//g, '~1');
}

function decodeJsonPointerToken(input: string): string {
  return input.replace(/~1/g, '/').replace(/~0/g, '~');
}

function toPointer(path: Array<string | number>): string {
  if (path.length === 0) {
    return '';
  }

  return `/${path
    .map((segment) => encodeJsonPointerToken(String(segment)))
    .join('/')}`;
}

function createJsonPatch(previous: unknown, next: unknown, pathSegments: Array<string | number> = []): JsonPatchOperation[] {
  if (Object.is(previous, next)) {
    return [];
  }

  if (Array.isArray(previous) && Array.isArray(next)) {
    const out: JsonPatchOperation[] = [];
    const commonLength = Math.min(previous.length, next.length);

    for (let index = 0; index < commonLength; index += 1) {
      out.push(...createJsonPatch(previous[index], next[index], [...pathSegments, index]));
    }

    for (let index = previous.length - 1; index >= next.length; index -= 1) {
      out.push({ op: 'remove', path: toPointer([...pathSegments, index]) });
    }

    for (let index = commonLength; index < next.length; index += 1) {
      out.push({
        op: 'add',
        path: toPointer([...pathSegments, index]),
        value: cloneValue(next[index])
      });
    }

    return out;
  }

  if (isPlainObject(previous) && isPlainObject(next)) {
    const out: JsonPatchOperation[] = [];
    const nextKeys = new Set(Object.keys(next));

    for (const key of Object.keys(previous)) {
      if (!nextKeys.has(key)) {
        out.push({ op: 'remove', path: toPointer([...pathSegments, key]) });
      }
    }

    for (const key of Object.keys(next)) {
      if (!(key in previous)) {
        out.push({
          op: 'add',
          path: toPointer([...pathSegments, key]),
          value: cloneValue(next[key])
        });
        continue;
      }
      out.push(...createJsonPatch(previous[key], next[key], [...pathSegments, key]));
    }

    return out;
  }

  return [
    {
      op: pathSegments.length === 0 ? 'add' : 'replace',
      path: toPointer(pathSegments),
      value: cloneValue(next)
    }
  ];
}

function parseJsonPointer(path: string): string[] {
  if (path === '') {
    return [];
  }
  if (!path.startsWith('/')) {
    throw new Error(`Invalid JSON pointer '${path}'`);
  }
  return path
    .slice(1)
    .split('/')
    .map((token) => decodeJsonPointerToken(token));
}

function isContainer(value: unknown): value is Record<string, unknown> | unknown[] {
  return isPlainObject(value) || Array.isArray(value);
}

function ensurePathContainer(root: unknown, pathSegments: string[]): Record<string, unknown> | unknown[] {
  let current: unknown = root;

  for (let index = 0; index < pathSegments.length; index += 1) {
    const segment = pathSegments[index];
    const nextSegment = pathSegments[index + 1];

    if (Array.isArray(current)) {
      const arrayIndex = segment === '-' ? current.length : Number(segment);
      if (!Number.isInteger(arrayIndex) || arrayIndex < 0) {
        throw new Error(`Invalid array index in diff path: ${String(segment)}`);
      }

      if (!isContainer(current[arrayIndex])) {
        current[arrayIndex] = typeof nextSegment === 'number' ? [] : {};
      }
      current = current[arrayIndex];
      continue;
    }

    if (!isPlainObject(current)) {
      throw new Error('Invalid diff path: expected object container');
    }

    const key = String(segment);
    if (!isContainer(current[key])) {
      current[key] = nextSegment !== undefined && /^(\d+|-)$/.test(nextSegment) ? [] : {};
    }
    current = current[key];
  }

  if (!isContainer(current)) {
    throw new Error('Invalid diff path: expected final container');
  }

  return current;
}

function getPathContainer(root: unknown, pathSegments: string[]): Record<string, unknown> | unknown[] | null {
  let current: unknown = root;

  for (const segment of pathSegments) {
    if (Array.isArray(current)) {
      const arrayIndex = segment === '-' ? current.length : Number(segment);
      if (!Number.isInteger(arrayIndex) || arrayIndex < 0 || arrayIndex >= current.length) {
        return null;
      }
      current = current[arrayIndex];
      continue;
    }

    if (!isPlainObject(current)) {
      return null;
    }

    const key = String(segment);
    if (!(key in current)) {
      return null;
    }
    current = current[key];
  }

  return isContainer(current) ? current : null;
}

function applyJsonPatch(base: unknown, operations: JsonPatchOperation[]): unknown {
  let output = cloneValue(base);

  for (const operation of operations) {
    const pathSegments = parseJsonPointer(operation.path);
    if (pathSegments.length === 0) {
      if (operation.op === 'remove') {
        output = undefined;
      } else {
        output = cloneValue(operation.value);
      }
      continue;
    }

    if (!isContainer(output) && operation.op !== 'remove') {
      output = /^(\d+|-)$/.test(pathSegments[0]) ? [] : {};
    }

    const parentPath = pathSegments.slice(0, -1);
    const leaf = pathSegments[pathSegments.length - 1];

    if (operation.op === 'add' || operation.op === 'replace') {
      const parent = ensurePathContainer(output, parentPath);
      if (Array.isArray(parent)) {
        const index = leaf === '-' ? parent.length : Number(leaf);
        if (!Number.isInteger(index) || index < 0) {
          throw new Error(`Invalid set index in diff path: ${String(leaf)}`);
        }
        if (operation.op === 'add') {
          if (index >= parent.length) {
            parent.push(cloneValue(operation.value));
          } else {
            parent.splice(index, 0, cloneValue(operation.value));
          }
        } else {
          parent[index] = cloneValue(operation.value);
        }
      } else {
        parent[String(leaf)] = cloneValue(operation.value);
      }
      continue;
    }

    const parent = getPathContainer(output, parentPath);
    if (!parent) {
      continue;
    }

    if (Array.isArray(parent)) {
      const index = Number(leaf);
      if (Number.isInteger(index) && index >= 0 && index < parent.length) {
        parent.splice(index, 1);
      }
    } else {
      delete parent[String(leaf)];
    }
  }

  return output;
}

function applyLegacyJsonDiff(base: unknown, operations: LegacyJsonDiffOperation[]): unknown {
  let output = cloneValue(base);

  for (const operation of operations) {
    if (operation.path.length === 0) {
      if (operation.op === 'remove') {
        output = undefined;
      } else {
        output = cloneValue(operation.value);
      }
      continue;
    }

    if (!isContainer(output)) {
      output = typeof operation.path[0] === 'number' ? [] : {};
    }

    const parentPath = operation.path.slice(0, -1).map((segment) => String(segment));
    const leaf = operation.path[operation.path.length - 1];

    if (operation.op === 'set') {
      const parent = ensurePathContainer(output, parentPath);
      if (Array.isArray(parent)) {
        const index = Number(leaf);
        if (!Number.isInteger(index) || index < 0) {
          throw new Error(`Invalid set index in legacy diff path: ${String(leaf)}`);
        }
        parent[index] = cloneValue(operation.value);
      } else {
        parent[String(leaf)] = cloneValue(operation.value);
      }
      continue;
    }

    const parent = getPathContainer(output, parentPath);
    if (!parent) {
      continue;
    }

    if (Array.isArray(parent)) {
      const index = Number(leaf);
      if (Number.isInteger(index) && index >= 0 && index < parent.length) {
        parent.splice(index, 1);
      }
    } else {
      delete parent[String(leaf)];
    }
  }

  return output;
}

export class SyncEngine {
  private readonly paths;
  private readonly defaultHistoryMode: HistoryMode;

  static kindFromCli(input: string): SyncTargetKind {
    if (input === 'page' || input === 'component') {
      return input;
    }
    throw new Error(`Invalid kind '${input}'. Use page|component`);
  }

  static historyModeFromCli(input: string): HistoryMode {
    const normalized = input.trim().toLowerCase();
    if (normalized === 'json-patch' || normalized === 'patch' || normalized === 'diff') {
      return 'json-patch';
    }
    if (normalized === 'full' || normalized === 'full-object') {
      return 'full';
    }
    throw new Error(`Invalid history mode '${input}'. Use json-patch|full`);
  }

  constructor(
    private readonly root: string,
    private readonly provider: SyncProvider,
    options: SyncEngineOptions = {}
  ) {
    this.paths = resolveWorkspacePaths(root);
    this.defaultHistoryMode = options.historyMode ?? 'json-patch';
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

  async pull(selector: PullSelector, _options: HistoryWriteOptions = {}): Promise<string[]> {
    await this.init();
    const manifest = await loadManifest(this.paths.gitFile);
    const objects = await this.resolvePullObjects(selector);
    const changedKeys: string[] = [];
    const pulledEntries = new Map<string, ScannedEntry>();

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

      pulledEntries.set(key, {
        tracked: manifest.objects[key],
        object: normalizedObject
      });

      changedKeys.push(key);
    }

    const changedObjects = Array.from(new Set(changedKeys)).sort();
    if (changedObjects.length > 0) {
      await this.appendHistoryEntry(
        manifest,
        this.pullMessage(selector),
        changedObjects,
        'full',
        pulledEntries
      );
    } else {
      await saveManifest(this.paths.gitFile, manifest);
    }
    return changedKeys;
  }

  async listRemote(kind: SyncTargetKind): Promise<WpObject[]> {
    return this.provider.list(kind);
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

  async commit(selector: CommitSelector, options: HistoryWriteOptions = {}): Promise<CommitResult> {
    await this.init();
    const historyMode = this.resolveHistoryMode(options.historyMode);
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

    const changedObjects = Array.from(changed).sort();
    const commitId = await this.appendHistoryEntry(
      manifest,
      selector.message,
      changedObjects,
      historyMode === 'full' ? 'full' : 'diff',
      scanned
    );

    return { commitId, changedObjects };
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
    const targetCommitIndex = manifest.commits.findIndex((item) => item.id === selector.commitId);
    if (targetCommitIndex === -1) {
      throw new Error(`Commit '${selector.commitId}' not found`);
    }

    const targetState = await this.restoreStateAtCommit(manifest.commits, selector.commitId);
    const hasSelector = selector.file || selector.id !== undefined;

    if (!hasSelector) {
      await this.writeWorkspaceState(targetState);
      manifest.objects = this.stateToManifestObjects(targetState);
      manifest.commits = manifest.commits.slice(0, targetCommitIndex + 1);
      manifest.head = selector.commitId;
      await saveManifest(this.paths.gitFile, manifest);
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
    const target = targetState.get(key);
    if (!target) {
      const existing = current.objects[key];
      if (existing) {
        await unlink(path.join(this.root, existing.filePath)).catch(() => undefined);
        delete current.objects[key];
        await saveManifest(this.paths.gitFile, current);
      }
      return;
    }

    const previous = current.objects[key];
    if (previous && previous.filePath !== target.tracked.filePath) {
      await unlink(path.join(this.root, previous.filePath)).catch(() => undefined);
    }

    await this.writeStateEntry(target);
    current.objects[key] = target.tracked;
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
      const normalizedSlug = decodePercentEncoded(selector.slug);
      if (selector.kind) {
        const found = await this.provider.getBySlug(selector.kind, normalizedSlug);
        return found ? [found] : [];
      }
      const both = await Promise.all([
        this.provider.getBySlug('page', normalizedSlug),
        this.provider.getBySlug('component', normalizedSlug)
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

  private async appendHistoryEntry(
    manifest: GitManifest,
    message: string,
    changedObjects: string[],
    mode: 'full' | 'diff',
    scanned: Map<string, ScannedEntry>
  ): Promise<string> {
    const commitId = randomCommitId();
    const createdAt = nowIso();
    const parentCommitId = manifest.head;
    const changes = await this.buildHistoryChanges({
      changedObjects,
      mode,
      scanned,
      trackedObjects: manifest.objects,
      commits: manifest.commits,
      parentCommitId
    });

    const historyRecord: HistoryCommitRecord = {
      id: commitId,
      message,
      createdAt,
      changedObjects,
      mode,
      changes
    };

    const snapshotPath = await this.writeHistoryRecord(commitId, historyRecord);
    const entry: CommitEntry = {
      id: commitId,
      message,
      createdAt,
      changedObjects,
      snapshotPath,
      mode
    };

    manifest.commits.push(entry);
    manifest.head = commitId;
    await saveManifest(this.paths.gitFile, manifest);
    return commitId;
  }

  private async buildHistoryChanges(params: {
    changedObjects: string[];
    mode: 'full' | 'diff';
    scanned: Map<string, ScannedEntry>;
    trackedObjects: Record<string, TrackedObject>;
    commits: CommitEntry[];
    parentCommitId: string | null;
  }): Promise<HistoryObjectChange[]> {
    const { changedObjects, mode, scanned, trackedObjects, commits, parentCommitId } = params;
    const previousState =
      mode === 'diff' && parentCommitId
        ? await this.restoreStateAtCommit(commits, parentCommitId)
        : new Map<string, HistoryStateEntry>();

    const changes: HistoryObjectChange[] = [];

    for (const key of changedObjects) {
      const currentScanned = scanned.get(key);
      const currentTracked = trackedObjects[key];
      if (!currentScanned || !currentTracked) {
        changes.push({ key, mode: 'delete' });
        continue;
      }

      if (mode === 'full') {
        changes.push({
          key,
          mode: 'full',
          tracked: cloneValue(currentTracked),
          object: cloneValue(currentScanned.object)
        });
        continue;
      }

      const previous = previousState.get(key);
      changes.push({
        key,
        mode: 'diff',
        tracked: cloneValue(currentTracked),
        format: 'json-patch',
        patch: createJsonPatch(previous?.object, currentScanned.object)
      });
    }

    return changes;
  }

  private async writeHistoryRecord(commitId: string, record: HistoryCommitRecord): Promise<string> {
    const filePath = path.join(this.paths.historyDir, commitId, 'entry.json');
    await mkdir(path.dirname(filePath), { recursive: true });
    await writePrettyJsonFile(filePath, record);
    return toPosixPath(path.relative(this.root, filePath));
  }

  private async readHistoryRecord(entry: CommitEntry): Promise<HistoryCommitRecord | null> {
    if (!entry.snapshotPath.endsWith('.json')) {
      return null;
    }
    const absolutePath = path.join(this.root, entry.snapshotPath);
    if (!existsSync(absolutePath)) {
      return null;
    }
    return readJsonFile<HistoryCommitRecord>(absolutePath);
  }

  private isLegacySnapshotEntry(entry: CommitEntry): boolean {
    return entry.mode === 'snapshot' || !entry.snapshotPath.endsWith('.json');
  }

  private async loadLegacySnapshotState(entry: CommitEntry): Promise<Map<string, HistoryStateEntry>> {
    const state = new Map<string, HistoryStateEntry>();
    const snapshotRoot = path.join(this.root, entry.snapshotPath, 'wordpress');
    const snapshotManifestFile = path.join(snapshotRoot, 'git.json');

    if (!existsSync(snapshotManifestFile)) {
      throw new Error(`Legacy snapshot for commit '${entry.id}' is missing`);
    }

    const snapshotManifest = await readJsonFile<GitManifest>(snapshotManifestFile);
    for (const [key, tracked] of Object.entries(snapshotManifest.objects)) {
      const sourcePath = path.join(snapshotRoot, tracked.filePath.replace(/^wordpress\//, ''));
      if (!existsSync(sourcePath)) {
        continue;
      }
      const objectRaw = await readJsonFile<WpObject>(sourcePath);
      const object = normalizeWpObjectElementorData(objectRaw);
      state.set(key, {
        tracked: cloneValue(tracked),
        object
      });
    }

    return state;
  }

  private applyChangesToState(
    state: Map<string, HistoryStateEntry>,
    changes: HistoryObjectChange[],
    commitId: string
  ): void {
    for (const change of changes) {
      if (change.mode === 'delete') {
        state.delete(change.key);
        continue;
      }

      if (change.mode === 'full') {
        state.set(change.key, {
          tracked: cloneValue(change.tracked),
          object: cloneValue(change.object)
        });
        continue;
      }

      const previous = state.get(change.key);
      const patched =
        change.format === 'json-patch'
          ? applyJsonPatch(previous?.object, change.patch ?? [])
          : applyLegacyJsonDiff(previous?.object, change.diff ?? []);
      if (!isPlainObject(patched)) {
        throw new Error(`Corrupted history at commit '${commitId}' for '${change.key}': invalid diff payload`);
      }

      state.set(change.key, {
        tracked: cloneValue(change.tracked),
        object: normalizeWpObjectElementorData(patched as WpObject)
      });
    }
  }

  private async restoreStateAtCommit(
    commits: CommitEntry[],
    commitId: string
  ): Promise<Map<string, HistoryStateEntry>> {
    const state = new Map<string, HistoryStateEntry>();

    for (const entry of commits) {
      if (this.isLegacySnapshotEntry(entry)) {
        const snapshotState = await this.loadLegacySnapshotState(entry);
        state.clear();
        for (const [key, item] of snapshotState.entries()) {
          state.set(key, item);
        }
      } else {
        const record = await this.readHistoryRecord(entry);
        if (!record) {
          throw new Error(`History record for commit '${entry.id}' is missing`);
        }
        this.applyChangesToState(state, record.changes, entry.id);
      }

      if (entry.id === commitId) {
        return state;
      }
    }

    throw new Error(`Commit '${commitId}' not found`);
  }

  private stateToManifestObjects(state: Map<string, HistoryStateEntry>): Record<string, TrackedObject> {
    const objects: Record<string, TrackedObject> = {};
    for (const [key, entry] of state.entries()) {
      objects[key] = cloneValue(entry.tracked);
    }
    return objects;
  }

  private async writeStateEntry(entry: HistoryStateEntry): Promise<void> {
    const target = path.join(this.root, entry.tracked.filePath);
    await mkdir(path.dirname(target), { recursive: true });
    await writePrettyJsonFile(target, entry.object);
  }

  private async writeWorkspaceState(state: Map<string, HistoryStateEntry>): Promise<void> {
    await rm(this.paths.pagesDir, { recursive: true, force: true });
    await rm(this.paths.componentsDir, { recursive: true, force: true });
    await mkdir(this.paths.pagesDir, { recursive: true });
    await mkdir(this.paths.componentsDir, { recursive: true });

    for (const entry of state.values()) {
      await this.writeStateEntry(entry);
    }
  }

  private resolveHistoryMode(input?: HistoryMode): HistoryMode {
    return input ?? this.defaultHistoryMode;
  }

  private pullMessage(selector: PullSelector): string {
    if (selector.all) return 'pull: all';
    if (selector.id !== undefined) {
      const kind = selector.kind ?? 'page';
      return `pull: ${kind}:${selector.id}`;
    }
    if (selector.slug) {
      return selector.kind
        ? `pull: ${selector.kind} slug:${selector.slug}`
        : `pull: slug:${selector.slug}`;
    }
    return 'pull';
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
}
