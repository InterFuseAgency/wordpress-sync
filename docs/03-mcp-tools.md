# MCP Tools

## `sync_setup`

Назначение: инициализировать workspace и сохранить WordPress доступы в `.env`.

Параметры:

- `wpUrl?: string`
- `wpAppUser?: string`
- `wpAppPassword?: string`
- `wpAuthMode?: "session" | "auto" | "basic"`

## `sync_list_pages`

Назначение: получить список страниц WordPress (theme pages) без `pull` в workspace.

Параметры:

- `search?: string`
- `limit?: number` (по умолчанию `200`, максимум `2000`)

## `sync_list_components`

Назначение: получить список Elementor компонентов/шаблонов без `pull` в workspace.

Параметры:

- `search?: string`
- `limit?: number` (по умолчанию `200`, максимум `2000`)

## `sync_pull`

Назначение: загрузка объектов WordPress в локальный workspace.

Параметры:

- `all?: boolean`
- `id?: number`
- `kind?: "page" | "component"`
- `slug?: string`
- `historyMode?: "json-patch" | "full"`

## `sync_status`

Назначение: вернуть локальный diff (`added`, `modified`, `deleted`).

Параметры: нет.

## `sync_commit`

Назначение: создать commit entry в локальной истории.

Параметры:

- `message: string`
- `all?: boolean`
- `file?: string`
- `historyMode?: "json-patch" | "full"`

## `sync_push`

Назначение: отправить изменения в WordPress только при отличиях.

Параметры:

- `all?: boolean`
- `file?: string`
- `id?: number`
- `kind?: "page" | "component"`
- `dryRun?: boolean`

## `sync_rollback`

Назначение: откатить workspace к выбранному commit state.

Параметры:

- `commitId: string`
- `file?: string`
- `id?: number`
- `kind?: "page" | "component"`

## `sync_push_file`

Назначение: точечный push одного файла.

Параметры:

- `file: string`
- `dryRun?: boolean`
