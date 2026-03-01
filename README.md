# JustPlanner

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

**JustPlanner** — современный еженедельный планировщик задач с моделью подписки (freemium).

🌐 **Сайт**: [justplanner.ru](https://justplanner.ru)

---

## Стек

| Слой | Технологии |
|------|-----------|
| Frontend | React 19, TypeScript, Vite, Lucide React, Sentry |
| Backend | Node.js, Express, ES Modules |
| База данных | PostgreSQL |
| Авторизация | JWT + Google OAuth 2.0 |
| Платежи | YooKassa |
| Email маркетинг | Unisender |
| Деплой | PM2 + Nginx + GitHub Actions → VPS |

---

## Запуск локально

**Требования:** Node.js 20+, PostgreSQL

### Frontend
```bash
npm install
npm run dev
# http://localhost:3000
```

### Backend
```bash
cd server
npm install
cp .env.example .env   # заполнить переменные
npm run dev
# http://localhost:3001
```

Vite проксирует `/api` → `:3001` автоматически.

---

## Деплой

Деплой происходит автоматически при push в ветку `main` через GitHub Actions:

```
push → rsync на VPS → npm install → npm run build → pm2 restart
```

Ручной запуск: `Actions → Деплой на VPS → Run workflow`

---

## Структура

```
justplanner/
├── App.tsx                  # Главный компонент (~1500 строк)
├── components/              # UI компоненты
├── contexts/                # AuthContext, SettingsContext
├── billing/                 # Биллинг (frontend)
├── annual-offer/            # Модуль годовой скидки
└── server/                  # Backend (Express + PostgreSQL)
    ├── routes/              # auth, tasks, settings, admin
    ├── billing/             # YooKassa, автопродление
    ├── utils/               # email, telegram, unisender
    └── tests/               # smoke-тесты, daily-report
```

Подробная документация: [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)