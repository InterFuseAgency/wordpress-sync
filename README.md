# WordPress Sync (TypeScript CLI + MCP)

NPM package: `@interfuse/wordpress-mcp`
NPM page: https://www.npmjs.com/package/@interfuse/wordpress-mcp

Git-like sync tool for WordPress/Elementor content with local manifest/hashes, diff-based history, selective push, and rollback.

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
      entry.json
```

## Local install

```bash
npm install
npm run build
```

## Install from npm

Run once without global install:

```bash
npx -y @interfuse/wordpress-mcp --help
npx -y @interfuse/wordpress-mcp init
```

Global install (optional):

```bash
npm i -g @interfuse/wordpress-mcp
wordpress-mcp --help
wordpress-mcp mcp
```

## Publish to npm (`interfuse` org)

```bash
npm whoami
npm org ls interfuse

# bump version before every new publish
npm version patch --no-git-tag-version

npm run build
npm publish --access public --otp=123456
```

`publishConfig.access=public` is configured in `package.json`.

If your local npm cache has permission issues, use:

```bash
npm --cache /tmp/npm-cache-wordpress-mcp publish --access public --otp=123456
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

# Optional manual session auth override (usually not needed)
WP_COOKIE="wordpress_logged_in_...=..."
WP_NONCE="0d10f2ff23"
```

Advanced env for MCP mode (`npx -y @interfuse/wordpress-mcp mcp`) (all optional):

```bash
# Workspace root for MCP server process (default: current working directory)
WP_SYNC_ROOT=/absolute/workspace/path

# Provider mode for MCP server (default: rest)
WP_SYNC_PROVIDER=rest # or mcp

# History mode for pull/commit entries (default: json-patch)
WP_SYNC_HISTORY_MODE=json-patch # or full

# Only relevant when WP_SYNC_PROVIDER=mcp.
# Defaults: ELEMENTOR_MCP_COMMAND=npx, ELEMENTOR_MCP_ARGS="-y elementor-mcp"
ELEMENTOR_MCP_COMMAND=npx
ELEMENTOR_MCP_ARGS="-y elementor-mcp"
```

MCP runtime bootstrap behavior:

- If the workspace has no `.git`, server auto-runs git init in the active root.
- If `WP_URL` / `WP_APP_USER` / `WP_APP_PASSWORD` are missing in MCP env and project `.env`,
  the server asks for them via MCP form elicitation.
- Collected credentials are saved into current project `.env`.

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

From the published npm package:

```bash
npx -y @interfuse/wordpress-mcp init
```

## Commands

- `init`
- `pull --all | --id <id> --kind <page|component> | --slug <slug>`
- `status`
- `commit -m "msg" [--all|--file <path>]`
- `push [--all|--file <path>|--id <id> --kind <...>] [--dry-run]`
- `rollback <commitId> [--file <path>|--id <id> --kind <...>]`
- `push-file <path> [--dry-run]`

Global flags:

- `--root <path>`
- `--provider <rest|mcp>`
- `--history-mode <json-patch|full>`

## MCP wrapper tools

Run:

```bash
npm run mcp
# or from npm package:
npx -y @interfuse/wordpress-mcp mcp
```

MCP client config via `npx`:

```json
{
  "mcpServers": {
    "wordpress-sync": {
      "command": "npx",
      "args": ["-y", "@interfuse/wordpress-mcp", "mcp"],
      "env": {
        "WP_URL": "https://example.com",
        "WP_APP_USER": "wordpress_user",
        "WP_APP_PASSWORD": "password",
        "WP_AUTH_MODE": "session"
      }
    }
  }
}
```

Exposed MCP tools:

- `sync_setup`
- `sync_list_pages`
- `sync_list_components`
- `sync_pull`
- `sync_status`
- `sync_commit`
- `sync_push`
- `sync_rollback`
- `sync_push_file`

## Full Documentation

See [docs/README.md](./docs/README.md) for full documentation by features, flags, MCP tools, env variables and history modes.

## Project Skills

- `skills/elementor-data-only-editing/SKILL.md`
- `skills/wordpress-sync-workflow/SKILL.md`
- `skills/wordpress-sync-selective-push/SKILL.md`
- `skills/wordpress-sync-rollback/SKILL.md`
- `skills/wordpress-sync-auth-session/SKILL.md`

## Install Skills in Codex

```text
Fetch and follow instructions from https://raw.githubusercontent.com/InterFuseAgency/wordpress-sync/refs/heads/main/.codex/INSTALL.md
```

## Notes

- Files store full WordPress objects (`meta._elementor_data` included).
- Push compares local canonical Elementor hash vs remote hash and skips identical content.
- Every `pull` writes a full history baseline entry; next commits store only diffs for changed objects.
- Rollback is local-only; run `push` after rollback to apply remote changes.
- Components are synced as post type `elementor_library`.
