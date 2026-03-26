# Features

## 1. Инициализация workspace

Команда `init` создаёт структуру:

- `wordpress/git.json`
- `wordpress/pages/`
- `wordpress/components/`
- `wordpress/.history/`

## 2. Pull контента из WordPress

Команда `pull` загружает страницы/компоненты и сохраняет их локально как JSON.

Селекторы:

- `--all` — все pages + components
- `--id <id> --kind <page|component>` — конкретный объект
- `--slug <slug> [--kind ...]` — объект по slug

Поведение истории:

- каждый `pull` всегда пишет `full` baseline в историю
- baseline используется как база для следующих `diff`-коммитов

## 3. Статус изменений

Команда `status` показывает:

- `added` — есть локально, нет в `git.json`
- `modified` — хэш отличается от tracked-состояния
- `deleted` — есть в `git.json`, но удалён локально

## 4. Commit локальной истории

Команда `commit` фиксирует локальные изменения в `.history/<commitId>/entry.json`.

Режимы:

- `json-patch` (по умолчанию): сохраняется стандартный JSON Patch diff (RFC 6902)
- `full`: сохраняется полный объект в коммите

## 5. Push в WordPress

Команда `push` отправляет изменения только когда контент реально отличается от remote.

Логика:

- сравнение локального и удалённого canonical hash
- если одинаково: объект попадает в `skipped`
- если отличается: отправка update и попадание в `updated`

## 6. Rollback

Команда `rollback <commitId>` восстанавливает состояние на момент коммита:

- полный rollback workspace
- или точечный rollback по `--file`
- или точечный rollback по `--id --kind`

Поддерживается совместимость со старыми snapshot-коммитами.

## 7. Push одного файла

Команда `push-file <path>` — shortcut для точечного `push` по одному JSON.

## 8. MCP сервер

Режим `mcp` поднимает MCP сервер и предоставляет инструменты:

- `sync_setup`
- `sync_list_pages`
- `sync_list_components`
- `sync_pull`
- `sync_status`
- `sync_commit`
- `sync_push`
- `sync_rollback`
- `sync_push_file`
