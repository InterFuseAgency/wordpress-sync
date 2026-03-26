# Environment Variables

## WordPress Connection

- `WP_URL` - WordPress site URL
- `WP_APP_USER` - username
- `WP_APP_PASSWORD` - password / app password
- `WP_AUTH_MODE` - `session|auto|basic`
- `WP_COOKIE` - manual cookie (optional)
- `WP_NONCE` - manual REST nonce (optional)

## Sync Engine / CLI

- `WP_SYNC_HISTORY_MODE` - `json-patch|full`

## `WP_SYNC_HISTORY_MODE` Behavior

- `json-patch` - store standard JSON Patch diff (RFC 6902) for commits
- `full` - store full object in each commit
- `pull` always writes a full baseline regardless of mode
