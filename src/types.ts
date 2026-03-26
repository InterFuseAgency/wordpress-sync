export type SyncTargetKind = 'page' | 'component';
export type HistoryMode = 'json-patch' | 'full';

export type ElementorData = unknown;

export interface WpObject {
  id: number;
  type?: string;
  slug?: string;
  title?: { rendered?: string } | string;
  status?: string;
  content?: { raw?: string; rendered?: string } | string;
  meta?: {
    _elementor_data?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface UpdatePayload {
  title?: string;
  status?: string;
  content?: string;
  slug?: string;
  elementor_data?: string;
}

export interface SyncProvider {
  list(kind: SyncTargetKind): Promise<WpObject[]>;
  getById(kind: SyncTargetKind, id: number): Promise<WpObject>;
  getBySlug(kind: SyncTargetKind, slug: string): Promise<WpObject | null>;
  updateById(kind: SyncTargetKind, id: number, payload: UpdatePayload): Promise<WpObject>;
}

export interface TrackedObject {
  id: number;
  kind: SyncTargetKind;
  slug: string;
  title: string;
  filePath: string;
  localHash: string;
  lastPushedHash: string | null;
  lastPulledHash: string | null;
  updatedAt: string;
}

export interface CommitEntry {
  id: string;
  message: string;
  createdAt: string;
  changedObjects: string[];
  snapshotPath: string;
  mode?: 'snapshot' | 'full' | 'diff';
}

export interface GitManifest {
  version: number;
  head: string | null;
  commits: CommitEntry[];
  objects: Record<string, TrackedObject>;
  updatedAt: string;
}

export interface SyncDiff {
  added: string[];
  modified: string[];
  deleted: string[];
}

export interface PushResult {
  updated: string[];
  skipped: string[];
  failed: Array<{ key: string; error: string }>;
}

export interface PullSelector {
  all?: boolean;
  id?: number;
  kind?: SyncTargetKind;
  slug?: string;
}

export interface HistoryWriteOptions {
  historyMode?: HistoryMode;
}

export interface SyncEngineOptions {
  historyMode?: HistoryMode;
}

export interface CommitSelector {
  all?: boolean;
  file?: string;
  message: string;
}

export interface PushSelector {
  all?: boolean;
  file?: string;
  id?: number;
  kind?: SyncTargetKind;
  dryRun?: boolean;
}

export interface RollbackSelector {
  commitId: string;
  file?: string;
  id?: number;
  kind?: SyncTargetKind;
}

export interface CommitResult {
  commitId: string;
  changedObjects: string[];
}
