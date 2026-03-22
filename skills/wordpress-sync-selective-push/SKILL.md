---
name: wordpress-sync-selective-push
description: Use when pushing only specific WordPress objects from local JSON files instead of running a full push.
---

# WordPress Selective Push

## Overview
Use selective push when only one page/component should be sent to WordPress.
This avoids uploading unrelated local changes.

## By File Path
```bash
node dist/cli.js --provider rest push-file wordpress/pages/home/3625.json
```

Dry run:
```bash
node dist/cli.js --provider rest push-file wordpress/pages/home/3625.json --dry-run
```

## By Object Selector
```bash
node dist/cli.js --provider rest push --id 3625 --kind page
```

For components:
```bash
node dist/cli.js --provider rest push --id 1200 --kind component
```

## Verification
- Run `status` before push.
- If local and remote canonical hashes are equal, object is skipped automatically.
- Use `--dry-run` for preview in production workflows.

