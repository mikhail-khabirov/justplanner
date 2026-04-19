# JustPlanner — обзор проекта

## Что это

SaaS-планировщик задач на неделю с фримиум-моделью. Фронт — React 19 + TypeScript + Vite. Бэк — Node.js + Express + PostgreSQL. Production: https://justplanner.ru.

## Стек

| Слой | Технология |
|---|---|
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS (через CDN) |
| Backend | Node.js 20, Express 4 (ES Modules), pg (без ORM) |
| База данных | PostgreSQL 14 |
| Auth | JWT в cookies + Passport.js Google OAuth |
| Платежи | YooKassa (рекуррентные подписки) |
| Email | Nodemailer (SMTP) |
| Telegram | User bot (длинный polling) для напоминаний о задачах |
| Деплой | PM2 + Nginx + Let's Encrypt + GitHub Actions |
| Иконки | lucide-react |
| Drag & Drop | mobile-drag-drop |

## Production-окружение

| | Значение |
|---|---|
| Домен | justplanner.ru |
| Сервер | 72.56.35.143 (Ubuntu 24.04, Москва) |
| Backend | http://localhost:3001 (PM2 процесс `justplanner-api`) |
| Web | Nginx → /var/www/justplanner/dist (frontend) + proxy /api → :3001 |
| База | PostgreSQL 14, БД `justplanner`, юзер `justplanner_user` |
| SSL | Let's Encrypt, авто-обновление через certbot.timer |

---

# 📁 Структура репозитория

## Корень

```
justplanner/
├── .github/workflows/      # GitHub Actions: автодеплой при push в main
│   └── deploy.yml
├── .agents/                # Внутренние workflows для AI-помощников
├── annual-offer/           # Модуль 24-часовой скидки 50% после регистрации
├── billing/                # Frontend-модуль работы с подписками (UI + API клиент)
├── components/             # React-компоненты UI
├── contexts/               # React Context Providers
├── public/                 # Статические файлы (копируются в dist при сборке)
│   ├── back/index.html     # Админ-панель (отдельная HTML, без React)
│   ├── tailwindcss.js      # Tailwind CDN (вместо PostCSS-сборки)
│   └── *.mp4               # Видео для Hero-секции лендинга
├── server/                 # Backend на Node.js
├── App.tsx                 # Корневой React-компонент (~1900 строк, состояние, роутинг)
├── api.ts                  # Frontend HTTP-клиент к /api/tasks и /api/settings
├── index.tsx               # Точка входа React (createRoot, провайдеры)
├── index.html              # HTML-шаблон, Yandex Metrika, шрифты
├── types.ts                # TypeScript-типы Task, Subtask, etc.
├── utils.ts                # safeLocalStorage и прочие утилиты
├── package.json            # Frontend-зависимости
├── vite.config.ts          # Vite (порт 3000, прокси /api → :3001)
├── tsconfig.json           # TypeScript config
├── ecosystem.config.js     # PM2 конфигурация (имя процесса, max_memory, cwd)
├── deploy.sh               # Ручной деплой через rsync (запасной вариант)
├── nginx.conf.example      # Образец nginx-конфигурации
├── OWNER_GUIDE.md          # Инструкция администратора production-сервера
└── PROJECT_OVERVIEW.md     # Этот файл
```

## Frontend — компоненты

### `components/` — UI-блоки

| Файл | Назначение |
|---|---|
| `LandingPage.tsx` | Лендинг для гостей. Hero, фичи, бургер-меню для мобилок |
| `FeaturesPage.tsx` | Страница `/features` — детальный обзор всех функций |
| `PricingPage.tsx` | Страница `/pricing` — тарифы (Free / Trial 1₽ / Annual 2870₽) |
| `Column.tsx` | Колонка одного дня в недельном виде или Backlog |
| `TaskItem.tsx` | Карточка задачи с drag-and-drop, чекбоксом, цветом |
| `TaskModal.tsx` | Полный редактор задачи (заголовок, время, цвет, повторы, напоминания, подзадачи) |
| `QuickAddInput.tsx` | Поле быстрого добавления задачи в колонку |
| `WeeklyGoals.tsx` | Боковая панель целей на неделю |
| `AuthModal.tsx` | Модалка регистрации/входа (email+пароль, Google OAuth) |
| `SettingsModal.tsx` | Настройки: профиль, подписка, привязка Telegram, выход |
| `OnboardingOverlay.tsx` | Первичный онбординг новых пользователей |
| `OnboardingTooltip.tsx` | Всплывающие подсказки на отдельных элементах |
| `ProductTour.tsx` | Тур по фичам (после онбординга, по data-tour атрибутам) |
| `NotificationSurvey.tsx` | Опрос предпочтений по уведомлениям (Telegram/Browser/Both) |
| `LandingAnimation.tsx` | Анимированная демонстрация на лендинге |
| `Legal/PrivacyPolicy.tsx` | Страница `/privacy` — политика конфиденциальности |
| `Legal/PublicOffer.tsx` | Страница `/terms` — публичная оферта |

