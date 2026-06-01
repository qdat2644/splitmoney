# Zyra E2E Smoke Tests

Zyra uses Playwright for a small Chromium-only smoke suite. The suite validates that the browser app boots, auth forms work, core authenticated shells render, a room and expense can be created, forecasts/settings load, and admin routing separates member/admin access.

## Install

```powershell
npm.cmd install
npx.cmd playwright install chromium
```

The tests use a dedicated SQLite database at `backend/prisma/e2e.db` through `DATABASE_URL=file:./e2e.db`. Do not point E2E at `dev.db` or a production database.

## Run

```powershell
npm.cmd run test:e2e
```

Playwright starts the backend on `http://127.0.0.1:5500` and the Vite frontend on `http://127.0.0.1:5174`. Sentry, Resend, and Gemini are disabled through test env vars. The global setup runs `prisma db push --skip-generate`, clears only the E2E database, and seeds deterministic users/room data. If Prisma schema engine is unavailable locally, setup copies `backend/prisma/dev.db` into the isolated `e2e.db` first, then clears and seeds the copy.

## Debug

```powershell
npm.cmd run test:e2e:headed
npm.cmd run test:e2e:ui
```

On failure, inspect `test-results/` and `playwright-report/`. Both are ignored by git.
