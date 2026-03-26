# History Modes and Diff Format

## History Format

Each commit is stored in:

- `wordpress/.history/<commitId>/entry.json`

Commit entry fields:

- `id`
- `message`
- `createdAt`
- `changedObjects`
- `mode` (`full|diff`)
- `changes[]`

## `json-patch` (default)

Regular `commit` operations use `mode: "diff"` and standard JSON Patch (RFC 6902):

- `add`
- `replace`
- `remove`

Example change:

```json
{
  "key": "page:10",
  "mode": "diff",
  "format": "json-patch",
  "patch": [
    { "op": "replace", "path": "/meta/_elementor_data/0/id", "value": "999" }
  ]
}
```

## `full`

Regular `commit` operations use `mode: "full"` and store the full object.

## Pull Baseline

`pull` always creates a baseline (`mode: "full"`) so diff commits have a correct base.

## Rollback

Rollback restores state by replaying commits.

Legacy support:

- old snapshot commits continue to work
- legacy custom diff format (`set/remove` with array path) is also supported
