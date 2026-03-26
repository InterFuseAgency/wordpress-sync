# Elementor Editing

## Mandatory Rule

Edit only `meta._elementor_data` for Elementor layout/content changes.

Do not edit:
- `content.raw`
- `content.rendered`

## Safe Edit Flow

1. Pull object locally.
2. Open `wordpress/pages/<slug>/<id>.json` or `wordpress/components/<slug>/<id>.json`.
3. Parse `meta._elementor_data` as JSON.
4. Apply minimal required changes.
5. Serialize valid JSON back to `meta._elementor_data`.
6. Run `status`, `commit`, then `push`.
