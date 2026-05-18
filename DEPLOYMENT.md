# Deployment Guide

Target: Ubuntu 22.04 LTS, 1 vCPU, 1 GB RAM, light production load.

## 1. Base setup

```bash
sudo apt update
sudo apt install -y curl git nginx build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

## 2. App setup

```bash
git clone <repo-url> spliteasy
cd spliteasy
npm ci
cd backend
npm ci
cp .env.example .env
```

Edit `backend/.env`:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=file:./prod.db
JWT_SECRET=<long-random-secret>
GEMINI_API_KEY=<gemini-key>
FRONTEND_URL=https://app.example.com
CORS_ORIGINS=https://app.example.com
```

## 3. Database

```bash
cd backend
npx prisma migrate deploy
```

## 4. Frontend build

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
pm2 logs spliteasy-backend
pm2 restart spliteasy-backend
```

## 6. Nginx reverse proxy

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

## 7. Verification

```bash
curl http://127.0.0.1:5000/health
pm2 logs spliteasy-backend
```

Expected health body:

```json
{"status":"ok","uptime":12.34,"timestamp":"...","environment":"production"}
```

## Notes

- Recommended minimum VPS: 1 vCPU, 1 GB RAM, 20 GB SSD.
- Keep the app and database on regular backups.
- Use a long random `JWT_SECRET`.
- Keep `CORS_ORIGINS` explicit in production; do not use `*`.
