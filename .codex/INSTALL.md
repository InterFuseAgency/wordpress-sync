# Installing WordPress Sync Skills for Codex

Use the bundled installer for one-command setup.

## One-Command Install (recommended)

From local clone:

```bash
./install
```

From GitHub (for AI / remote prompt execution):

```bash
curl -fsSL https://raw.githubusercontent.com/InterFuseAgency/wordpress-sync/refs/heads/main/install | bash
```

This installer:
- clones or updates `~/.codex/wordpress-sync`
- creates/updates `~/.agents/skills/wordpress-sync` symlink
- keeps previous non-symlink directory as timestamped backup if needed

## Verify

```bash
ls -la ~/.agents/skills/wordpress-sync
```

It should point to:

```bash
~/.codex/wordpress-sync/skills
```

## Update Skills Later

Run the same installer again:

```bash
./install
```

Or remote form:

```bash
curl -fsSL https://raw.githubusercontent.com/InterFuseAgency/wordpress-sync/refs/heads/main/install | bash
```

## Notes

- Restart Codex after install/update so skill discovery refreshes.
- Windows users can run setup manually via symlink/junction as needed.
