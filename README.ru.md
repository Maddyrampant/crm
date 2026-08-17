# CRM — Управление взаимоотношениями с клиентами

Профессиональная CRM-система на персидском языке (RTL), построенная на Next.js 16, PostgreSQL со встроенным ИИ.

## Технологический стек

| Уровень | Технология |
|---------|-----------|
| Фреймворк | Next.js 16 (App Router) + TypeScript strict + Tailwind v4 |
| База данных | PostgreSQL 16 + Drizzle ORM |
| Авторизация | Better Auth (email/пароль + GitHub OAuth) |
| Состояние | TanStack Query + Zustand |
| Таблицы | TanStack Table v8 |
| Канбан | dnd-kit |
| Графики | Recharts |
| ИИ | Vercel AI SDK v7 + OpenRouter |
| Электронная почта | SMTP / Resend |
| SMS | Kavenegar |
| Кэш | Redis (опционально, fallback в памяти) |
| PDF | pdf-lib + fontkit |

## Возможности

- **Мультитенантность** — изоляция рабочих пространств с ролевым доступом (owner > admin > manager > seller > viewer)
- **Контакты и Компании** — полный CRUD с мастером импорта CSV
- **Воронка продаж** — канбан с перетаскиванием и вероятностью победы по этапам
- **Сделки** — взвешенный прогноз, отслеживание побед/поражений, выявление застрявших сделок
- **Счета-фактуры** — создание, отправка, отслеживание оплаты с обнаружением просроченных
- **Календарь и Встречи** — планирование с публичными ссылками для бронирования (`/s/{slug}`)
- **Задачи** — исполнитель, приоритет, сроки, напоминания
- **Электронная почта и SMS** — транзакционные через SMTP/Resend + Kavenegar
- **Лента активности** — аудит-журнал с таймлайном
- **Отслеживание писем** — пиксель открытия (`/t/{token}`), отслеживание просмотра PDF
- **Правила автоматизации** — событийные условия + действия (email, задача, уведомление, SMS, перемещение сделки)
- **ИИ-ассистент** — взаимодействие с подтверждением пользователя
- **REST API** — публичные эндпоинты с Bearer-авторизацией
- **Вебхуки** — входящие/исходящие с журналом доставки + повторными попытками
- **Дашборд** — KPI, графики выручки, статистика воронки, источники лидов
- **Прогноз** — взвешенный прогноз воронки, предсказание победы, застрявшие сделки, лучшее время для контакта
- **Персидский интерфейс** — полная поддержка RTL с датами Джали и персидскими цифрами

## Быстрый старт

```bash
# 1. Установка зависимостей
pnpm install

# 2. Запуск базы данных
docker compose up -d db redis

# 3. Настройка окружения
cp .env.example .env.local
# Генерация секрета авторизации: openssl rand -hex 32
# (Опционально) Общий кэш: REDIS_URL=redis://localhost:6379

# 4. Миграция и начальные данные
pnpm db:generate && pnpm db:migrate && pnpm db:seed

# 5. Запуск
pnpm dev
```

**Логин по умолчанию:** `admin@crm.dev` / `admin1234`

## Структура проекта

```
src/
├── app/
│   ├── (auth)/                  # Вход и регистрация
│   ├── (dashboard)/             # Основная оболочка приложения
│   │   ├── contacts/            # Контакты и компании
│   │   ├── pipeline/            # Воронка продаж и сделки
│   │   ├── invoices/            # Счета-фактуры и платежи
│   │   ├── calendar/            # Встречи и задачи
│   │   ├── reports/             # Отчёты, отслеживание, прогноз
│   │   ├── settings/            # Команда, правила, ссылки бронирования
│   │   ├── activity/            # Лента активности
│   │   └── notifications/       # Центр уведомлений
│   └── api/                     # REST API, вебхуки, чат ИИ
├── actions/                     # Серверные действия (с валидацией)
├── services/                    # Бизнес-логика + запросы к БД
├── lib/                         # Авторизация, кэш, форматирование, правила
├── components/
│   ├── ui/                      # Примитивы shadcn/ui
│   ├── layout/                  # Боковая панель, заголовок, поиск
│   ├── contacts/                # Компоненты контактов
│   ├── pipeline/                # Канбан, карточки сделок
│   ├── reports/                 # Графики, карточки статистики
│   ├── rules/                   # Конструктор правил автоматизации
│   ├── bookings/                # Менеджер ссылок бронирования
│   └── activity/                # Таймлайн активности
├── db/
│   └── schema/                  # Drizzle schema (по модулям)
└── config/
    └── nav.ts                   # Меню навигации
```