### `contexts/` — глобальное состояние

| Файл | Что хранит |
|---|---|
| `AuthContext.tsx` | Состояние авторизации, JWT-токен, методы login/logout |
| `SettingsContext.tsx` | Настройки пользователя (тема, начало дня, имена backlog-разделов) |

### `billing/` — фронтовая часть подписок

| Файл | Назначение |
|---|---|
| `BillingContext.tsx` | Контекст подписки: plan, status, методы оплаты |
| `BillingProviderWrapper.tsx` | Обёртка-провайдер для BillingContext |
| `api.ts` | HTTP-клиент к `/api/billing/*` (createPayment, getSubscription, etc.) |
| `types.ts` | Типы Subscription, Payment, CreatePaymentResponse |
| `index.ts` | Re-export'ы |
| `components/SubscriptionStatus.tsx` | Виджет статуса подписки в SettingsModal |
| `components/ProBadge.tsx` | Бейдж Pro около названия плана |
| `components/UpgradePrompt.tsx` | Модалка "купи Pro" с разными причинами (colors, weeks, recurrence) |
| `hooks/useSubscription.ts` | Hook для доступа к BillingContext |

### `annual-offer/` — оффер первых 24 часов

| Файл | Назначение |
|---|---|
| `AnnualOfferModal.tsx` | Модалка с предложением годовой подписки за 1794₽ (50% off) |
| `AnnualOfferWidget.tsx` | Плавающий виджет с обратным отсчётом |
| `useCountdown.ts` | Hook расчёта оставшегося времени |
| `utils.ts` | `isOfferActive()`, `isOfferDismissed()` |
| `index.ts` | Re-export'ы |

---

## Backend — `server/`

```
server/
├── index.js                # Express entry: middleware, Google OAuth, cron-задачи
├── package.json            # Backend-зависимости
├── schema.sql              # SQL-схема (только историческая, схема обновляется в коде)
├── README.md               # Старая инструкция запуска
├── .env                    # Конфигурация (НЕ КОММИТИТСЯ, см. ниже)
├── .env.example            # Образец .env с пустыми значениями
├── billing/
│   ├── routes.js           # Endpoints /api/billing/* + webhook YooKassa
│   ├── yookassa.js         # Обёртка над YooKassa SDK (createPayment, refund)
│   ├── renewal.js          # Логика автопродления (вызывается из cron)
│   └── schema.sql          # SQL для таблиц subscriptions, payments
├── routes/
│   ├── auth.js             # /api/auth/* (register, login, verify, logout)
│   ├── tasks.js            # /api/tasks/* (CRUD задач)
│   ├── settings.js         # /api/settings/* + Telegram link/status
│   └── admin.js            # /api/admin/* (статистика для админ-панели)
├── models/
│   ├── User.js             # SQL-операции с таблицей users
│   └── Task.js             # SQL-операции с таблицей tasks
├── middleware/
│   └── auth.js             # authenticateToken, generateToken (JWT)
├── config/
│   └── db.js               # Pool подключений к PostgreSQL
├── utils/
│   ├── email.js            # SMTP (Nodemailer): код подтверждения, welcome, оффер, сброс пароля
│   └── userBot.js          # Telegram-бот для напоминаний (long polling)
├── tests/
│   ├── smoke-test.js       # Smoke-тесты прода (запускается каждые 5 мин по cron)
│   └── health-cron.js      # Лёгкий health-check (HTTP /api/health)
├── scripts/
│   └── run-renewals.js     # CLI для ручного прогона renewal-логики
└── emails/
    └── telegram-announcement.html   # HTML-шаблон промо-рассылки про Telegram-бота
```

### Detail: что делает `server/index.js`

1. Загружает `.env`
2. Настраивает Express (CORS, JSON, cookieParser)
3. Регистрирует Passport Google OAuth Strategy
4. Подключает роутеры из `routes/` и `billing/routes.js`
5. `/api/health` — endpoint для мониторинга
6. `/api/billing/force-renewal` — ручной запуск renewal (admin only)
7. `updateSchema()` — миграция БД при старте (`ALTER TABLE ... ADD COLUMN IF NOT EXISTS`)
8. Если `STANDBY_MODE=true` — выходит после старта HTTP-сервера, не запускает фоновые задачи
9. Иначе регистрирует cron-задачи:
   - **3:00 МСК ежедневно** — `processRenewals()` (если не отключено `DISABLE_RENEWAL_CRON`)
   - **Каждые 30 мин** — `sendAnnualOfferReminder` тем, кто 19-24ч назад зарегистрировался и на free-плане
   - **Каждую минуту** — отправка напоминаний о задачах в Telegram (для юзеров с привязанным `telegram_chat_id`)
