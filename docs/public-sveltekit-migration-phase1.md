# Public frontend migration to SvelteKit — Phase 1

## Current repo analysis

- **Admin frontend (React/Vite):** `admin-frontend/` with build output in `public/admin-app/`.
- **Current public frontend (legacy):** static pages/scripts in `public/` (`index.html`, `events.html`, `event.html`, `booking.html`, `menu.html`, JS in `public/js/*` and `public/menu.js`).
- **Backend/API:** Express app in `src/`, mounted at `/api` in `src/app.js`.

## Public API used by current public frontend

- `GET /api/menu`
- `POST /api/menu/items/:id/like`
- `GET /api/events`
- `GET /api/events/:slug`
- `GET /api/news`
- `GET /api/maps/default`
- `GET /api/maps/:mapId/availability`
- `GET /api/reservations`
- `POST /api/reservations`

## Legacy public pages and key blocks

- `/` — home shell (hero, menu preview, booking form, events preview, contacts, agreement, language toggle).
- `/events` — events list.
- `/events/:slug` — event details.
- `/booking` — map + booking workflow.
- `/menu` — digital menu + likes + cart.

## Phase 1 decisions

- Keep legacy public implementation untouched as fallback.
- Add a separate app `public-frontend-svelte/` for incremental migration.
- Build mobile-first shell and SvelteKit routes first.
- Keep API contract unchanged by adding a thin request layer in `src/lib/api`.
- Add lightweight PWA foundation (manifest + service worker scaffold) without aggressive caching.

## New SvelteKit structure

- `public-frontend-svelte/src/lib/components`
- `public-frontend-svelte/src/lib/features`
- `public-frontend-svelte/src/lib/api`
- `public-frontend-svelte/src/lib/stores`
- `public-frontend-svelte/src/lib/utils`
- `public-frontend-svelte/src/routes`

## Phase 1 status

### Implemented

- New standalone SvelteKit project with scripts.
- Shared shell: header, footer, bottom nav, global styles.
- Routes: `/`, `/events`, `/events/[slug]`, `/booking`, `/map`, `/about`.
- API layer stubs for events/bookings/map/content.
- i18n store scaffold for `uk/en`.
- PWA base: `manifest.webmanifest` + `src/service-worker.ts` placeholder.

### Intentionally left as placeholders

- Full booking map interaction UI and reservation state machine.
- Full menu and cart migration.
- Rich content sections from legacy home page.

## Next 3 reasonable steps

1. Migrate booking map (`/booking`) feature into `src/lib/features/booking-map` using existing `/api/maps/*` and `/api/reservations`.
2. Migrate menu page and cart state to Svelte stores, including likes via `POST /api/menu/items/:id/like`.
3. Add deployment integration (reverse proxy or Express mount) to switch public traffic to SvelteKit gradually behind feature flag.
