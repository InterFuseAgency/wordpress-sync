# WordPress Sync (TypeScript CLI)

NPM пакет (історична назва): `@interfuse/wordpress-mcp`  
[Сторінка в NPM](https://www.npmjs.com/package/@interfuse/wordpress-mcp)

## Що Це

`wordpress-sync` це CLI-інструмент для синхронізації контенту WordPress і Elementor у локальні JSON-файли з Git-подібним workflow.

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
wordpress-sync --help
```

### Варіант 3: локальна розробка з цього репозиторію

```bash
npm install
npm run build
node dist/cli.js --help
```

### Авто-встановлення Codex Skills (для AI промптів)

З локального клону:

```bash
./install
```

З GitHub:

```bash
curl -fsSL https://raw.githubusercontent.com/InterFuseAgency/wordpress-sync/refs/heads/main/install | bash
```

Після встановлення перезапустіть Codex.

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
- [Environment Variables](./docs/04-env-vars.md)
- [History Modes and Diff Format](./docs/05-history-modes.md)
- [MCP Migration Note](./docs/03-mcp-tools.md)
- [Codex Skill Install Guide](./.codex/INSTALL.md)

### Український Переклад

- [Українська версія README](./README.uk.md)
- [Індекс документації (UKR)](./docs/README.uk.md)
- [Можливості (UKR)](./docs/01-features.uk.md)
- [CLI команди та прапорці (UKR)](./docs/02-cli-flags.uk.md)
- [Змінні оточення (UKR)](./docs/04-env-vars.uk.md)
- [Режими історії та формат diff (UKR)](./docs/05-history-modes.uk.md)
- [Нотатка щодо міграції з MCP (UKR)](./docs/03-mcp-tools.uk.md)
