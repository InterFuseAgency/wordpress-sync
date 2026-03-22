---
name: elementor-data-only-editing
description: Use when modifying WordPress/Elementor JSON files in this sync tool and deciding what should be edited before commit and push.
---

# Elementor Data Only Editing

## Overview
For this tool, the source of truth for Elementor layout/content is `meta._elementor_data`.
Fields inside `content` are derived output and should not be used for editor changes.

## Mandatory Rule
- Edit only `meta._elementor_data`.
- Do not edit `content.raw`.
- Do not edit `content.rendered`.

## Correct vs Wrong Target
Wrong target:

```json
{
  "content": {
    "raw": "",
    "rendered": "<div data-elementor-id=\"3625\">...</div>"
  }
}
```

Correct target:

```json
{
  "meta": {
    "_elementor_edit_mode": "builder",
    "_elementor_template_type": "wp-page",
    "_elementor_data": "[{\"id\":\"8ec95ec\",\"elType\":\"container\"}]"
  }
}
```

## Safe Editing Flow
1. Run `pull` for the page/component.
2. Open `wordpress/pages/<slug>/<id>.json` or `wordpress/components/<slug>/<id>.json`.
3. Parse `meta._elementor_data` as JSON.
4. Apply changes inside parsed Elementor structure.
5. Write back valid JSON to `meta._elementor_data`.
6. Run `status`, `commit`, and `push`.

## Validation
- `meta._elementor_data` is valid JSON.
- `content.raw` and `content.rendered` stayed unchanged.
- `push` updates WordPress only when hash changed.
