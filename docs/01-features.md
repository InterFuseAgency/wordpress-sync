# Features

## 1. Workspace Initialization

The `init` command creates this structure:

- `wordpress/git.json`
- `wordpress/pages/`
- `wordpress/components/`
- `wordpress/.history/`

## 2. Pull Content from WordPress

The `pull` command downloads pages/components and saves them locally as JSON.

Selectors:

- `--all` - all pages and components
- `--id <id> --kind <page|component>` - a specific object
- `--slug <slug> [--kind ...]` - object by slug

History behavior:

- each `pull` always writes a `full` baseline entry
- that baseline is used for subsequent diff commits

## 3. Change Status

The `status` command shows:

- `added` - exists locally but not in `git.json`
- `modified` - content hash differs from tracked state
- `deleted` - present in `git.json` but missing locally

## 4. Commit Local History

The `commit` command writes local changes to `.history/<commitId>/entry.json`.

Modes:

- `json-patch` (default): stores RFC 6902 JSON Patch diff
- `full`: stores the full object in the commit

## 5. Push to WordPress

The `push` command sends updates only when local content differs from remote.

Logic:

- compares local and remote canonical hash
- if equal: object is reported in `skipped`
- if different: update is sent and reported in `updated`

## 6. Rollback

`rollback <commitId>` restores workspace state for that commit:

- full workspace rollback
- targeted rollback by `--file`
- targeted rollback by `--id --kind`

Legacy snapshot commits are supported.

## 7. Push a Single File

`push-file <path>` is a shortcut for targeted push of one JSON file.

## 8. CLI-Only Mode

Starting from this version, the package is CLI-only. MCP server/provider mode has been removed.
