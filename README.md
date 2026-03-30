# ГорПляж

PWA-проєкт для пляжно-ресторанного комплексу в Одесі з:
- вітриною меню;
- інтерактивною формою бронювання;
- API на Node.js/Express;
- офлайн-кешуванням через Service Worker.

## Локальний запуск

```bash
npm install
npm --prefix public-frontend-svelte install
npm run start
```

Сайт буде доступний за адресою `http://localhost:8080`.

### Режим розробки

```bash
npm run dev
```

Окремо новий public client (SvelteKit):

```bash
npm run public:svelte:dev
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
- `src/services/*` — бізнес-логіка (поки без БД).
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

## Public frontend (SvelteKit, final cutover-prep phase)

Новий публічний фронтенд винесено в окремий SvelteKit-проєкт:

- `public-frontend-svelte/` — SvelteKit-проєкт для поетапної міграції публічної частини.
- Production build нового клієнта збирається в `public/public-svelte/`.
- Legacy-публічна версія в `public/` збережена як fallback/архів і не видаляється агресивно.
- Адмінка (`admin-frontend/`) працює окремо і не змінюється.

### Команди

```bash
npm run public:svelte:dev
npm run public:svelte:check
npm run public:svelte:build
```

### Поточний serve-flow (phase 5)

- Express спочатку віддає `public/public-svelte` як primary public client для `/`, `/events`, `/events/:slug`, `/booking`, `/map`, `/about`, `/menu`.
- Якщо Svelte build відсутній, автоматично використовується legacy public (`public/*.html`).
- Маршрути `/admin/*` і `/api/*` працюють окремо, без змін для адмінки та backend API.
- Legacy-публіка доступна через `/legacy` (та `/legacy/*`) як безпечний fallback під час cutover.

### Production build / deploy

Docker build тепер:
1. встановлює залежності root і `public-frontend-svelte/`;
2. збирає новий public client (`npm run public:svelte:build`);
3. генерує Prisma client;
4. запускає Express (`npm run start`).

### Що вже повністю на SvelteKit

- `/`
- `/events`
- `/events/:slug`
- `/booking`
- `/map`
- `/about`
- `/menu`

### PWA / Service Worker

- Service worker у `public-frontend-svelte/src/service-worker.ts` працює у консервативному режимі:
  - **не кешує HTML-навігацію** (`navigate`/`document` йдуть у мережу);
  - кешує статичні assets і очищає старі версії кешу за версією білду;
  - підтримує безпечний апдейт через `SKIP_WAITING` message, без агресивного auto-takeover.
