# Auth and Env

## Required Variables

```bash
WP_URL=https://example.com
WP_APP_USER=admin
WP_APP_PASSWORD=secret
WP_AUTH_MODE=session
```

## Modes

- `session`: login, cookie, nonce flow
- `auto`: session first, fallback to basic
- `basic`: basic auth only

## Fast Debug Checks

1. Confirm `.env` exists in project root.
2. Validate credentials via `/wp-admin/` login.
3. Run:
```bash
npx -y @interfuse/wordpress-mcp pull --id 3625 --kind page
```

If you get 401/403:
- re-check credentials
- keep `WP_AUTH_MODE=session`
- retry command to refresh nonce/cookie
