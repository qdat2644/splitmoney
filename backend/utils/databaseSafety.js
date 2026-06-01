import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');
const prismaDir = path.join(backendDir, 'prisma');
const devDbPath = path.join(prismaDir, 'dev.db');

export function normalizeDatabaseUrl(databaseUrl, baseDir = prismaDir) {
  const value = String(databaseUrl || '').trim().replace(/^['"]|['"]$/g, '');
  if (!value) return '';
  if (!value.startsWith('file:')) return value;

  const filePath = value.slice('file:'.length);
  if (!filePath) return value;

  return path.resolve(baseDir, filePath);
}

export function isDevDatabaseUrl(databaseUrl, baseDir = prismaDir) {
  const raw = String(databaseUrl || '').trim().replace(/^['"]|['"]$/g, '');
  if (!raw) return false;
  if (/dev\.db/i.test(raw)) return true;

  const normalized = normalizeDatabaseUrl(raw, baseDir);
  return normalized === devDbPath || path.basename(normalized).toLowerCase() === 'dev.db';
}

export function assertSafeDatabaseUrl({
  databaseUrl = process.env.DATABASE_URL,
  nodeEnv = process.env.NODE_ENV,
  context = 'database',
  baseDir = prismaDir,
} = {}) {
  if (nodeEnv === 'test' && isDevDatabaseUrl(databaseUrl, baseDir)) {
    throw new Error(
      `${context} safety guard: NODE_ENV=test must never use backend/prisma/dev.db. ` +
      'Use DATABASE_URL="file:./e2e.db" or another disposable test database.',
    );
  }
}

export function assertE2EDatabaseUrl(databaseUrl = process.env.DATABASE_URL) {
  if (isDevDatabaseUrl(databaseUrl)) {
    throw new Error(
      'E2E safety guard: refusing to run with DATABASE_URL pointing at dev.db. ' +
      'E2E must use backend/prisma/e2e.db or a disposable temp database.',
    );
  }
}
