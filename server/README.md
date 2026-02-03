# JustPlanner Server

Backend API сервер для JustPlanner.

## Требования

- Node.js 18+
- PostgreSQL 14+

## Установка

1. Установите зависимости:
```bash
cd server
npm install
```

2. Создайте базу данных PostgreSQL:
```bash
createdb justplanner
```

3. Примените схему базы данных:
```bash
psql -d justplanner -f schema.sql
```

4. Скопируйте и настройте переменные окружения:
```bash
cp .env.example .env
```

Отредактируйте `.env` файл:
```env
DATABASE_URL=postgresql://user:password@localhost:5432/justplanner
JWT_SECRET=your-super-secret-jwt-key-change-in-production
GOOGLE_CLIENT_ID=your-google-client-id  # Опционально
GOOGLE_CLIENT_SECRET=your-google-client-secret  # Опционально
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## Запуск

```bash
npm run dev
```

Сервер запустится на http://localhost:3001

## API Endpoints

### Авторизация

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/auth/register` | Регистрация |
| POST | `/api/auth/login` | Вход |
| GET | `/api/auth/me` | Текущий пользователь |
| GET | `/api/auth/google` | Google OAuth |

### Задачи (требуется авторизация)

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/tasks` | Получить все задачи |
| POST | `/api/tasks` | Создать задачу |
| PUT | `/api/tasks/:id` | Обновить задачу |
| DELETE | `/api/tasks/:id` | Удалить задачу |
| POST | `/api/tasks/sync` | Синхронизировать все задачи |

## Google OAuth (опционально)

Для настройки входа через Google:

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект
3. Включите Google+ API
4. Создайте OAuth 2.0 credentials
5. Добавьте `http://localhost:3001/api/auth/google/callback` в Authorized redirect URIs
6. Скопируйте Client ID и Client Secret в `.env`
