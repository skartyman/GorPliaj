# Public frontend migration to SvelteKit — Phase 5 (production readiness + cutover prep)

## Scope completed in this phase

1. Migrated `/menu` to SvelteKit public client with API-backed data.
2. Switched Express `/menu` routing to Svelte primary flow when build exists.
3. Audited all public Svelte routes:
   - `/`
   - `/events`
   - `/events/:slug`
   - `/booking`
   - `/map`
   - `/about`
   - `/menu`
4. Hardened Svelte service worker update lifecycle and cache strategy.
5. Updated public docs and release checklist for full public cutover.

## `/menu` migration notes

- New Svelte route: `public-frontend-svelte/src/routes/menu/+page.svelte` + `+page.ts`.
- Data source: `GET /api/menu` and likes `POST /api/menu/items/:id/like`.
- Preserved legacy behavior intent:
  - kitchen/bar section split;
  - category tabs;
  - item cards (image/name/description/price);
  - likes;
  - lightweight local cart with quantity controls and copy-to-clipboard.
- Added explicit states:
  - loading;
  - empty;
  - error.

## Public route readiness audit

### `/`
- Renders correctly.
- Uses real API for events preview and menu counters.
- Updated copy to reflect that `/menu` is now fully migrated.

### `/events`
- Promise-based loading state present.
- Error and empty states present.
- Added route-specific metadata.

### `/events/:slug`
- API detail loading and 404 handling intact.
- Removed obsolete mock-source wording.

### `/booking`
- Real API submit flow retained.
- Availability loading and user feedback states preserved.

### `/map`
- Public-only rendering maintained (no editor features).
- Availability statuses from API intact.
- Copy normalized (removed mixed-language leftovers).

### `/about`
- Replaced placeholder with stable production-safe content block.
- Added route-specific metadata.

### `/menu`
- New Svelte production route with API integration.
- Mobile-first card layout + sticky cart CTA behavior equivalent intent.

## Service worker / PWA hardening

- File: `public-frontend-svelte/src/service-worker.ts`
- Strategy now:
  - conservative for HTML/navigation (always network);
  - static assets cache with versioned cache key;
  - stale cache cleanup on activate;
  - explicit `SKIP_WAITING` message support for controlled updates.
- Removed aggressive auto-activation behavior from install path.

## Legacy public cleanup status

- Kept legacy public files intentionally for safe fallback via `/legacy` and when Svelte build is missing.
- No aggressive deletion of uncertain files in this phase.

## Build/deploy sanity

- Svelte check/build pass succeeds.
- Static output still written to `public/public-svelte`.
- Express `/admin/*` and `/api/*` routing remains untouched.

## Remaining risks before full hard cutover

1. Runtime API health (DB/content availability) still determines live public quality.
2. Legacy assets are retained; final deletion should happen only after real traffic soak period.
3. Existing dependency stack emits advisory warnings (Svelte 5 + vite-plugin-svelte 3) and should be planned for future maintenance.

## Release checklist (concise)

- [ ] Build and publish `public/public-svelte` in deployment artifact.
- [ ] Smoke test routes: `/`, `/events`, `/events/:slug`, `/menu`, `/booking`, `/map`, `/about`.
- [ ] Verify booking submit on production API (including failure/retry UX).
- [ ] Verify service-worker update cycle on 2+ real devices/browsers.
- [ ] Keep `/legacy` fallback enabled for first rollout window.
- [ ] Monitor API errors and client console errors for first 24h.
- [ ] Schedule legacy public deletion only after stability window.
