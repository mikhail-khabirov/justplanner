# JustPlanner — Полная документация проекта

## 📌 Описание проекта

**JustPlanner** — это современный еженедельный планировщик задач с моделью подписки (freemium). Позволяет пользователям организовывать дела в формате недельного календаря, использовать бэклог для долгосрочных задач и отслеживать продуктивность.

**Сайт**: [justplanner.ru](https://justplanner.ru)  
**Сервер**: VPS 5.35.94.142 (Ubuntu, PM2, Nginx)  
**Репозиторий**: [github.com/wfmvgo/justplanner](https://github.com/wfmvgo/justplanner)

---

## 🎯 Ключевые возможности

- **Недельный календарь**: Визуальное расписание с настраиваемым началом дня (по умолчанию 7:00).
- **Drag & Drop**: Перемещение задач между днями, часами и бэклогом.
- **Умный бэклог**: 4 настраиваемые категории ("Входящие", "Срочно", "Когда-нибудь", "Идеи") с возможностью переименования (Pro).
- **Подзадачи**: Чеклисты внутри задач.
- **Цветовая маркировка**: 6 цветов для визуального кодирования (только Pro).
- **Повторяющиеся задачи**: Рекуррентные задачи (только Pro).
- **Мягкая регистрация**: Демо-режим → окно регистрации после 20 действий.
- **Google OAuth**: Вход через Google.
- **PDF/Печать**: Экспорт расписания (только Pro).
- **Адаптивность**: Полная поддержка мобильных устройств.
- **Синхронизация**: Данные на сервере для зарегистрированных пользователей.

---

## 💰 Модель монетизации (Freemium)

### Free план
- 10 активных задач
- Только текущая неделя
- Без цветов, рекуррентности, PDF
- Без настройки названий секций бэклога

### Pro план — 99₽/мес
- Безлимитные задачи
- Все недели (прошлые и будущие)
- Цветовая маркировка
- Повторяющиеся задачи
- Настройка начала дня
- Переименование секций бэклога
- PDF/Печать
- Автопродление через 30 дней

### Платёжная система — YooKassa
- **Оплата**: 99₽ через YooKassa (банковские карты).
- **Привязка карты**: При оплате карта сохраняется (`save_payment_method`).
- **Отвязка карты**: Пользователь может отвязать карту в настройках.
- **Повторная привязка**: Заряд 1₽ с мгновенным возвратом.
- **Автопродление**: Cron-задача ежедневно в 3:00 (MSK) проверяет истёкшие подписки и списывает 99₽ с сохранённой карты.
- **Retry-логика**: До 3 попыток с интервалом 24 часа, затем даунгрейд на Free.
- **Webhook**: Обработка событий `payment.succeeded`, `payment.canceled`, `refund.succeeded`.

### Ранние пользователи
Все пользователи, зарегистрированные до 10.02.2026, имеют бессрочный Pro (дата окончания 2099-12-31), без привязки карт и автопродления.

---

## 🏗 Технологии

| Компонент | Технология |
|-----------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, ES Modules |
| База данных | PostgreSQL |
| Авторизация | JWT + Google OAuth 2.0 |
| Платежи | YooKassa SDK |
| Процесс-менеджер | PM2 |
| Веб-сервер | Nginx |
| CI/CD | GitHub Actions |
| Аналитика | Yandex Metrika (106590123) |
| Мониторинг | Sentry |

---

## 📁 Структура проекта

```
justplanner/
├── .windsurfrules                # Правила для AI агента (stack, architecture, conventions)
├── index.html                    # HTML точка входа + Yandex Metrika
├── index.tsx                     # React точка входа
├── App.tsx                       # Главный компонент (~1200 строк)
├── api.ts                        # API клиент (задачи, настройки)
├── types.ts                      # TypeScript типы (Task, Column, Subtask, TaskColor)
├── utils.ts                      # Утилиты (даты, ID, праздники РФ)
├── vite.config.ts                # Vite конфигурация (proxy /api → :3001)
├── tsconfig.json                 # TypeScript конфигурация
├── package.json                  # Frontend зависимости
├── deploy.sh                     # Скрипт деплоя (rsync → build → pm2 restart)
├── ecosystem.config.js           # PM2 конфигурация
├── nginx.conf.example            # Пример конфига Nginx
├── setup-vps.sh                  # Скрипт первичной настройки VPS
├── PROJECT_OVERVIEW.md           # Полная документация проекта
│
├── components/                   # UI Компоненты
│   ├── AuthModal.tsx             # Окно входа/регистрации (Email + Google)
│   ├── Column.tsx                # Колонка дня или бэклога
│   ├── FeaturesPage.tsx          # Страница возможностей (/features)
│   ├── LandingPage.tsx           # Лендинг (/)
│   ├── LandingAnimation.tsx      # Анимация на лендинге
│   ├── OnboardingOverlay.tsx     # Обучение для новых пользователей
│   ├── OnboardingTooltip.tsx     # Подсказки онбординга
│   ├── PricingPage.tsx           # Страница тарифов (/pricing)
│   ├── QuickAddInput.tsx         # Инпут быстрого создания задачи
│   ├── SettingsModal.tsx         # Настройки (аккаунт, начало дня, секции, подписка)
│   ├── TaskItem.tsx              # Карточка задачи
│   ├── TaskModal.tsx             # Модальное окно задачи (редактирование, подзадачи, рекуррентность)
│   └── Legal/
│       ├── PrivacyPolicy.tsx     # Политика конфиденциальности
│       └── PublicOffer.tsx       # Публичная оферта
│
├── billing/                      # Модуль биллинга (frontend)
│   ├── api.ts                    # API клиент (subscribe, verify, cancel, bindCard, unbindCard)
│   ├── types.ts                  # Типы подписки (SubscriptionStatus, Plan)
│   ├── index.ts                  # Реэкспорт модуля
│   ├── BillingContext.tsx        # React Context для управления подпиской
│   ├── BillingProviderWrapper.tsx # Обёртка-провайдер
│   ├── components/
│   │   ├── SubscriptionStatus.tsx # UI статуса подписки (в настройках)
│   │   ├── UpgradePrompt.tsx     # Попап "Обновите до Pro"
│   │   └── ProBadge.tsx          # Бейдж "Pro" в хедере
│   └── hooks/
│       └── useSubscription.ts    # Хук для проверки подписки
│
├── contexts/                     # React Contexts
│   ├── AuthContext.tsx           # Авторизация (JWT, Google OAuth)
│   └── SettingsContext.tsx       # Настройки пользователя (начало дня, секции)
│
├── annual-offer/                 # Модуль годовой скидки 50%
│   ├── AnnualOfferModal.tsx      # Модалка предложения
│   ├── AnnualOfferWidget.tsx     # Виджет с таймером 24ч
│   ├── useCountdown.ts           # Хук отсчёта времени
│   └── utils.ts                  # Утилиты для проверки срока
│
├── public/                       # Статика
│   ├── favicon.svg               # Фавикон
│   ├── logo.png                  # Логотип
│   ├── main.mp4                  # Видео на лендинге
│   ├── 1.mp4 - 8.mp4             # Видео для страницы Features
│   ├── robots.txt                # SEO
│   ├── sitemap.xml               # SEO
│   └── back/
│       └── index.html            # Админ-панель (standalone HTML)
│
└── server/                       # Backend
    ├── index.js                  # Точка входа (Express, CORS, OAuth, маршруты)
    ├── package.json              # Backend зависимости
    ├── schema.sql                # SQL схема (users, tasks)
    ├── config/
    │   └── db.js                 # Подключение к PostgreSQL (DATABASE_URL)
    ├── middleware/
    │   └── auth.js               # JWT middleware (authenticateToken)
    ├── models/
    │   ├── User.js               # Модель пользователя
    │   └── Task.js               # Модель задачи
    ├── routes/
    │   ├── auth.js               # Auth endpoints (register, login, google)
    │   ├── tasks.js              # CRUD задач
    │   ├── settings.js           # Настройки пользователя
    │   └── admin.js              # Админ-панель API
    ├── billing/
    │   ├── schema.sql            # SQL схема (subscriptions, payments)
    │   ├── yookassa.js           # YooKassa SDK (createPayment, createRecurringPayment, refundPayment, createCardBindingPayment)
    │   ├── routes.js             # Billing API (subscribe, verify, cancel, webhook, bind-card, unbind-card)
    │   └── renewal.js            # Cron автопродления (processRenewals)
    ├── tests/
    │   ├── smoke-test.js         # 11 smoke-тестов (запуск каждые 5 мин)
    │   ├── daily-report.js       # Дневной отчёт в Telegram (09:00 MSK)
    │   └── health-cron.js        # Легковесный health-check
    └── utils/
        ├── email.js              # Welcome email, reminder email (nodemailer)
        └── telegram.js           # Уведомления + bot polling (команда /pay)
```

---

## � Переменные окружения (server/.env)

```env
DATABASE_URL=postgresql://...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
FRONTEND_URL=https://justplanner.ru
YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
YOOKASSA_RETURN_URL=https://justplanner.ru
ADMIN_USERNAME=admin
ADMIN_PASSWORD=...
PORT=3001
```

---

## 🚀 Деплой

### Скрипт `deploy.sh`
```
1. rsync файлов на сервер (исключая node_modules, .git)
2. npm install на сервере
3. npm run build (Vite production build)
4. pm2 restart justplanner-api
```

### Запуск вручную
```bash
bash deploy.sh
```

### GitHub Actions
- **deploy.yml** — деплой при push в `main`
- **deploy-dev.yml** — деплой dev-ветки

---

## 🛠 Как запустить локально

### Frontend
```bash
npm install
npm run dev
# Доступ: http://localhost:3000
```

### Backend
```bash
cd server
npm install
cp .env.example .env    # Заполнить переменные
npm run dev
# API: http://localhost:3001
```

---

## 📊 Админ-панель

**URL**: `https://justplanner.ru/back/`  
**Доступ**: `admin` / `JustPlannerAdmin2026!`

### Возможности:
- Список всех пользователей
- Столбцы: ID, Email, Подписка (Pro/Free), Тип (Email/Google), Источник, Кампания, Регистрация, Активность, Задачи (+24ч)
- Сортировка по любому столбцу
- Удаление пользователей
- Статистика: всего пользователей, всего задач, задач за 24ч

---

## 📜 История изменений (полная)

### Фаза 0: Основа (январь 2026)
- Создание проекта (React + Vite + TypeScript)
- Недельный календарь с Drag & Drop
- Компоненты: Column, TaskItem, TaskModal, QuickAddInput
- Подзадачи, цветовая маркировка
- Праздники РФ 2026 года
- Backend: Express + PostgreSQL
- Auth: JWT + Google OAuth
- Демо-режим и мягкая регистрация (после 20 действий)

### Фаза 1: Лендинг и маркетинг
- LandingPage с анимацией
- FeaturesPage с видеороликами (1-8.mp4)
- PricingPage (Free vs Pro)
- Бейдж "Beta" возле логотипа
- SEO: robots.txt, sitemap.xml
- Юридические документы (Публичная оферта, Политика конфиденциальности)
- Yandex Metrika (счетчик 106590123)
- Virtual Page Hits для SPA
- UTM-трекинг: сохранение source и campaign при регистрации

### Фаза 2: Админ-панель
- Standalone HTML (`/back/index.html`)
- Аутентификация через JWT
- Таблица пользователей с сортировкой
- Статистика задач (общая + за 24ч)
- Столбцы: ID, Email, Подписка, Тип, Источник, Кампания, Регистрация, Активность, Задачи
- Удаление пользователей

### Фаза 3: DevOps
- GitHub Actions для CI/CD (main + dev)
- PM2 конфигурация (ecosystem.config.js)
- Скрипт деплоя (deploy.sh) через rsync
- Скрипт первичной настройки VPS (setup-vps.sh)
- Sentry для мониторинга ошибок

### Фаза 4: Freemium и ограничения
- Разделение на Free / Pro план
- **Ограничения Free**: 10 задач, только текущая неделя, без цветов, без рекуррентности, без PDF
- Компонент UpgradePrompt с контекстными сообщениями
- ProBadge в хедере для Pro-подписчиков
- Настройка начала дня — Pro feature
- Переименование секций бэклога — Pro feature
- PDF/Печать — Pro feature

### Фаза 5: Биллинг (YooKassa)
- **Подключение YooKassa SDK**: createPayment, getPaymentStatus
- **Endpoints**: `/subscribe`, `/verify-payment`, `/cancel-subscription`, `/webhook`
- **Frontend**: BillingContext, billingApi, SubscriptionStatus компонент
- **Табличная система**: subscriptions, payments в PostgreSQL
- **Гранты для ранних пользователей**: бессрочный Pro (до 2099-12-31)

### Фаза 6: Автопродление и привязка карт
- **Рекуррентные платежи**: createRecurringPayment (99₽ с сохранённой карты)
- **Cron-задача renewal.js**: ежедневная проверка истёкших подписок в 3:00 MSK
- **Retry-логика**: 3 попытки, потом даунгрейд на Free
- **Привязка карты**: save_payment_method при первой оплате
- **Отвязка карты**: endpoint `/unbind-card`, очистка yookassa_subscription_id
- **Переключатель автопродления**: toggle в настройках подписки
- **Показ привязанной карты**: "Bank card *XXXX" в настройках
- **Verify-payment fallback**: автоматическая проверка при загрузке приложения

### Фаза 7: Привязка карты через 1₽ (10.02.2026)
- **Сценарий**: Пользователь отвязал карту → для повторной привязки заряд 1₽ с мгновенным возвратом
- **createCardBindingPayment**: платёж на 1₽ с `save_payment_method: true`
- **refundPayment**: возврат через YooKassa API
- **Endpoint `/bind-card`**: инициация привязки
- **Кнопка "Привязать карту (1₽ с возвратом)"**: в настройках подписки
- **Исправлен баг**: неправильные аргументы `createRefund` (объект вместо позиционных)
- **Исправлен баг**: webhook `refund.succeeded` ошибочно даунгрейдил на Free при возврате 1₽ — добавлена проверка суммы ≤1₽

### Фаза 8: Годовая подписка со скидкой 50% (16.02.2026 - 17.02.2026)
- **Новый тариф**: Годовая подписка Pro — 594₽/год (50% скидка от 1188₽)
- **Welcome email**: Переработан дизайн с зелёным хедером, блок скидки 50%, ссылка `?annualOffer=1`
- **Таймер в письме**: Заменён статический визуальный таймер на текст "Действует 24 часа с момента регистрации"
- **Письмо-напоминание**: "⏰ Осталось менее 5 часов" — отправляется через 19ч после регистрации
- **Крон напоминаний**: Каждые 30 мин проверяет пользователей в окне 19-24ч, отправляет письмо, отмечает `annual_offer_reminder_sent`
- **Миграция БД**: Добавлены колонки `is_annual`, `is_trial`, `annual_offer_reminder_sent` в таблицы
- **Модалка скидки**: Показывается новым пользователям (free) и триальщикам через 10с после онбординга
- **Виджет в углу**: Отсчёт 24ч в правом нижнем углу для free и trial пользователей
- **Ссылка из письма**: `?annualOffer=1` открывает модалку даже для Pro-пользователей (месячная/триал → годовая)
- **API**: Добавлено поле `isAnnual` в `/subscription` ответ
- **Баги исправлены**: 
  - `pool is not defined` в крон-задаче напоминаний (16.02)
  - Виджет не показывался после регистрации через Google OAuth (race condition в `useCountdown`)
  - Таймер не перезапускался при повторной регистрации в том же браузере

### Фаза 9: Автоматизированная система тестирования (17.02.2026)
- **Health-check эндпоинт**: `/api/health` проверяет сервер, БД, email конфиг (возвращает 200/503)
- **Smoke-тесты** (11 проверок):
  - Сервер отвечает, БД подключена, email настроен
  - API регистрации, подписки, задач (auth)
  - Фронтенд загружается
  - БД: таблицы users, subscriptions; колонки `annual_offer_reminder_sent`, `is_annual`
  - SQL крона напоминаний выполняется без ошибок
- **Крон на сервере**:
  - **Каждые 5 мин** (`*/5 * * * *`): запуск smoke-тестов, результаты в `/var/log/justplanner-tests.json`
  - **Ежедневно в 09:00 МСК** (`0 6 * * *` UTC): дневной отчёт в Telegram
- **Уведомления в Telegram**:
  - 🚨 **Алерт при ошибках**: Только при сбое (не чаще раз в 30 мин) — список ошибок + статистика
  - 📊 **Дневной отчёт**: Всегда в 09:00 МСК — проведено тестов / успешных / ошибок
- **Логирование**: Результаты каждого запуска сохраняются в JSON для агрегации
- **GitHub Actions**: Убрано из CI/CD — тесты запускаются независимо на сервере кроном
- **Telegram бот** (long polling):
  - Команда `/pay` — статистика платежей (Рег / 1₽ / 99₽ / 594₽) за 24ч и всего
  - Автоматическая агрегация из таблиц `users` и `payments`
  - Polling запускается при старте сервера в `telegram.js`

---

## 🗄 Схема базы данных

### Таблица `users`
| Столбец | Тип | Описание |
|---------|-----|----------|
| id | SERIAL PK | ID пользователя |
| email | VARCHAR UNIQUE | Email |
| password_hash | VARCHAR | Хеш пароля (bcrypt) |
| google_id | VARCHAR | Google OAuth ID |
| plan | VARCHAR | Текущий план (free/pro) |
| registration_source | VARCHAR | Источник регистрации (UTM) |
| registration_campaign | VARCHAR | Кампания (UTM) |
| last_login | TIMESTAMP | Последний вход |
| created_at | TIMESTAMP | Дата регистрации |

### Таблица `tasks`
| Столбец | Тип | Описание |
|---------|-----|----------|
| id | SERIAL PK | ID задачи |
| user_id | INTEGER FK | Владелец |
| content | TEXT | Текст задачи |
| column_id | VARCHAR | Колонка (дата или бэклог) |
| hour | INTEGER | Час в расписании |
| color | VARCHAR | Цвет |
| completed | BOOLEAN | Выполнена |
| subtasks | JSONB | Массив подзадач |
| sort_order | INTEGER | Порядок сортировки |
| recurrence | JSONB | Настройки рекуррентности |
| created_at | TIMESTAMP | Дата создания |

### Таблица `subscriptions`
| Столбец | Тип | Описание |
|---------|-----|----------|
| id | SERIAL PK | ID подписки |
| user_id | INTEGER FK UNIQUE | Пользователь |
| plan | VARCHAR | План (free/pro) |
| status | VARCHAR | Статус (active/cancelled/expired) |
| current_period_end | TIMESTAMP | Дата окончания подписки |
| yookassa_subscription_id | VARCHAR | ID сохранённого способа оплаты |
| payment_method_title | VARCHAR | Название карты ("Bank card *XXXX") |
| auto_renew | BOOLEAN | Автопродление включено |
| renewal_retries | INTEGER | Счётчик неудачных попыток списания |
| last_renewal_attempt | TIMESTAMP | Последняя попытка продления |
| created_at / updated_at | TIMESTAMP | Метки времени |

### Таблица `payments`
| Столбец | Тип | Описание |
|---------|-----|----------|
| id | SERIAL PK | ID записи |
| user_id | INTEGER FK | Пользователь |
| yookassa_payment_id | VARCHAR | ID платежа в YooKassa |
| amount | DECIMAL | Сумма |
| currency | VARCHAR | Валюта (RUB) |
| status | VARCHAR | Статус (pending/succeeded/refunded) |
| description | VARCHAR | Описание платежа |
| created_at | TIMESTAMP | Дата платежа |

---

## 🔄 Потоки данных

### Поток оплаты подписки
```
Пользователь → Кнопка "Оформить Pro" → POST /api/billing/subscribe
→ YooKassa createPayment (99₽, save_payment_method) → Redirect на YooKassa
→ Пользователь оплачивает → YooKassa callback
→ GET /api/billing/verify-payment (fallback) или POST /webhook (основной)
→ Обновление subscriptions (plan=pro, period_end +30 дней, карта сохранена)
→ Обновление users (plan=pro)
```

### Поток автопродления
```
Cron (3:00 MSK ежедневно) → processRenewals()
→ SELECT подписки WHERE auto_renew=TRUE AND current_period_end <= NOW()
→ createRecurringPayment(99₽) с сохранённой картой
→ Успех: period_end +30 дней, retries=0
→ Неудача: retries++, если retries >= 3 → даунгрейд на Free
```

### Поток привязки карты (1₽)
```
Пользователь → "Привязать карту" → POST /api/billing/bind-card
→ createCardBindingPayment (1₽, save_payment_method)
→ Redirect на YooKassa → Оплата
→ Webhook payment.succeeded → Сохранение карты, auto_renew=TRUE
→ refundPayment(1₽) → Мгновенный возврат
→ Webhook refund.succeeded → (пропускаем, сумма ≤1₽, не даунгрейдим)
```
