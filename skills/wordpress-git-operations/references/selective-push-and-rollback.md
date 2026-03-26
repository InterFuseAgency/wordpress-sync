# Selective Push and Rollback

## Selective Push

Push one file:

```bash
node dist/cli.js push-file wordpress/pages/home/3625.json
```

Dry run:

```bash
node dist/cli.js push-file wordpress/pages/home/3625.json --dry-run
```

Push by selector:

```bash
node dist/cli.js push --id 3625 --kind page
node dist/cli.js push --id 1200 --kind component
```

## Rollback

Rollback entire commit:

```bash
node dist/cli.js rollback <commitId>
```

Rollback one object:

```bash
node dist/cli.js rollback <commitId> --id 3625 --kind page
```

Rollback one file:

```bash
node dist/cli.js rollback <commitId> --file wordpress/pages/home/3625.json
```
