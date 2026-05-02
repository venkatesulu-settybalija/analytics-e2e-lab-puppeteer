# Analytics E2E Lab (Puppeteer)

**Jest + Puppeteer** automation for the **shared analytics demo app** [`@venkatesulu-settybalija/analytics-demo-app`](https://github.com/venkatesulu-settybalija/analytics-demo-app). This repo holds **tests and framework code**; the Express + static UI ship in that package.

## Demo app (via dependency)

Same behaviour as the Playwright lab: login, feeds, dashboard (KPIs, grain, CSV, saved views), Explore, SQL Lab lite, `admin` / `viewer` roles (`demo` / `demo123`, `viewer` / `viewer123`).

## This repo

- **Jest** + **Puppeteer**: POM (`src/ui/pages`), reset helper (`src/fixtures/reset.ts`), `fetch` API clients (`src/api/clients`), `tests/api` and `tests/ui`
- `jest-global-setup.mjs` starts **`node_modules/.../analytics-demo-app/dist/cli.js`** with `APP_ENABLE_RESET=true`
- GitHub Actions runs `npm test` on push/PR

## Run

```bash
npm install
npm test
```

Puppeteer downloads Chromium on install.

```bash
npm run test:api
npm run test:headed   # UI with visible browser
```

`npm run app:start` runs the **`analytics-demo-app`** CLI from `node_modules`.

`maxWorkers: 1` — shared in-memory app state.

Optional: `REUSE_TEST_SERVER=1` if the app is already running.

## Pinning the demo app

`package.json` pins `github:venkatesulu-settybalija/analytics-demo-app#v1.0.1`. Bump the tag when the demo app releases a new version.
