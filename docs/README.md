# WordPress Sync Documentation

## What This Is

This is the official documentation index for `@interfuse/wordpress-mcp`, a CLI tool for syncing WordPress and Elementor content into local JSON files with history tracking.

## Installation

Recommended quick start (no global install):

```bash
npx -y @interfuse/wordpress-mcp --help
npx -y @interfuse/wordpress-mcp init
```

Required environment variables:

```bash
WP_URL=https://example.com
WP_APP_USER=wordpress_user
WP_APP_PASSWORD="password"
```

For full install and setup details, see [../README.md](../README.md).

## Documentation List

- [01-features.md](./01-features.md) - features and workflow scenarios
- [02-cli-flags.md](./02-cli-flags.md) - CLI commands and flags
- [04-env-vars.md](./04-env-vars.md) - environment variables
- [05-history-modes.md](./05-history-modes.md) - history modes and diff format
- [03-mcp-tools.md](./03-mcp-tools.md) - migration note for removed MCP mode

Ukrainian index: [README.uk.md](./README.uk.md)
