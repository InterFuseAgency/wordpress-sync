---
name: wordpress-sync-auth-session
description: Use when WordPress REST requests fail with 401/403 in edit context and this tool needs cookie plus nonce session authentication.
---

# WordPress Session Auth Troubleshooting

## Overview
This tool supports session auth flow:
1. Login through `/wp-login.php`
2. Capture `wordpress_logged_in_*` cookie
3. Open `wp-admin` and extract REST nonce
4. Use `Cookie + X-WP-Nonce` for REST requests

## Preferred Setup
```bash
WP_URL=https://example.com
WP_APP_USER=admin
WP_APP_PASSWORD=secret
WP_AUTH_MODE=session
```

## Modes
- `session`: force login/cookie/nonce flow (default with user/password).
- `auto`: session first, fallback to Basic Auth.
- `basic`: force Basic Auth only.

## Fast Checks
1. Confirm credentials can log into `/wp-admin/`.
2. Run pull:
```bash
node dist/cli.js --provider rest pull --id 3625 --kind page
```
3. If nonce expires, rerun the command; provider refreshes session on 401 nonce errors.

## Manual Override (Rare)
Use only if login flow is blocked by custom auth plugins:
```bash
WP_COOKIE='wordpress_logged_in_...=...'
WP_NONCE='abc123'
```

