# Режими Історії та Формат Diff

## Формат Історії

Кожен коміт зберігається в:

- `wordpress/.history/<commitId>/entry.json`

Поля commit entry:

- `id`
- `message`
- `createdAt`
- `changedObjects`
- `mode` (`full|diff`)
- `changes[]`

## `json-patch` (за замовчуванням)

Звичайні операції `commit` використовують `mode: "diff"` і стандарт JSON Patch (RFC 6902):

- `add`
- `replace`
- `remove`

Приклад зміни:

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

Звичайні операції `commit` використовують `mode: "full"` і зберігають повний обʼєкт.

## Pull Baseline

`pull` завжди створює baseline (`mode: "full"`), щоб diff-коміти мали коректну базу.

## Rollback

Rollback відновлює стан через replay комітів.

Підтримка legacy:

- старі snapshot-коміти продовжують працювати
- legacy custom diff формат (`set/remove` з масивом шляху) також підтримується
