import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import prettier from 'prettier';

export async function formatJson(value: unknown): Promise<string> {
  const serialized = JSON.stringify(value);
  return prettier.format(serialized, { parser: 'json' });
}

export async function writePrettyJsonFile(filePath: string, value: unknown): Promise<void> {
  const content = await formatJson(value);
  await writeFile(filePath, content, 'utf8');
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
}

export function toPosixPath(value: string): string {
  return value.split(path.sep).join('/');
}
