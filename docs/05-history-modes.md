# History Modes and Diff Format

## Формат истории

Каждый commit хранится в:

- `wordpress/.history/<commitId>/entry.json`

Поля commit entry:

- `id`
- `message`
- `createdAt`
- `changedObjects`
- `mode` (`full|diff`)
- `changes[]`

## `json-patch` (default)

Для обычных `commit` используется `mode: "diff"` и стандарт JSON Patch (RFC6902):

- `add`
- `replace`
- `remove`

Пример change:

```json
{
  "key": "page:10",
  "mode": "diff",
  "format": "json-patch",
  "patch": [
    { "op": "replace", "path": "/meta/_elementor_data/0/id", "value": "999" }
  ]
}
```

## `full`

Для обычных `commit` используется `mode: "full"` и хранится полный объект.

## Pull baseline

`pull` всегда создаёт baseline (`mode: "full"`), чтобы diff-коммиты имели корректную базу.

## Rollback

Rollback восстанавливает состояние через replay коммитов.

Поддержка legacy:

- старые snapshot-коммиты продолжают работать
- legacy custom diff (`set/remove` с массивом пути) тоже читается
