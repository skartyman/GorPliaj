# ГорПляж

PWA-проєкт для пляжно-ресторанного комплексу в Одесі з:
- вітриною меню;
- інтерактивною формою бронювання;
- API на Node.js/Express;
- офлайн-кешуванням через Service Worker.

## Локальний запуск

```bash
npm install
npm --prefix public-frontend install
npm run start
```

Сайт буде доступний за адресою `http://localhost:8080`.

### Режим розробки

```bash
npm run dev
```

Окремо public client (React + Vite):

```bash
npm run public:dev
```

### Змінні оточення

Проєкт використовує `dotenv` і читає `.env` у корені репозиторію.
Скопіюйте шаблон і заповніть значення:

```bash
cp .env.example .env
```

Обов'язкові змінні:

```env
DATABASE_URL=
ADMIN_AUTH_SECRET=
ADMIN_SEED_PASSWORD=
APP_BASE_URL=
NODE_ENV=development
PORT=8080
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_BASE_URL=
R2_ENDPOINT=
```

Нотатки:
- `ADMIN_AUTH_SECRET` обов'язковий поза локальною розробкою (`NODE_ENV=development`).
- `ADMIN_SEED_PASSWORD` обов'язковий для `npm run prisma:seed`.
- `DATABASE_URL` використовується Prisma і сумісний з Fly.io secrets (`fly secrets set ...`).
- `APP_BASE_URL` можна встановити як публічний URL застосунку (наприклад, Fly.io домен).
- R2-змінні потрібні для admin image upload (події/новини/menu assets), а в продакшені є обов'язковими.

### Prisma: міграції та seed

```bash
npm run prisma:migrate
npm run prisma:seed
```

Скрипт seed створює базові дані для розробки (admin-користувач, дефолтна карта, зони, столи та map objects) та безпечно оновлює їх при повторному запуску.


## Нова структура backend

- `server.js` — мінімальна точка входу для сумісності деплою.
- `src/app.js` — ініціалізація Express-додатка.
- `src/server.js` — запуск HTTP-сервера.
- `src/routes/*` — публічні, admin і payments роутери.
- `src/controllers/*` — контролери endpoint'ів.
- `src/services/*` — бізнес-логіка.
- `src/config/*` — конфігурація середовища.

## Поточні endpoint'и

- `GET /health`
- `GET /api/menu`
- `GET /api/events`
- `GET /api/news`
- `GET /api/reservations`
- `POST /api/reservations`
- `PATCH /api/reservations/:id/status`
- `DELETE /api/reservations/:id`
- `GET /api/maps/default`
- `GET /api/admin/status` (placeholder)
- `GET /api/payments/status` (placeholder)


## Admin frontend (окремий React + Vite застосунок)

Адмінка винесена в окремий фронтенд-додаток у межах цього репозиторію:

- `admin-frontend/` — джерела React SPA (Vite).
- `public/admin-app/` — production build адмінки, який віддає Express.
- `src/app.js` — маршрути `/admin/*` віддають SPA, API лишається на `/api/admin/*`.

### Маршрути адмінки

- `/admin/login`
- `/admin/reservations`
- `/admin/reservations/:id`

### Команди

```bash
npm run admin:dev
npm run admin:build
```

Адмінка використовує cookie-based авторизацію і перевіряє сесію через `GET /api/admin/auth/me`.

## Public frontend (React + Vite, production)

Публічний фронтенд винесено в окремий React/Vite-проєкт:

- `public-frontend/` — React SPA публічної частини.
- Production build публічного клієнта збирається в `public/public-app/`.
- Адмінка (`admin-frontend/`) працює окремо і не змінюється.

### Команди

```bash
npm run public:dev
npm run public:build
```

### Поточний serve-flow

- Express віддає `public/public-app` як єдиний public client для `/`, `/events`, `/events/:slug`, `/booking`, `/about`, `/menu` та інших публічних маршрутів. Сторінка інтерактивної карти закрита для публічної навігації та доступна тимчасово для перевірки за прямим URL `/map-preview`.
- Якщо public React build відсутній, сервер завершує запуск з помилкою конфігурації.
- Маршрути `/admin/*` і `/api/*` працюють окремо, без змін для адмінки та backend API.

### Production build / deploy

Docker build тепер:
1. встановлює залежності root і `public-frontend/`;
2. збирає новий public client (`npm run public:build`);
3. генерує Prisma client;
4. запускає Express (`npm run start`).

### Що вже повністю на React public app

- `/`
- `/events`
- `/events/:slug`
- `/booking`
- `/map-preview` - тимчасова dev-preview сторінка карти
- `/about`
- `/menu`
