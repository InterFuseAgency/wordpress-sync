# CLI Flags

## Global Flags

- `--root <path>` - workspace root (default: current directory)
- `--provider <mode>` - `rest|mcp` (default: `rest`)
- `--history-mode <mode>` - `json-patch|full` (default: `json-patch` or `WP_SYNC_HISTORY_MODE`)

## `init`

No command-specific flags.

## `pull`

- `--all`
- `--id <id>`
- `--kind <kind>` (`page|component`)
- `--slug <slug>`
- `--history-mode <mode>` - command-level override

## `status`

No command-specific flags.

## `commit`

- `-m, --message <message>` (required)
- `--all`
- `--file <file>`
- `--history-mode <mode>` - command-level override

## `push`

- `--all`
- `--file <file>`
- `--id <id>`
- `--kind <kind>` (`page|component`)
- `--dry-run`

## `rollback <commitId>`

- `--file <file>`
- `--id <id>`
- `--kind <kind>` (`page|component`)

## `push-file <file>`

- `--dry-run`

## History Mode Priority

1. command-level `--history-mode`
2. global `--history-mode`
3. `WP_SYNC_HISTORY_MODE`
4. fallback: `json-patch`
