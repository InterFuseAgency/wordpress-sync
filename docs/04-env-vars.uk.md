# Змінні Оточення

## Підключення до WordPress

- `WP_URL` - URL WordPress сайту
- `WP_APP_USER` - username
- `WP_APP_PASSWORD` - password / app password
- `WP_AUTH_MODE` - `session|auto|basic`
- `WP_COOKIE` - ручний cookie (опційно)
- `WP_NONCE` - ручний REST nonce (опційно)

## Sync Engine / CLI

- `WP_SYNC_HISTORY_MODE` - `json-patch|full`

## Поведінка `WP_SYNC_HISTORY_MODE`

- `json-patch` - зберігає стандартний JSON Patch diff (RFC 6902) для комітів
- `full` - зберігає повний обʼєкт у кожному коміті
- `pull` завжди записує full baseline незалежно від режиму
