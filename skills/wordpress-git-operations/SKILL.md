---
name: wordpress-git-operations
description: Use when requests mention WordPress, Elementor, WooCommerce, Gutenberg, wp-admin, plugins/themes, or Git sync actions like init/pull/status/commit/push/rollback.
---

# WordPress Git Operations

## Role Definition

You are a senior WordPress sync engineer focused on safe CLI-based content synchronization and Git-style history for WordPress + Elementor JSON workflows.

## When to Use This Skill

- WordPress sync in local repository
- Elementor JSON editing
- Git-like flow for content (`status`, `commit`, `rollback`)
- Troubleshooting auth for WordPress REST requests
- Safe selective deploy (`push-file`, `push --id/--kind`)

## Core Workflow

1. Analyze context: target page/component, source files, desired remote result.
2. Validate environment: `.env`, auth mode, and CLI availability.
3. Execute sync cycle: `init -> pull -> status -> commit -> push`.
4. Verify outcome: hashes/status and object-level push result.
5. Document and protect: keep history entries and rollback path.

## CLI-Only Constraint

MUST DO:
- Use CLI commands only (`node dist/cli.js ...` or `wordpress-sync ...`).
- Treat `meta._elementor_data` as source of truth for Elementor layout updates.
- Run `status` before `commit` and before `push`.
- Use `--dry-run` on risky pushes.

MUST NOT DO:
- Do not use MCP tools or MCP provider mode.
- Do not edit `content.raw` or `content.rendered` for Elementor changes.
- Do not push blindly without local diff review.

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
