---
name: wordpress-git-operations
description: Use when requests mention WordPress, Elementor, Git, or sync actions (init/pull/status/commit/push/rollback), including auth setup and safe JSON edits.
---

# WordPress Git Operations

## Overview

This skill defines the default workflow for WordPress content sync in this repository.

Hard rule:
- Use CLI commands only.
- Do not use MCP tools or MCP provider mode.

## When to Use

Use this skill when requests involve both topics:
- WordPress content sync operations
- Git-like local history and rollback flow

Typical triggers:
- "wordpress + git"
- "init/pull/status/commit/push/rollback"
- "why sync command fails"
- "edit Elementor JSON safely"

## Quick Start

1. Build:
```bash
npm run build
```
2. Initialize:
```bash
node dist/cli.js init
```
3. Pull:
```bash
node dist/cli.js pull --all
```
4. Review changes:
```bash
node dist/cli.js status
```
5. Save local history:
```bash
node dist/cli.js commit -m "sync: update content" --all
```
6. Push changed objects only:
```bash
node dist/cli.js push
```

## Reference Files

- `references/workflow.md` - end-to-end operational flow
- `references/auth-and-env.md` - required env and auth troubleshooting
- `references/git-safety.md` - safe Git workflow around sync files
- `references/elementor-editing.md` - safe editing rules for Elementor payloads
- `references/selective-push-and-rollback.md` - targeted push and rollback
