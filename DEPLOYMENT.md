# Deployment Guide

Target: Ubuntu 22.04 LTS, Node.js 20, PM2, Nginx, and PostgreSQL for production.

SQLite remains supported for local development only. Do not delete local SQLite data while preparing PostgreSQL migration.

## 1. Base Setup

```bash
sudo apt update
sudo apt install -y curl git nginx build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 2. App Setup

```bash
git clone <repo-url> zyra
cd zyra
npm ci
cd backend
npm ci
cp .env.example .env
```

Edit `backend/.env` for production:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/zyra?schema=public
JWT_SECRET=<long-random-secret>
GEMINI_API_KEY=<gemini-key>
RESEND_API_KEY=<resend-key>
EMAIL_FROM="Zyra <no-reply@your-verified-domain.com>"
SENTRY_DSN=<backend-sentry-dsn>
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=<git-sha-or-release>
FRONTEND_URL=https://app.example.com
CLIENT_URL=https://app.example.com
CORS_ORIGINS=https://app.example.com
```

Frontend build environment:

```env
VITE_API_BASE_URL=/api
VITE_SENTRY_DSN=<frontend-sentry-dsn>
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=<git-sha-or-release>
```

Recommended managed PostgreSQL providers:

- Neon: recommended first choice for low-ops PostgreSQL.
- Supabase: good if you also want dashboard tooling.
- Railway: simple app/database hosting.
- Self-hosted PostgreSQL: acceptable only if backups, patching, and monitoring are owned.

## 3. Database

Do not switch an existing production deployment blindly. Follow [POSTGRES_MIGRATION.md](./POSTGRES_MIGRATION.md) before cutover.

For a fresh production PostgreSQL database after the migration branch is prepared:

```bash
cd backend
npx prisma migrate deploy
npm run migration:check -- --database-url "$DATABASE_URL"
```

For local development with SQLite:

```env
DATABASE_URL="file:./dev.db"
```

```bash
cd backend
npx prisma validate
npm run migration:check
```

## 4. Frontend Build

From repo root:

```bash
VITE_API_BASE_URL=/api npm run build
```

## 5. PM2

From repo root:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

Useful commands:

```bash
pm2 status
pm2 logs zyra-backend
pm2 restart zyra-backend
```

Keep `instances: 1` until PostgreSQL cutover is complete and verified. Cluster mode is a post-cutover optimization, not part of the safe prep step.

## 6. Nginx Reverse Proxy

Example server block:

```nginx
server {
  listen 80;
  server_name app.example.com;

  location / {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Enable HTTPS with Certbot before exposing production traffic.

## 7. Backup And Rollback

Before any database cutover:

```bash
cd backend
npm run migration:export:dry-run
node scripts/export-sqlite-data.js --out ../backups/zyra-sqlite-export.json
cp prisma/dev.db ../backups/dev.db.backup
```

PostgreSQL backup example:

```bash
pg_dump "$DATABASE_URL" > backups/zyra-postgres-$(date +%F).sql
```

Rollback plan:

- Keep the old SQLite DB file untouched.
- Keep the old PM2 process/env available until PostgreSQL verification passes.
- If cutover fails before public traffic is moved, restore the old `DATABASE_URL=file:./prod.db` deployment.
- If cutover fails after traffic is moved, stop writes, preserve PostgreSQL dump, restore SQLite deployment, and reconcile any writes made during the failed window manually.

## 8. Verification

```bash
curl http://127.0.0.1:5000/health
cd backend
npm run prisma:validate
npm run migration:check
npm test
cd ..
npm run build
pm2 logs zyra-backend
```

Sentry verification:

- Leave DSNs empty in normal local development; the app runs with monitoring disabled.
- To test locally, set temporary frontend/backend DSNs and trigger a controlled 500 in a local-only route or test harness.
- Expected 400/401/403/404/413/429 responses are intentionally not sent as Sentry issues.
- Sentry events scrub Authorization headers, cookies, passwords, password hashes, JWTs, reset tokens, email addresses, raw request bodies, AI text, prompt fields, and raw import/financial text fields.
- Do not put Sentry DSNs in source control. Store production DSNs in host secrets or deployment environment variables.

Expected health body:

```json
{"status":"ok","uptime":12.34,"timestamp":"...","environment":"production"}
```

## Notes

- Use PostgreSQL for real multi-user production.
- Keep `CORS_ORIGINS` explicit in production; do not use `*`.
- Use a long random `JWT_SECRET`.
- Verify Resend sender/domain before relying on password reset in production.
- Schedule regular PostgreSQL backups before onboarding users.
