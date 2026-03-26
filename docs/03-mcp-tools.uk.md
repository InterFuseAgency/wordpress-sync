# MCP Інструменти (Видалено)

MCP-режим більше не підтримується в цьому проєкті.

Якщо раніше ви використовували `sync_*` MCP-інструменти, переходьте на CLI-команди:

- `sync_setup` -> `wordpress-sync init`
- `sync_list_pages` -> `wordpress-sync pull --all`, потім перегляд `wordpress/pages/`
- `sync_list_components` -> `wordpress-sync pull --all`, потім перегляд `wordpress/components/`
- `sync_pull` -> `wordpress-sync pull ...`
- `sync_status` -> `wordpress-sync status`
- `sync_commit` -> `wordpress-sync commit -m "..." --all`
- `sync_push` -> `wordpress-sync push ...`
- `sync_rollback` -> `wordpress-sync rollback <commitId> ...`
- `sync_push_file` -> `wordpress-sync push-file <file> [--dry-run]`

Legacy `--provider mcp` тепер повертає явну помилку.
