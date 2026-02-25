# JustPlanner Dashboard Metrics Collector

Скрипт автоматически собирает ежедневные метрики из нескольких источников и записывает их в Google Sheets.

## Источники данных

### Яндекс.Директ (Reports API v5)
- **Клики** — кол-во кликов по рекламе за день
- **Расход** — потраченный бюджет за день (₽, с НДС)

### PostgreSQL
- **Выручка** — сумма успешных платежей за день
- **Триал** — количество триальных оплат (1₽)
- **Месячных** — количество месячных подписок (99₽)
- **Годовых** — количество годовых подписок (594₽)
- **Продлений** — автопродления (99₽/1188₽)
- **Регистрации** — новые верифицированные пользователи за день
- **DAU** — уникальные пользователи с активностью за день
- **Активные подписки** — общее кол-во Pro-подписок на конец дня
- **Задачи создано** — новые задачи за день
- **Retention D1** — % вернувшихся через 1 день после регистрации
- **Retention D7** — % вернувшихся через 7 дней после регистрации
- **Trial→Pro** — конверсия из триала в платную подписку
- **Churn** — отмены подписки за день

### Яндекс.Метрика (API) — планируется
- **Визиты** — количество визитов на сайт за день
- **Посетители** — уникальные посетители за день
- **Bounce rate** — показатель отказов

### Формулы в Google Sheets (не импортируются)
- **CPC** — Расход / Клики
- **CAC** — Расход / Регистрации
- **Конверсия Клик→Рег** — Регистрации / Клики
- **ARPU** — Выручка / DAU
- **ROI** — (Выручка − Расход) / Расход
- **Стоимость подписчика** — Расход / Оплаты

## Структура Google Sheets

Скрипт ищет строку по дате в колонке A (формат `DD.MM.YYYY`) и пишет данные:

| Колонка | Метрика | Источник |
|---|---|---|
| A | Дата | скрипт |
| B | Выручка | скрипт (PostgreSQL) |
| C | Триал | скрипт (PostgreSQL) |
| D | Месячных | скрипт (PostgreSQL) |
| E | Годовых | скрипт (PostgreSQL) |
| F | Продлений | скрипт (PostgreSQL) |
| G | Клики | скрипт (Яндекс.Директ) |
| H | CPC | формула `=I/G` |
| I | Расход | скрипт (Яндекс.Директ) |
| J | Рег | скрипт (PostgreSQL) |
| K | CAC | формула `=I/J` |
| L | Клик→Рег% | формула `=J/G` |
| M | reg→trial | формула `=C/J` |
| N | trial→full | формула `=F/C` |
| O | reg→50 | формула `=E/J` |
| P | DAU | скрипт (PostgreSQL) |
| Q | Подписки | скрипт (PostgreSQL) |
| R | Задачи | скрипт (PostgreSQL) |
| S | Ret D1% | скрипт (PostgreSQL) |
| T | Ret D7% | скрипт (PostgreSQL) |
| U | Trial→Pro | скрипт (PostgreSQL) |
| V | Churn | скрипт (PostgreSQL) |

Если строки с датой нет — добавляет новую в конец.

## Установка

```bash
cd dashboard
pip install -r requirements.txt
```

## Настройка

### 1. `.env` файл

```bash
cp env.example .env
```

| Переменная | Где взять |
|---|---|
| `DATABASE_URL` | Строка подключения к PostgreSQL |
| `YANDEX_OAUTH_TOKEN` | [Получить токен](https://oauth.yandex.ru/authorize?response_type=token&client_id=e478b7a9b2cd4374a600d9e602b5be5f) |
| `YANDEX_CLIENT_LOGIN` | Логин аккаунта Яндекс.Директ (без @yandex.ru) |
| `GOOGLE_SHEET_ID` | ID из URL таблицы: `docs.google.com/spreadsheets/d/**ID**/edit` |
| `GOOGLE_CREDS_FILE` | Путь к JSON Service Account |

### 2. Google Service Account

1. Открой [Google Cloud Console](https://console.cloud.google.com/)
2. Создай проект → API & Services → Enable **Google Sheets API** + **Google Drive API**
3. Credentials → Create Credentials → **Service Account**
4. Скачай JSON-ключ, положи рядом со скриптом как `google-credentials.json`
5. **Расшарь Google Sheets** на email сервис-аккаунта (`...@....iam.gserviceaccount.com`) с правом редактирования

## Запуск

```bash
# За вчера (по умолчанию)
python collect_metrics.py

# За конкретную дату
python collect_metrics.py --date 2026-02-20
```

Лог пишется в `dashboard.log`.

## Крон (VPS, ежедневно в 01:00 MSK)

```
0 1 * * * cd /var/www/justplanner/dashboard && python3 collect_metrics.py >> /var/log/dashboard-cron.log 2>&1
```

## Логи

Скрипт пишет подробный лог в `dashboard.log` — что собрал, что записал, какие ошибки.
