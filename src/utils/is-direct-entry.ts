import { realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function isDirectEntry(
  importMetaUrl: string,
  argvPath: string | undefined = process.argv[1]
): boolean {
  if (!argvPath) {
    return false;
  }

  try {
    const modulePath = realpathSync(fileURLToPath(importMetaUrl));
    const invokedPath = realpathSync(argvPath);
    return modulePath === invokedPath;
  } catch {
    try {
      return importMetaUrl === pathToFileURL(argvPath).href;
    } catch {
      return false;
    }
  }
}
