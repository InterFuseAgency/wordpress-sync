# Workflow

## Standard Cycle

```bash
node dist/cli.js init
node dist/cli.js pull --all
node dist/cli.js status
node dist/cli.js commit -m "sync: update content" --all
node dist/cli.js push
```

## Object-Targeted Pull

By ID and kind:

```bash
node dist/cli.js pull --id 3625 --kind page
node dist/cli.js pull --id 1200 --kind component
```

By slug:

```bash
node dist/cli.js pull --slug home --kind page
```

## Important Rules

- Always run `status` before `commit` and `push`.
- Do not skip `commit` before production pushes.
- Use `--dry-run` on `push` or `push-file` in risky changes.
