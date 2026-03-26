# CLI Прапорці

## Глобальні Прапорці

- `--root <path>` - корінь workspace (за замовчуванням: поточна директорія)
- `--provider <mode>` - `rest|mcp` (за замовчуванням: `rest`)
- `--history-mode <mode>` - `json-patch|full` (за замовчуванням: `json-patch` або `WP_SYNC_HISTORY_MODE`)

## `init`

Немає окремих прапорців для команди.

## `pull`

- `--all`
- `--id <id>`
- `--kind <kind>` (`page|component`)
- `--slug <slug>`
- `--history-mode <mode>` - override на рівні команди

## `status`

Немає окремих прапорців для команди.

## `commit`

- `-m, --message <message>` (обовʼязково)
- `--all`
- `--file <file>`
- `--history-mode <mode>` - override на рівні команди

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

## Пріоритет Режиму Історії

1. `--history-mode` на рівні команди
2. глобальний `--history-mode`
3. `WP_SYNC_HISTORY_MODE`
4. fallback: `json-patch`
