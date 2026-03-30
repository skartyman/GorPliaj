# Public frontend migration to SvelteKit — Phase 4 (final pre-switch)

## Readiness audit (public scenarios)

### Fully covered by new SvelteKit public client

- `/` — updated public home with API-backed events/menu counters and booking/map entry points.
- `/events` — events list from real API.
- `/events/:slug` — event details from real API.
- `/booking` — public booking form with map-aware table selection and reservation submit to real API.
- `/map` — public map + availability statuses from real API.
- language switch (uk/en) via shared i18n store in layout/header.
- base SEO/meta on core routes.
- base PWA setup (manifest + service worker with conservative cache behavior).

### Still legacy / fallback

- `/menu` remains legacy (`public/menu.html`) until dedicated Svelte migration.
- full legacy bundle is kept available as safe fallback through `/legacy` and `/legacy/*`.

## Real-data integration status

- Events: `GET /api/events`, `GET /api/events/:slug`.
- Home menu stats: `GET /api/menu`.
- Map + availability: `GET /api/maps/default`, `GET /api/maps/:mapId/availability`.
- Booking submit: `POST /api/reservations`.
- Temporary mock adapters removed from migrated flows (events/map now fail visibly instead of silent mock fallback).

## Routing / entrypoint switch

- New primary public client is static SvelteKit build output in `public/public-svelte`.
- Express now serves Svelte static output first when build is present.
- If Svelte build is absent, Express falls back to legacy public pages.
- `/admin/*` and `/api/*` flows are untouched.

## Build/deploy updates

- SvelteKit switched to `@sveltejs/adapter-static` with output directly into `public/public-svelte`.
- Docker build now installs Svelte dependencies and runs `npm run public:svelte:build`.
- This makes new public client ready by default in container deploys while preserving legacy fallback.

## Safe cleanup

- Removed unused mock data files for public map/events from Svelte app.
- Legacy static assets are intentionally kept (not aggressively deleted).

## Remaining risks before hard production cutover

- `/menu` is still legacy and should be migrated if full parity is required.
- `public/public-svelte` must be rebuilt on every deploy to keep public routes on the new client.
- Service worker strategy is conservative, but rollout should still be validated on real devices (install/update cycle).
