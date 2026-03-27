# Документація WordPress Sync

## Що Це

Це офіційний індекс документації для `@interfuse/wordpress-mcp`, CLI-інструмента для синхронізації контенту WordPress і Elementor у локальні JSON-файли з історією змін.

## Встановлення

Рекомендований швидкий старт (без глобального встановлення):

```bash
npx -y @interfuse/wordpress-mcp --help
npx -y @interfuse/wordpress-mcp init
```

Необхідні змінні оточення:

```bash
WP_URL=https://example.com
WP_APP_USER=wordpress_user
WP_APP_PASSWORD="password"
```

Повна інструкція зі встановлення та налаштування: [../README.uk.md](../README.uk.md).

## Список Документів

- [01-features.uk.md](./01-features.uk.md) - можливості та сценарії роботи
- [02-cli-flags.uk.md](./02-cli-flags.uk.md) - CLI команди та прапорці
- [04-env-vars.uk.md](./04-env-vars.uk.md) - змінні оточення
- [05-history-modes.uk.md](./05-history-modes.uk.md) - режими історії та формат diff
- [03-mcp-tools.uk.md](./03-mcp-tools.uk.md) - нотатка про міграцію після видалення MCP
- [../.codex/INSTALL.md](../.codex/INSTALL.md) - one-command встановлення Codex skills

English index: [README.md](./README.md)