10. Запускает `startUserBotPolling()` — Telegram-бот ловит `/start TOKEN`, `/stop`

---

## Public — статика

```
public/
├── back/index.html         # Админ-панель: vanilla JS + Tailwind CDN, авторизация по ADMIN_USERNAME/PASSWORD
├── tailwindcss.js          # Tailwind 3.x для production (без сборки)
├── favicon.svg             # Иконка сайта
├── robots.txt              # Для поисковиков
└── *.mp4                   # main.mp4 + 1.mp4-8.mp4 — видео-демки для лендинга и FeaturesPage
```

---

# 🗄 База данных

## Таблицы

| Таблица | Что хранит | Ключевые поля |
|---|---|---|
| `users` | Пользователи | `id`, `email`, `password_hash`, `google_id`, `plan` (free/pro), `is_verified`, `verification_code`, `created_at`, `last_login`, `telegram_chat_id`, `telegram_link_token`, `monthly_price` (для grandfathering), `annual_offer_reminder_sent`, `no_task_reminder_sent`, `inactivity_reminder_sent`, `registration_source`, `registration_campaign` (UTM) |
| `tasks` | Задачи | `id`, `user_id` (FK), `content`, `column_id` (дата `YYYY-MM-DD` или `urgent`/`inbox`/`someday`/`ideas`), `hour` (0-23), `color`, `completed`, `subtasks` (JSONB), `created_at`, `recurrence_type`, `recurrence_interval`, `recurrence_end_date`, `reminder_offset` (`15min`-`12h`), `reminder_sent` |
| `subscriptions` | Подписки Pro | `id`, `user_id` (UNIQUE), `plan` (free/pro), `status` (active/cancelled), `yookassa_subscription_id` (= `payment_method_id`), `current_period_end`, `auto_renew`, `is_trial`, `is_annual`, `payment_method_title`, `renewal_retries`, `last_renewal_attempt` |
| `payments` | История платежей | `id`, `user_id`, `subscription_id`, `yookassa_payment_id` (UNIQUE), `amount`, `currency`, `status`, `description`, `created_at` |
| `survey_responses` | Опрос предпочтений уведомлений | `id`, `user_id`, `notification_pref`, `created_at` |

## Миграция схемы

Все `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` происходят при старте сервера в `updateSchema()` функции в `server/index.js`. Схема `server/schema.sql` — только для первичной инициализации.

---

# 🔐 Аутентификация

Два способа:
1. **Email + пароль** — `/api/auth/register` → код подтверждения на email → `/api/auth/verify` → JWT-токен в cookie
2. **Google OAuth** — `/api/auth/google` → редирект в Google → `/api/auth/google/callback` → JWT-токен

JWT хранится в:
- HttpOnly cookie (для безопасности)
- localStorage (для использования в `Authorization: Bearer` заголовке)

`JWT_SECRET` подписывает токены — если изменить, все разлогинятся.

---

# 💳 Платежи (YooKassa)

## Тарифы

| План | Цена | Что | Как создаётся |
|---|---|---|---|
| Free | 0 | 10 задач, текущая неделя | автоматически |
| Trial | 1 ₽ | 7 дней Pro + сохранение карты | `POST /api/billing/create-payment` (`createTrialPayment`) |
| Monthly | 299 ₽/мес | Pro, авто-продление | автопродление через cron, `createRecurringPayment` |
| Annual (in-app оффер 24ч) | 1 794 ₽ | 365 дней Pro | `POST /api/billing/create-annual-payment` (`createAnnualPayment`) |
| Annual (с pricing-страницы) | 2 870 ₽ | 365 дней Pro | `POST /api/billing/create-annual-full-payment` (`createAnnualFullPayment`) |

Grandfathered пользователи (зарегистрированные до 2026-02-10) имеют сохранённые низкие цены через колонку `users.monthly_price`.

## Webhook

`POST /api/billing/webhook` ловит события YooKassa:
- `payment.succeeded` → активировать Pro / продлить
- `payment.canceled` → если `permission_revoked`, выключить auto_renew
- `refund.succeeded` → если рефанд > 1₽, даунгрейд на free

## Renewal cron (3:00 МСК ежедневно)

`server/billing/renewal.js`:
- Берёт подписки с `current_period_end <= NOW() + 24h`, `auto_renew=true`, `renewal_retries < 3`
- Пытается списать через `payment_method_id` (сохранённую карту)
- При успехе — продлевает на 30 (monthly) или 365 (annual) дней
- При неудаче — `renewal_retries++`, через 24h следующая попытка
- После 3 неудач — даунгрейд на Free

