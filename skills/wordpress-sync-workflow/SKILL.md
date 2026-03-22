---
name: wordpress-sync-workflow
description: Use when running the standard WordPress/Elementor sync cycle for this tool: init, pull, status, commit, and push with hash-aware updates.
---

# WordPress Sync Workflow

## Overview
Use this flow for day-to-day synchronization between local JSON files and WordPress.
The tool stores full WP objects locally and pushes only changed Elementor payloads.

## Standard Flow
1. Build CLI:
```bash
npm run build
```
2. Initialize workspace:
```bash
node dist/cli.js --provider rest init
```
3. Pull content:
```bash
node dist/cli.js --provider rest pull --all
```
or:
```bash
node dist/cli.js --provider rest pull --id 3625 --kind page
```
4. Check diff:
```bash
node dist/cli.js --provider rest status
```
5. Commit local changes:
```bash
node dist/cli.js --provider rest commit -m "sync: update home" --all
```
6. Push only changed objects:
```bash
node dist/cli.js --provider rest push
```

## Environment
```bash
WP_URL=https://example.com
WP_APP_USER=admin
WP_APP_PASSWORD=secret
```

## Rules
- Keep `wordpress/git.json` under version control.
- Edit Elementor structure through `meta._elementor_data`.
- Use `status` before `commit` and before `push`.

