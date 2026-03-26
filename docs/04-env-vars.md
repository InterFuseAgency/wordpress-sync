# Environment Variables

## WordPress connection

- `WP_URL` — URL WordPress сайта
- `WP_APP_USER` — username
- `WP_APP_PASSWORD` — password / app password
- `WP_AUTH_MODE` — `session|auto|basic`
- `WP_COOKIE` — ручной cookie (optional)
- `WP_NONCE` — ручной REST nonce (optional)

## Sync engine / CLI / MCP

- `WP_SYNC_ROOT` — root workspace для MCP процесса
- `WP_SYNC_PROVIDER` — `rest|mcp`
- `WP_SYNC_HISTORY_MODE` — `json-patch|full`

## MCP provider bridge (когда `WP_SYNC_PROVIDER=mcp`)

- `ELEMENTOR_MCP_COMMAND` — команда запуска MCP клиента (default: `npx`)
- `ELEMENTOR_MCP_ARGS` — аргументы команды (default: `-y elementor-mcp`)

## Поведение `WP_SYNC_HISTORY_MODE`

- `json-patch` — хранение standard JSON Patch diff (RFC6902) для commit
- `full` — хранение полного объекта в каждом commit
- `pull` всегда пишет full baseline независимо от режима
