# Zyra E2E Smoke Tests

Zyra uses Playwright for a small Chromium-only smoke suite. The suite validates that the browser app boots, auth forms work, core authenticated shells render, a room and expense can be created, forecasts/settings load, and admin routing separates member/admin access.

## Install

```powershell
npm.cmd install
npx.cmd playwright install chromium
```

The tests use a dedicated SQLite database at `backend/prisma/e2e.db` through `DATABASE_URL=file:./e2e.db`. Do not point E2E at `dev.db` or a production database. A hard guard aborts E2E/test startup if `NODE_ENV=test` resolves to `backend/prisma/dev.db`.

## Run

```powershell
npm.cmd run test:e2e
```

Playwright starts the backend on `http://127.0.0.1:5500` and the Vite frontend on `http://127.0.0.1:5174`. Sentry, Resend, and Gemini are disabled through test env vars. The global setup runs `prisma db push --skip-generate`, clears only the E2E database, and seeds deterministic users/room data. If Prisma schema setup fails, E2E fails loudly; it must never copy from `dev.db`.

## Database Safety

Never run E2E with `DATABASE_URL="file:./dev.db"`. The root `test:e2e` script runs `db:guard` before Playwright, and the backend Prisma client has the same guard for `NODE_ENV=test`.

Back up local dev data before risky work:

```powershell
npm.cmd run db:backup
```

This copies `backend/prisma/dev.db` into `backups/` and does not modify the source database.

## Debug

```powershell
npm.cmd run test:e2e:headed
npm.cmd run test:e2e:ui
```

On failure, inspect `test-results/` and `playwright-report/`. Both are ignored by git.
