# MCP Tools

## `sync_setup`

Purpose: initialize workspace and save WordPress credentials into `.env`.

Parameters:

- `wpUrl?: string`
- `wpAppUser?: string`
- `wpAppPassword?: string`
- `wpAuthMode?: "session" | "auto" | "basic"`

## `sync_list_pages`

Purpose: list WordPress pages (theme pages) without pulling into workspace.

Parameters:

- `search?: string`
- `limit?: number` (default `200`, max `2000`)

## `sync_list_components`

Purpose: list Elementor components/templates without pulling into workspace.

Parameters:

- `search?: string`
- `limit?: number` (default `200`, max `2000`)

## `sync_pull`

Purpose: pull WordPress objects into local workspace.

Parameters:

- `all?: boolean`
- `id?: number`
- `kind?: "page" | "component"`
- `slug?: string`
- `historyMode?: "json-patch" | "full"`

## `sync_status`

Purpose: return local diff (`added`, `modified`, `deleted`).

Parameters: none.

## `sync_commit`

Purpose: create a commit entry in local history.

Parameters:

- `message: string`
- `all?: boolean`
- `file?: string`
- `historyMode?: "json-patch" | "full"`

## `sync_push`

Purpose: push changes to WordPress only when content differs.

Parameters:

- `all?: boolean`
- `file?: string`
- `id?: number`
- `kind?: "page" | "component"`
- `dryRun?: boolean`

## `sync_rollback`

Purpose: rollback workspace to selected commit state.

Parameters:

- `commitId: string`
- `file?: string`
- `id?: number`
- `kind?: "page" | "component"`

## `sync_push_file`

Purpose: targeted push for a single file.

Parameters:

- `file: string`
- `dryRun?: boolean`
