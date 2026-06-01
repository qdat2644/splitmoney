# Zyra Local Database Safety

`backend/prisma/dev.db` is local development data. It must not be used by E2E, automated tests, seed scripts, or reset scripts.

## Guard Rules

- `NODE_ENV=test` with `DATABASE_URL` resolving to `backend/prisma/dev.db` throws immediately.
- Playwright global setup aborts if the E2E database URL contains `dev.db`.
- E2E uses `DATABASE_URL="file:./e2e.db"` from the backend Prisma directory.
- If E2E schema setup fails, the run fails. It does not copy `dev.db`.

## Backup

Create a timestamped copy before risky local work:

```powershell
npm.cmd run db:backup
```

The backup is written to `backups/dev-<timestamp>.db`.

## Manual Guard Check

```powershell
npm.cmd run db:guard
```

This is also run automatically before `npm.cmd run test:e2e`.
