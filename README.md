# WordPress Sync (TypeScript CLI + MCP)

Git-like sync tool for WordPress/Elementor content with local manifest/hashes, commit snapshots, selective push, and rollback.

## Local structure

```text
wordpress/
  git.json
  pages/
    <slug>/
      <id>.json
  components/
    <slug>/
      <id>.json
  .history/
    <commitId>/
      wordpress/
        git.json
        pages/
        components/
```

## Install

```bash
npm install
npm run build
```

## Environment

```bash
WP_URL=https://example.com
WP_APP_USER=wordpress_user
WP_APP_PASSWORD="Application Password"

# Optional for MCP mode
WP_SYNC_PROVIDER=rest # or mcp
WP_SYNC_ROOT=/absolute/workspace/path
ELEMENTOR_MCP_COMMAND=npx
ELEMENTOR_MCP_ARGS="-y elementor-mcp"
```

## CLI usage

Use via source:

```bash
npm run cli -- init
npm run cli -- pull --all
npm run cli -- status
npm run cli -- commit -m "sync: initial" --all
npm run cli -- push --all
npm run cli -- push-file wordpress/pages/main-page/4320.json
npm run cli -- rollback <commitId>
```

Or after build:

```bash
npx wordpress-sync init
```

## Commands

- `init`
- `pull --all | --id <id> --kind <page|component> | --slug <slug>`
- `status`
- `commit -m "msg" [--all|--file <path>]`
- `push [--all|--file <path>|--id <id> --kind <...>] [--dry-run]`
- `rollback <commitId> [--file <path>|--id <id> --kind <...>]`
- `push-file <path> [--dry-run]`

## MCP wrapper tools

Run:

```bash
npm run mcp
```

Exposed MCP tools:

- `sync_pull`
- `sync_status`
- `sync_commit`
- `sync_push`
- `sync_rollback`
- `sync_push_file`

## Notes

- Files store full WordPress objects (`meta._elementor_data` included).
- Push compares local canonical Elementor hash vs remote hash and skips identical content.
- Rollback is local-only; run `push` after rollback to apply remote changes.
- Components are synced as post type `elementor_library`.
