# Zyra PostgreSQL Migration Runbook

This runbook prepares Zyra for SQLite to PostgreSQL migration without deleting SQLite data or forcing local developers to install PostgreSQL.

## Strategy

Use Option A first:

- SQLite remains the local development default via `DATABASE_URL="file:./dev.db"`.
- PostgreSQL becomes the production target after a reviewed migration branch and integrity check.
- No finance calculations, API contracts, UI, or business logic should change during migration prep.

Recommended provider: Neon for the first production PostgreSQL deployment. Supabase, Railway, and self-hosted PostgreSQL are acceptable alternatives when their backup and operations tradeoffs are understood.

## Known Schema Risks

- `Budget` uniqueness is currently application-enforced with `findFirst + update/create`. Do not add a compound unique constraint until duplicate rows are reported and resolved.
- Money fields are `Float`. Keep them unchanged for cutover safety; evaluate a future `Decimal` migration after PostgreSQL is stable.
- JSON payloads are stored as strings in `PlanExpense.participants`, `FinancialProfile.profileData`, `OperationalEvent.metadata`, and `AuditTrail.metadata`. Integrity checks must verify that non-empty values parse as JSON.
- Role, status, type, and split-type values are string fields. Keep them as strings initially; migrate to enums only after cutover.
- Date filters use JavaScript `Date` month boundaries. Run PostgreSQL test coverage before cutover, especially budget and analytics date windows.
- Import commits and budget upserts may expose concurrency races under PostgreSQL. Do not rewrite them in this prep sprint; track follow-up hardening.

## Safe Prep Commands

From `backend`:

```bash
npm run prisma:validate
npm run migration:export:dry-run
npm run migration:check
npm run test:sqlite
```

Create a JSON export only when needed:

```bash
node scripts/export-sqlite-data.js --out ../backups/zyra-sqlite-export.json
```

The export script is read-only against the database. Without `--out`, it prints row counts and writes no file.

## PostgreSQL Migration Branch

Create a dedicated branch for the actual provider switch:

```bash
git checkout -b codex/postgres-migration
```

In that branch only:

1. Change `backend/prisma/schema.prisma` datasource provider from `sqlite` to `postgresql`.
2. Set `DATABASE_URL` to an empty PostgreSQL database.
3. Generate a migration:

```bash
cd backend
npx prisma migrate dev --name init_postgres
npm run prisma:validate
```

4. Confirm indexes from SQLite prep exist in the generated migration.
5. Do not add `Budget` unique constraints until duplicate reports are clean.

## Data Migration Flow

Recommended first path:

1. Stop writes to the SQLite deployment.
2. Back up the SQLite DB file.
3. Export JSON:

```bash
cd backend
node scripts/export-sqlite-data.js --out ../backups/zyra-sqlite-export.json
```

4. Apply PostgreSQL Prisma migrations to an empty database.
5. Import data with a reviewed importer script or Prisma Studio/manual loader in a staging environment.
6. Run integrity checks against PostgreSQL:

```bash
npm run migration:check -- --database-url "$DATABASE_URL"
```

7. Run backend tests against PostgreSQL when `TEST_DATABASE_URL` is available.

This repo currently includes the read-only export and integrity-check pieces. The write-side importer should be implemented only after export shape and duplicate reports are reviewed.

## Integrity Checklist

The checker reports:

- counts for users, rooms, room members, guests, expenses, expense participants, payments, budgets, plans, plan participants, plan expenses, financial profiles, operational events, audit trails, and password reset tokens
- missing room/user/guest references
- invalid payment source/target identities
- invalid JSON string fields
- budget duplicate scopes by `(userId, roomId, category, month, year)` as warnings
- zero-sum balance for up to 10 sample rooms

Any failure must be fixed before cutover. Budget duplicate warnings must be reviewed before adding any future uniqueness constraint.

## Cutover Checklist

1. Announce a write freeze.
2. Back up SQLite and export JSON.
3. Apply PostgreSQL migrations.
4. Import data into PostgreSQL.
5. Run integrity check against PostgreSQL.
6. Run backend test suite with PostgreSQL test env if available.
7. Update production `DATABASE_URL` to PostgreSQL.
8. Restart PM2.
9. Verify `/health`, login, room list, expense creation, payment creation, budgets, plans, import preview, admin overview, and password reset.
10. Keep SQLite backup and old env for rollback until the system is stable.

## Rollback Plan

- If PostgreSQL validation fails before traffic moves, discard the PostgreSQL database and keep SQLite production running.
- If validation fails after switching env but before public traffic, restore the old `DATABASE_URL` and restart PM2.
- If public writes occurred on PostgreSQL before rollback, stop writes, dump PostgreSQL, restore SQLite deployment, and reconcile those writes manually.

## Optional PostgreSQL Test Setup

Set a disposable database URL:

```env
TEST_DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/zyra_test?schema=public"
```

Run tests on the migration branch after generating a PostgreSQL Prisma client:

```bash
DATABASE_URL="$TEST_DATABASE_URL" npx prisma migrate deploy
DATABASE_URL="$TEST_DATABASE_URL" npm test
DATABASE_URL="$TEST_DATABASE_URL" npm run migration:check
```
