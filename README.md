# JustPlanner

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

**JustPlanner** — SaaS еженедельный планировщик задач с freemium-моделью монетизации.

🌐 **Прод**: [justplanner.ru](https://justplanner.ru) · **Dev**: [dev.justplanner.ru](https://dev.justplanner.ru)  
📊 **Март 2026**: 768 пользователей · 3032 задачи · 124 активных Pro · выручка 18 099₽

---

## Стек

| Слой | Технологии |
|------|-----------|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS (inline), Lucide React, Sentry |
| Backend | Node.js, Express 4, ES Modules (`"type": "module"`) |
| База данных | PostgreSQL (raw SQL, `pg` драйвер, без ORM) |
| Авторизация | JWT в cookie + Passport.js Google OAuth 2.0 |
| Платежи | YooKassa SDK (рекуррентные платежи) |
| Email маркетинг | Unisender API |
| Email транзакционный | Nodemailer (SMTP) |
| Уведомления | Telegram Bot API (long polling) |
| Деплой | PM2 + Nginx + GitHub Actions → VPS (5.35.94.142) |
| Аналитика | Yandex Metrika (106590123) |

---

## Быстрый старт

**Требования:** Node.js 20+, PostgreSQL

```bash
# Frontend (порт 3000)
npm install && npm run dev

# Backend (порт 3001) — в другом терминале
cd server && npm install && cp .env.example .env && npm run dev
```

Vite проксирует `/api` → `:3001` автоматически (`vite.config.ts`).

---

## Деплой

> ⚠️ **Только через git commit + push.** Никогда не деплоить напрямую через rsync/ssh.

```
git push origin main  →  GitHub Actions  →  rsync  →  npm build  →  pm2 restart
```

- **main** → `justplanner.ru` (PM2: `justplanner-api`, порт 3001)
- **dev** → `dev.justplanner.ru` (PM2: `justplanner-dev-api`, порт 3002, Basic Auth)

Ручной запуск: `Actions → Деплой на VPS → Run workflow`

---

## Структура проекта

```
justplanner/
├── App.tsx                  # Главный компонент (~1560 строк, монолит)
├── types.ts                 # Task, Subtask, Column, TaskColor, Recurrence
├── api.ts                   # tasksApi (getAll, create, update, delete, syncAll)
├── utils.ts                 # Даты, generateId(), праздники РФ
├── vite.config.ts           # proxy /api → :3001, port 3000
│
├── components/              # UI компоненты
│   ├── Column.tsx           # Колонка дня (час-слоты) или бэклога (list-view)
│   ├── TaskItem.tsx         # Карточка задачи (drag, touch, inline-edit)
│   ├── TaskModal.tsx        # Модалка задачи (заголовок, подзадачи с DnD, дата, время, рекуррентность)
│   ├── AuthModal.tsx        # Вход/регистрация (email + Google)
│   ├── SettingsModal.tsx    # Настройки (аккаунт, начало дня, бэклог, подписка)
│   ├── QuickAddInput.tsx    # Быстрое добавление задачи
│   ├── NotificationSurvey.tsx # Опрос уведомлений (отключён, для повторного использования)
│   ├── OnboardingOverlay.tsx  # Онбординг новых пользователей
│   ├── LandingPage.tsx      # Лендинг (/)
│   ├── FeaturesPage.tsx     # Возможности (/features)
│   ├── PricingPage.tsx      # Тарифы (/pricing)
│   └── Legal/               # Публичная оферта, Политика конфиденциальности
│
├── contexts/
│   ├── AuthContext.tsx      # JWT, Google OAuth, isAuthenticated, user, token
│   └── SettingsContext.tsx  # Настройки (startHour, sectionNames и др.)
│
├── billing/                 # Модуль биллинга (frontend)
│   ├── BillingContext.tsx   # subscription, isPremium, canAddTask
│   ├── api.ts               # subscribe, verify, cancel, bindCard, unbindCard
│   ├── types.ts             # SubscriptionStatus, Plan
│   └── components/          # SubscriptionStatus, UpgradePrompt, ProBadge
│
├── annual-offer/            # Годовой оффер (594₽/год, -50%)
│   ├── AnnualOfferModal.tsx # Модалка предложения
│   ├── AnnualOfferWidget.tsx # Виджет с таймером 24ч (правый нижний угол)
│   └── useCountdown.ts      # Хук обратного отсчёта
│
├── public/                  # Статика (favicon, logo, видео для лендинга)
│   └── back/index.html      # Админ-панель (standalone HTML, Basic Auth)
│
└── server/                  # Backend
    ├── index.js             # Express, CORS, OAuth, маршруты, cron-задачи
    ├── schema.sql           # Схема: users, tasks
    ├── config/db.js         # PostgreSQL pool (DATABASE_URL)
    ├── middleware/auth.js   # JWT middleware (authenticateToken)
    ├── models/              # User.js, Task.js (raw SQL)
    ├── routes/              # auth.js, tasks.js, settings.js, admin.js
    ├── billing/             # yookassa.js, routes.js, renewal.js, schema.sql
    ├── utils/               # email.js, telegram.js, unisender.js
    └── tests/               # smoke-test.js, daily-report.js, health-cron.js
```

---

## Документация

Полная документация, схема БД, история версий, переменные окружения:  
👉 [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)