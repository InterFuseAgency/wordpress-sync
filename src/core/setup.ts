import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import dotenv from 'dotenv';

const execFileAsync = promisify(execFile);

const REQUIRED_CONNECTION_KEYS = ['WP_URL', 'WP_APP_USER', 'WP_APP_PASSWORD'] as const;

export type RequiredConnectionKey = (typeof REQUIRED_CONNECTION_KEYS)[number];

export type GitInitRunner = (cwd: string) => Promise<void>;

function formatEnvValue(value: string): string {
  if (/[\s"'`#]/.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}

async function defaultGitInitRunner(cwd: string): Promise<void> {
  await execFileAsync('git', ['init'], { cwd });
}

export function loadProjectEnv(root: string): void {
  const envPath = path.join(root, '.env');
  if (!existsSync(envPath)) {
    return;
  }

  dotenv.config({
    path: envPath,
    override: false
  });
}

export function getMissingConnectionKeys(
  env: Record<string, string | undefined> = process.env
): RequiredConnectionKey[] {
  const missing: RequiredConnectionKey[] = [];

  for (const key of REQUIRED_CONNECTION_KEYS) {
    const value = env[key];
    if (!value || !value.trim()) {
      missing.push(key);
    }
  }

  return missing;
}

export async function ensureGitInitialized(
  root: string,
  runGitInit: GitInitRunner = defaultGitInitRunner
): Promise<boolean> {
  if (existsSync(path.join(root, '.git'))) {
    return false;
  }

  await runGitInit(root);
  return true;
}

export async function upsertProjectEnv(
  root: string,
  values: Record<string, string>
): Promise<void> {
  const envPath = path.join(root, '.env');
  const source = existsSync(envPath) ? await readFile(envPath, 'utf8') : '';
  const lines = source.length > 0 ? source.split(/\r?\n/) : [];
  const indexByKey = new Map<string, number>();

  lines.forEach((line, index) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (!match) return;
    indexByKey.set(match[1], index);
  });

  for (const [key, raw] of Object.entries(values)) {
    const nextLine = `${key}=${formatEnvValue(raw)}`;
    const existingIndex = indexByKey.get(key);
    if (existingIndex === undefined) {
      lines.push(nextLine);
      indexByKey.set(key, lines.length - 1);
      continue;
    }
    lines[existingIndex] = nextLine;
  }

  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  const output = lines.length > 0 ? `${lines.join('\n')}\n` : '';
  await writeFile(envPath, output, 'utf8');
}
