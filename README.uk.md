# WordPress Sync (TypeScript CLI + MCP)

NPM пакет: `@interfuse/wordpress-mcp`  
[Сторінка в NPM](https://www.npmjs.com/package/@interfuse/wordpress-mcp)

## Що Це

`wordpress-mcp` це CLI + MCP інструмент для синхронізації контенту WordPress і Elementor у локальні JSON-файли з Git-подібним workflow.

Інструмент підходить для командної роботи, code review і передбачуваних контент-деплоїв:

- завантаження контенту з WordPress у локальні файли
- перегляд локальних змін через `status`
- збереження локальної історії через `commit`
- точковий push вибраних обʼєктів або файлів назад у WordPress
- rollback локального стану до будь-якого збереженого коміту

## Встановлення

### Варіант 1: запуск із npm без глобального встановлення (рекомендовано)

```bash
npx -y @interfuse/wordpress-mcp --help
npx -y @interfuse/wordpress-mcp init
```

### Варіант 2: глобальне встановлення

```bash
npm i -g @interfuse/wordpress-mcp
wordpress-mcp --help
wordpress-mcp mcp
```

### Варіант 3: локальна розробка з цього репозиторію

```bash
npm install
npm run build
```

### Мінімальні змінні оточення

```bash
WP_URL=https://example.com
WP_APP_USER=wordpress_user
WP_APP_PASSWORD="password"
WP_AUTH_MODE=session
```

## Документація

### English

- [Documentation Index](./docs/README.md)
- [Features](./docs/01-features.md)
- [CLI Commands and Flags](./docs/02-cli-flags.md)
- [MCP Tools](./docs/03-mcp-tools.md)
- [Environment Variables](./docs/04-env-vars.md)
- [History Modes and Diff Format](./docs/05-history-modes.md)

### Український Переклад

- [Українська версія README](./README.uk.md)
- [Індекс документації (UKR)](./docs/README.uk.md)
- [Можливості (UKR)](./docs/01-features.uk.md)
- [CLI команди та прапорці (UKR)](./docs/02-cli-flags.uk.md)
- [MCP інструменти (UKR)](./docs/03-mcp-tools.uk.md)
- [Змінні оточення (UKR)](./docs/04-env-vars.uk.md)
- [Режими історії та формат diff (UKR)](./docs/05-history-modes.uk.md)
