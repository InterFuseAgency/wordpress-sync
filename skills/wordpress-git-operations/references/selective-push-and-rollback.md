# Selective Push and Rollback

## Selective Push

Push one file:

```bash
npx -y @interfuse/wordpress-mcp push-file wordpress/pages/home/3625.json
```

Dry run:

```bash
npx -y @interfuse/wordpress-mcp push-file wordpress/pages/home/3625.json --dry-run
```

Push by selector:

```bash
npx -y @interfuse/wordpress-mcp push --id 3625 --kind page
npx -y @interfuse/wordpress-mcp push --id 1200 --kind component
```

## Rollback

Rollback entire commit:

```bash
npx -y @interfuse/wordpress-mcp rollback <commitId>
```

Rollback one object:

```bash
npx -y @interfuse/wordpress-mcp rollback <commitId> --id 3625 --kind page
```

Rollback one file:

```bash
npx -y @interfuse/wordpress-mcp rollback <commitId> --file wordpress/pages/home/3625.json
```
