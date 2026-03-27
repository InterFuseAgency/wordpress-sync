# Workflow

## Standard Cycle

```bash
npx -y @interfuse/wordpress-mcp init
npx -y @interfuse/wordpress-mcp pull --all
npx -y @interfuse/wordpress-mcp status
npx -y @interfuse/wordpress-mcp commit -m "sync: update content" --all
npx -y @interfuse/wordpress-mcp push
```

## Object-Targeted Pull

By ID and kind:

```bash
npx -y @interfuse/wordpress-mcp pull --id 3625 --kind page
npx -y @interfuse/wordpress-mcp pull --id 1200 --kind component
```

By slug:

```bash
npx -y @interfuse/wordpress-mcp pull --slug home --kind page
```

## Important Rules

- Always run `status` before `commit` and `push`.
- Do not skip `commit` before production pushes.
- Use `--dry-run` on `push` or `push-file` in risky changes.
