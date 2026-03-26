# WordPress MCP Documentation

Полная документация по возможностям, флагам и переменным окружения.

## Разделы

- [01-features.md](./01-features.md) — все фичи и сценарии работы
- [02-cli-flags.md](./02-cli-flags.md) — все CLI команды и флаги
- [03-mcp-tools.md](./03-mcp-tools.md) — MCP инструменты и параметры
- [04-env-vars.md](./04-env-vars.md) — все переменные окружения
- [05-history-modes.md](./05-history-modes.md) — форматы истории и diff-режимы

## Быстрый старт

1. Настройте `WP_URL`, `WP_APP_USER`, `WP_APP_PASSWORD`.
2. Выполните `init`, затем `pull --all`.
3. Редактируйте JSON, проверяйте `status`, фиксируйте `commit`, отправляйте `push`.
4. При необходимости используйте `rollback <commitId>`.