## Модель данных

Каждая сущность изолирована в пределах **рабочего пространства** (мультитенантность).

```
workspaces ─┬─ workspaceMembers (user + role)
            ├─ pipelines ── stages ── deals ── contacts ── companies
            ├─ invoices ── invoiceItems ── payments
            ├─ appointments / tasks
            ├─ bookingLinks
            ├─ automationRules ── ruleLogs
            ├─ trackingTokens
            ├─ webhooks ── webhookDeliveries
            ├─ apiKeys
            ├─ emailTemplates / emailLogs / smsLogs
            ├─ notifications
            └─ aiConversations ── aiMessages ── aiToolRuns
activityLog (append-only аудит-журнал)
```

## Redis (Опционально)

Если `REDIS_URL` не задан, всё работает с in-memory fallback.

| Компонент | Без Redis | С Redis |
|-----------|----------|---------|
| Next.js Cache Handler (`'use cache'`) | In-memory | Общий между инстансами |
| Cache Service (`src/lib/cache.ts`) | In-memory | Redis + TTL |
| Rate Limiting | In-memory | Атомарный token bucket (Lua) |
| Сессии Better Auth | В БД | В БД + кэш Redis |

```bash
docker compose up -d redis    # Порт 6379
# Или используйте Vercel Redis / Upstash с тем же REDIS_URL
```

## Команды

| Команда | Описание |
|---------|----------|
| `pnpm dev` | Сервер разработки (Turbopack) |
| `pnpm build` | Продакшн сборка |
| `pnpm lint` | ESLint |
| `pnpm db:generate` | Генерация миграции из схемы |
| `pnpm db:migrate` | Применение миграций |
| `pnpm db:seed` | Начальные данные |
| `pnpm db:studio` | Drizzle Studio (визуальный просмотр БД) |

## Переменные окружения

| Переменная | Обязательна | Описание |
|-----------|-------------|----------|
| `DATABASE_URL` | Да | Строка подключения PostgreSQL |
| `BETTER_AUTH_SECRET` | Да | Секрет авторизации (`openssl rand -hex 32`) |
| `BETTER_AUTH_URL` | Да | URL приложения (напр. `http://localhost:3000`) |
| `GITHUB_CLIENT_ID` | Нет | GitHub OAuth |
| `GITHUB_CLIENT_SECRET` | Нет | GitHub OAuth |
| `REDIS_URL` | Нет | Redis для кэширования |
| `OPENROUTER_API_KEY` | Нет | ИИ-ассистент |
| `RESEND_API_KEY` | Нет | Транзакционная почта |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | Нет | SMTP почта |
| `KAVENEGAR_API_KEY` | Нет | Персидский SMS |

## Принципы архитектуры

- **Server Components** для большинства страниц — прямые запросы к БД, без клиентского водопада
- **Server Actions** с валидацией Zod на границе
- **Optimistic Updates** через TanStack Query для интерактивных функций
- **ИИ с подтверждением пользователя** — инструменты выполняются только после подтверждения
- **Append-only аудит-журнал** — все значимые изменения отслеживаются
- **Параллельная разработка** — каждый разработчик работает в своей директории (см. `docs/OWNERSHIP.md`)

## Целевые показатели производительности

- p95 задержка API < 200мс
- LCP на мобильном 4G < 2.5с
- Все записи ИИ логируются в аудит-журнал с подтверждением человека

## Документация

- [Архитектура](docs/ARCHITECTURE.md)
- [Права собственности и границы файлов](docs/OWNERSHIP.md)
- [Руководство разработчика](docs/DEVELOPMENT.md)

## Команда

| Роль | GitHub | Фокус |
|------|--------|-------|
| Бэкенд + Инфраструктура | [@Maddyrampant](https://github.com/Maddyrampant) | Авторизация, счета, календарь, ИИ, вебхуки, API |
| Фронтенд + UI | [@hordekiller](https://github.com/hordekiller) | Контакты, воронка, сделки, отчёты, правила |

## Лицензия

Приватная — Все права защищены.
