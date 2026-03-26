# Можливості

## 1. Ініціалізація Workspace

Команда `init` створює таку структуру:

- `wordpress/git.json`
- `wordpress/pages/`
- `wordpress/components/`
- `wordpress/.history/`

## 2. Pull Контенту з WordPress

Команда `pull` завантажує сторінки/компоненти та зберігає їх локально у JSON.

Селектори:

- `--all` - усі сторінки та компоненти
- `--id <id> --kind <page|component>` - конкретний обʼєкт
- `--slug <slug> [--kind ...]` - обʼєкт за slug

Поведінка історії:

- кожен `pull` завжди записує baseline у форматі `full`
- цей baseline використовується для наступних diff-комітів

## 3. Статус Змін

Команда `status` показує:

- `added` - є локально, але відсутній у `git.json`
- `modified` - hash контенту відрізняється від tracked-стану
- `deleted` - є в `git.json`, але відсутній локально

## 4. Commit Локальної Історії

Команда `commit` записує локальні зміни в `.history/<commitId>/entry.json`.

Режими:

- `json-patch` (за замовчуванням): зберігає JSON Patch diff (RFC 6902)
- `full`: зберігає повний обʼєкт у коміті

## 5. Push у WordPress

Команда `push` відправляє зміни лише коли локальний контент відрізняється від remote.

Логіка:

- порівнює canonical hash локального і віддаленого контенту
- якщо однакові: обʼєкт потрапляє в `skipped`
- якщо різні: update відправляється, обʼєкт потрапляє в `updated`

## 6. Rollback

`rollback <commitId>` відновлює стан workspace на момент коміту:

- повний rollback workspace
- точковий rollback через `--file`
- точковий rollback через `--id --kind`

Підтримуються legacy snapshot-коміти.

## 7. Push Одного Файлу

`push-file <path>` це shortcut для точкового push одного JSON-файлу.

## 8. Режим Тільки CLI

Починаючи з цієї версії, пакет працює тільки як CLI. MCP server/provider режим видалено.
