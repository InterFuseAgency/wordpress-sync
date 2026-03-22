---
name: wordpress-sync-rollback
description: Use when reverting local WordPress sync files to a previous commit snapshot and optionally reapplying that state to WordPress.
---

# WordPress Sync Rollback

## Overview
Rollback restores local files from `wordpress/.history/<commitId>/...`.
It does not update remote WordPress until a separate push is executed.

## Find State
```bash
node dist/cli.js --provider rest status
cat wordpress/git.json
```

## Rollback Entire Commit
```bash
node dist/cli.js --provider rest rollback <commitId>
```

## Rollback Single Object
By id/kind:
```bash
node dist/cli.js --provider rest rollback <commitId> --id 3625 --kind page
```

By file:
```bash
node dist/cli.js --provider rest rollback <commitId> --file wordpress/pages/home/3625.json
```

## Apply Rolled Back State to WordPress
```bash
node dist/cli.js --provider rest push --id 3625 --kind page
```
or full changed set:
```bash
node dist/cli.js --provider rest push
```

