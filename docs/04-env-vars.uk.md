# Змінні Оточення

## Підключення до WordPress

- `WP_URL` - URL WordPress сайту
- `WP_APP_USER` - username
- `WP_APP_PASSWORD` - password / app password
- `WP_AUTH_MODE` - `session|auto|basic`
- `WP_COOKIE` - ручний cookie (опційно)
- `WP_NONCE` - ручний REST nonce (опційно)

## Sync Engine / CLI / MCP

- `WP_SYNC_ROOT` - корінь workspace для MCP процесу
- `WP_SYNC_PROVIDER` - `rest|mcp`
- `WP_SYNC_HISTORY_MODE` - `json-patch|full`

## MCP Provider Bridge (коли `WP_SYNC_PROVIDER=mcp`)

- `ELEMENTOR_MCP_COMMAND` - команда запуску MCP клієнта (за замовчуванням: `npx`)
- `ELEMENTOR_MCP_ARGS` - аргументи команди (за замовчуванням: `-y elementor-mcp`)

## Поведінка `WP_SYNC_HISTORY_MODE`

- `json-patch` - зберігає стандартний JSON Patch diff (RFC 6902) для комітів
- `full` - зберігає повний обʼєкт у кожному коміті
- `pull` завжди записує full baseline незалежно від режиму
