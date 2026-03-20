import { existsSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import type { GitManifest } from '../types.js';
import { readJsonFile, writePrettyJsonFile } from '../utils/json.js';

export function createEmptyManifest(): GitManifest {
  return {
    version: 1,
    head: null,
    commits: [],
    objects: {},
    updatedAt: new Date().toISOString()
  };
}

export async function loadManifest(gitFile: string): Promise<GitManifest> {
  if (!existsSync(gitFile)) {
    return createEmptyManifest();
  }

  return readJsonFile<GitManifest>(gitFile);
}

export async function saveManifest(gitFile: string, manifest: GitManifest): Promise<void> {
  manifest.updatedAt = new Date().toISOString();
  await mkdir(path.dirname(gitFile), { recursive: true });
  await writePrettyJsonFile(gitFile, manifest);
}
