# CLI Flags

## Глобальные флаги

- `--root <path>` — корень workspace (default: текущая директория)
- `--provider <mode>` — `rest|mcp` (default: `rest`)
- `--history-mode <mode>` — `json-patch|full` (default: `json-patch` или `WP_SYNC_HISTORY_MODE`)

## `init`

Флагов команды нет.

## `pull`

- `--all`
- `--id <id>`
- `--kind <kind>` (`page|component`)
- `--slug <slug>`
- `--history-mode <mode>` — override для этой команды

## `status`

Флагов команды нет.

## `commit`

- `-m, --message <message>` (required)
- `--all`
- `--file <file>`
- `--history-mode <mode>` — override для этой команды

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

## Приоритет history mode

1. command-level `--history-mode`
2. global `--history-mode`
3. `WP_SYNC_HISTORY_MODE`
4. fallback: `json-patch`
