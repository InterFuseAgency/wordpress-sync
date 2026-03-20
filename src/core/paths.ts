import path from 'node:path';

export interface WorkspacePaths {
  root: string;
  wordpressDir: string;
  gitFile: string;
  pagesDir: string;
  componentsDir: string;
  historyDir: string;
}

export function resolveWorkspacePaths(root: string): WorkspacePaths {
  const wordpressDir = path.join(root, 'wordpress');
  return {
    root,
    wordpressDir,
    gitFile: path.join(wordpressDir, 'git.json'),
    pagesDir: path.join(wordpressDir, 'pages'),
    componentsDir: path.join(wordpressDir, 'components'),
    historyDir: path.join(wordpressDir, '.history')
  };
}
