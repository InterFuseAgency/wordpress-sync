# Git Safety

## Expected Tracked State

Keep under version control:

- `wordpress/git.json`
- `wordpress/pages/**/*.json`
- `wordpress/components/**/*.json`

## Safe Sequence

1. Pull current objects.
2. Edit local JSON.
3. Check `status`.
4. Save local sync history via `commit`.
5. Push with `dry-run` if needed.
6. Push without `dry-run` when verified.

## Anti-Patterns

- Pushing without checking `status`.
- Manual edits in both `content.rendered` and `meta._elementor_data`.
- Running random global Git rewrites in sync folders.
