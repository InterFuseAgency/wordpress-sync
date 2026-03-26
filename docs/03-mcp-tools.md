# MCP Tools (Removed)

MCP mode is no longer supported in this project.

If you used `sync_*` MCP tools before, switch to CLI commands:

- `sync_setup` -> `wordpress-sync init`
- `sync_list_pages` -> `wordpress-sync pull --all` then inspect `wordpress/pages/`
- `sync_list_components` -> `wordpress-sync pull --all` then inspect `wordpress/components/`
- `sync_pull` -> `wordpress-sync pull ...`
- `sync_status` -> `wordpress-sync status`
- `sync_commit` -> `wordpress-sync commit -m "..." --all`
- `sync_push` -> `wordpress-sync push ...`
- `sync_rollback` -> `wordpress-sync rollback <commitId> ...`
- `sync_push_file` -> `wordpress-sync push-file <file> [--dry-run]`

Legacy `--provider mcp` now returns an explicit error.
