# MCP Інструменти

## `sync_setup`

Призначення: ініціалізувати workspace і зберегти доступи до WordPress у `.env`.

Параметри:

- `wpUrl?: string`
- `wpAppUser?: string`
- `wpAppPassword?: string`
- `wpAuthMode?: "session" | "auto" | "basic"`

## `sync_list_pages`

Призначення: отримати список сторінок WordPress (theme pages) без pull у workspace.

Параметри:

- `search?: string`
- `limit?: number` (за замовчуванням `200`, максимум `2000`)

## `sync_list_components`

Призначення: отримати список компонентів/шаблонів Elementor без pull у workspace.

Параметри:

- `search?: string`
- `limit?: number` (за замовчуванням `200`, максимум `2000`)

## `sync_pull`

Призначення: завантажити обʼєкти WordPress у локальний workspace.

Параметри:

- `all?: boolean`
- `id?: number`
- `kind?: "page" | "component"`
- `slug?: string`
- `historyMode?: "json-patch" | "full"`

## `sync_status`

Призначення: повернути локальний diff (`added`, `modified`, `deleted`).

Параметри: немає.

## `sync_commit`

Призначення: створити commit entry у локальній історії.

Параметри:

- `message: string`
- `all?: boolean`
- `file?: string`
- `historyMode?: "json-patch" | "full"`

## `sync_push`

Призначення: відправити зміни у WordPress лише за наявності відмінностей.

Параметри:

- `all?: boolean`
- `file?: string`
- `id?: number`
- `kind?: "page" | "component"`
- `dryRun?: boolean`

## `sync_rollback`

Призначення: відкотити workspace до стану вибраного коміту.

Параметри:

- `commitId: string`
- `file?: string`
- `id?: number`
- `kind?: "page" | "component"`

## `sync_push_file`

Призначення: точковий push одного файлу.

Параметри:

- `file: string`
- `dryRun?: boolean`
