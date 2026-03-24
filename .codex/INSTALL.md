# Installing WordPress Sync Skills for Codex

Enable this project's skills in Codex through native skill discovery using a git clone and symlink.

## Prerequisites

- Git

## Installation

1. Clone this repository to your Codex workspace:

```bash
git clone https://github.com/InterFuseAgency/wordpress-sync.git ~/.codex/wordpress-sync
```

2. Create a symlink from the repo `skills/` directory into `~/.agents/skills`:

```bash
mkdir -p ~/.agents/skills
ln -s ~/.codex/wordpress-sync/skills ~/.agents/skills/wordpress-sync
```

Windows (PowerShell):

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.agents\skills"
cmd /c mklink /J "$env:USERPROFILE\.agents\skills\wordpress-sync" "$env:USERPROFILE\.codex\wordpress-sync\skills"
```

3. Restart Codex (close and relaunch) so skills are discovered.

## Migrating from an older setup

If you used another bootstrap method before native discovery:

1. Update the local clone:

```bash
cd ~/.codex/wordpress-sync && git pull
```

2. Create the symlink from step 2 above.
3. Remove old bootstrap snippets from `~/.codex/AGENTS.md` if you have them.
4. Restart Codex.

## Verify

```bash
ls -la ~/.agents/skills/wordpress-sync
```

The result should be a symlink (or junction on Windows) pointing to `~/.codex/wordpress-sync/skills`.

## Updating

```bash
cd ~/.codex/wordpress-sync && git pull
```

Skills refresh through the symlink.

## Uninstalling

```bash
rm ~/.agents/skills/wordpress-sync
```

Optional cleanup:

```bash
rm -rf ~/.codex/wordpress-sync
```
