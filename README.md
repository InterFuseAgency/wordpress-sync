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
WP_APP_PASSWORD="password"

# Auth mode:
# - session (default): auto login via /wp-login.php, then use wp cookie + REST nonce
# - auto: try session first, then fallback to Basic Auth
# - basic: force Basic Auth
WP_AUTH_MODE=session

# Optional for MCP mode
WP_SYNC_PROVIDER=rest # or mcp
WP_SYNC_ROOT=/absolute/workspace/path
ELEMENTOR_MCP_COMMAND=npx
ELEMENTOR_MCP_ARGS="-y elementor-mcp"

# Optional manual session auth override (usually not needed)
WP_COOKIE="wordpress_logged_in_...=..."
WP_NONCE="0d10f2ff23"
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

## Project Skills

- `skills/elementor-data-only-editing/SKILL.md`
- `skills/wordpress-sync-workflow/SKILL.md`
- `skills/wordpress-sync-selective-push/SKILL.md`
- `skills/wordpress-sync-rollback/SKILL.md`
- `skills/wordpress-sync-auth-session/SKILL.md`

## Notes

- Files store full WordPress objects (`meta._elementor_data` included).
- Push compares local canonical Elementor hash vs remote hash and skips identical content.
- Rollback is local-only; run `push` after rollback to apply remote changes.
- Components are synced as post type `elementor_library`.