---

# 📧 Email

`server/utils/email.js` через Nodemailer/SMTP. Функции:

| Функция | Когда шлётся |
|---|---|
| `sendVerificationCode` | При регистрации — 6-значный код подтверждения |
| `sendWelcomeEmail` | После подтверждения email или после первого Google-логина |
| `sendAnnualOfferReminder` | Через 19-24ч после регистрации (по cron) — оффер годовой подписки |
| `sendPasswordResetEmail` | При запросе сброса пароля |

Все письма — HTML с inline стилями. Конфигурация SMTP в `.env`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.

---

# 🤖 Telegram-бот

`server/utils/userBot.js` — long-polling бот для напоминаний.

Команды:
- `/start TOKEN` — связывает Telegram-чат с пользователем (TOKEN генерируется в SettingsModal через `/api/settings/telegram/link`)
- `/stop` — отвязывает чат

Напоминания шлются cron'ом в `server/index.js` каждую минуту: SQL ищет задачи с `reminder_offset` и наступающим `hour - offset`.

Конфиг: `TELEGRAM_USER_BOT_TOKEN`, `TELEGRAM_USER_BOT_USERNAME` (без `@`).

---

# 🚀 Деплой

## Автоматический (основной)

GitHub Actions `.github/workflows/deploy.yml`:
1. Push в ветку `main`
2. Action на ubuntu-latest:
   - rsync кода → VPS (`SSH_HOST`/`SSH_USERNAME`/`SSH_PRIVATE_KEY` из repo secrets)
   - `npm install` + `npm run build` (Vite)
   - `cd server && npm install`
   - `pm2 restart justplanner-api`

Исключаются из rsync: `node_modules`, `.git`, `dist`, `.env`, `github_actions_key*`.

## Ручной (резервный)

`deploy.sh` — то же самое, но запускается локально.

## Перезапуск без деплоя

```bash
ssh root@72.56.35.143
pm2 restart justplanner-api    # после правки .env
pm2 logs justplanner-api       # смотреть логи
```

---

# ⚙ Конфигурация (`.env`)

Файл `/var/www/justplanner/server/.env` на сервере. **В git не коммитится.**

Группы переменных:

| Группа | Переменные | Описание |
|---|---|---|
| Сервер | `PORT` | Порт backend (3001) |
| БД | `DATABASE_URL` | `postgresql://user:pass@host:port/db` |
| Сайт | `FRONTEND_URL` | `https://justplanner.ru` (для CORS, OAuth callback) |
| JWT | `JWT_SECRET` | Случайная строка, подписывает токены |
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth credentials |
| YooKassa | `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, `YOOKASSA_RETURN_URL` | Платежи |
| SMTP | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Email |
| Telegram | `TELEGRAM_USER_BOT_TOKEN`, `TELEGRAM_USER_BOT_USERNAME` | Бот напоминаний |
| Админ-панель | `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Доступ к `/back/` |

Технические флаги (для миграций):
- `STANDBY_MODE=true` — отключает все cron'ы и Telegram-бот, HTTP API работает
- `DISABLE_RENEWAL_CRON=true` — отключает только renewal cron

---

# 🔧 Управление в production

См. `OWNER_GUIDE.md` — пошаговая инструкция администратора (как менять API-ключи, бэкапить БД, рестартить, искать логи).

---

# 🧪 Тесты и мониторинг

| Скрипт | Запуск | Что делает |
|---|---|---|
| `server/tests/smoke-test.js` | cron каждые 5 мин | API-тесты прода, логирует в `/var/log/justplanner-tests-console.log` |
| `server/tests/health-cron.js` | (не активирован) | Лёгкий пинг `/api/health` |

При падении тестов — `process.exit(1)` (cron MAILTO подхватит, если настроено).

---

# 📊 Аналитика

- **Yandex Metrika** счётчик `106590123` подключён в `index.html`. Goal-события через `window.ym(106590123, 'reachGoal', '...')` — например `btn_login_click`, `btn_start_click`.
- Никаких других analytics не подключено.

---

# 📦 Удалённые модули (для справки)

В прошлом были, сейчас удалены:
- **Sentry** — frontend error tracking, выпилен
- **Unisender** — email-маркетинг, заменён на SMTP-only
- **Telegram admin bot** — уведомления владельцу о платежах/регистрациях, удалён
- **Python dashboard** — Google Sheets метрики, удалён
- **`server/utils/telegram.js`** — админ-бот, удалён
- **`server/utils/unisender.js`** — Unisender API, удалён
- **`server/tests/daily-report.js`** — Telegram daily report, удалён

---

**Последнее обновление:** 18 апреля 2026
