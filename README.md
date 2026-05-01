# Analytics E2E Lab

Local-first analytics demo app (no database, no Docker) with an automation framework on top.

## Includes

- Express app with static multi-page UI:
  - Login
  - Feed editor
  - Dashboard with KPI cards, configurable time window (+ day/week grain), bucket labels, bar vs line chart, **CSV export** of KPIs + series, and **saved views** persisted in `localStorage` (browser-only “dashboards”)
  - Explore screen with **dataset catalogue** (`feeds`, synthetic `events_daily`) and **SQL Lab lite** (read-only `SELECT` on `feeds`)
- API routes for auth (returns `role`), feed management, `GET /api/datasets`, `POST /api/sqllab/run`, parameterized `GET /api/dashboard/summary?days=&granularity=`, and `GET /api/auth/me`
- **Roles**: `admin` (default `demo` / `demo123`) can create, edit, and toggle feeds; `viewer` (`viewer` / `viewer123`) is read-only for mutations
- GitHub Actions workflow runs `npm test` on push/PR
- **Jest** + **Puppeteer** for automation:
  - POM (`src/ui/pages`)
  - Shared reset helper (`src/fixtures/reset.ts`)
  - API clients using `fetch` (`src/api/clients`)
  - `tests/api` and `tests/ui` suites

## Run

```bash
npm install
npm test
```

Puppeteer downloads a compatible Chromium on install; no separate browser install step is required.

For just API tests:

```bash
npm run test:api
```

For UI tests in a visible browser:

```bash
npm run test:headed
```

Override credentials with environment variables (see `.env.example`). `npm run app:start` enables `APP_ENABLE_RESET=true` so `POST /api/__reset` works when you reuse the local server.

Set `APP_PORT` (and optionally `BASE_URL`) if port `3100` is already taken; `src/config/env.ts` defaults to that port when unset.

Jest runs with `maxWorkers: 1` because every test hits the same in-memory demo process; one worker avoids flaky shared-state races.

If the app is already running locally, you can set `REUSE_TEST_SERVER=1` so `jest-global-setup.mjs` skips spawning another process (optional).
