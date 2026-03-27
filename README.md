# WordPress Sync (TypeScript CLI)

NPM package (legacy name): `@interfuse/wordpress-mcp`  
[NPM page](https://www.npmjs.com/package/@interfuse/wordpress-mcp)

## What This Is

`wordpress-sync` is a CLI tool for syncing WordPress and Elementor content into local JSON files with a Git-like workflow.

It is built for team collaboration, code review, and predictable content delivery:

- pull content from WordPress into local files
- review local changes with `status`
- save local history with `commit`
- push selected objects or files back to WordPress
- rollback local state to any saved commit

## Installation

### Option 1: run from npm without global install (recommended)

```bash
npx -y @interfuse/wordpress-mcp --help
npx -y @interfuse/wordpress-mcp init
```

### Option 2: global install

```bash
npm i -g @interfuse/wordpress-mcp
wordpress-sync --help
```

### Option 3: local development from this repository

```bash
npm install
npm run build
node dist/cli.js --help
```

### For Codex AI (one prompt)

```Fetch and follow instructions from https://raw.githubusercontent.com/InterFuseAgency/wordpress-sync/refs/heads/main/.codex/INSTALL.md```

### Minimum environment variables

```bash
WP_URL=https://example.com
WP_APP_USER=wordpress_user
WP_APP_PASSWORD="password"
WP_AUTH_MODE=session
```

## Documentation

### English

- [Documentation Index](./docs/README.md)
- [Features](./docs/01-features.md)
- [CLI Commands and Flags](./docs/02-cli-flags.md)
- [Environment Variables](./docs/04-env-vars.md)
- [History Modes and Diff Format](./docs/05-history-modes.md)
- [MCP Migration Note](./docs/03-mcp-tools.md)
- [Codex Skill Install Guide](./.codex/INSTALL.md)

### Ukrainian Translation

- [Українська версія README](./README.uk.md)
- [Індекс документації (UKR)](./docs/README.uk.md)
- [Можливості (UKR)](./docs/01-features.uk.md)
- [CLI команди та прапорці (UKR)](./docs/02-cli-flags.uk.md)
- [Змінні оточення (UKR)](./docs/04-env-vars.uk.md)
- [Режими історії та формат diff (UKR)](./docs/05-history-modes.uk.md)
- [Нотатка щодо міграції з MCP (UKR)](./docs/03-mcp-tools.uk.md)
