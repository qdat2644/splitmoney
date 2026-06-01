import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { normalizeDatabaseUrl } from '../utils/databaseSafety.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');
const prismaDir = path.join(backendDir, 'prisma');
const databaseUrl = process.env.DATABASE_URL || '';
const resolvedPath = normalizeDatabaseUrl(databaseUrl, prismaDir);

console.log(`cwd=${process.cwd()}`);
console.log(`DATABASE_URL=${databaseUrl || '<undefined>'}`);
console.log(`resolved_sqlite_path=${resolvedPath || '<non-file-or-empty>'}`);

if (resolvedPath && databaseUrl.trim().startsWith('file:')) {
  try {
    const sqlite = new DatabaseSync(resolvedPath, { readOnly: true });
    const row = sqlite.prepare('SELECT COUNT(*) AS count FROM User').get();
    const first = sqlite.prepare('SELECT email FROM User ORDER BY email LIMIT 1').get();
    console.log(`sqlite_user_count=${row.count}`);
    console.log(`sqlite_first_user=${first?.email || '<none>'}`);
    sqlite.close();
  } catch (error) {
    console.log(`sqlite_error=${error.message}`);
  }
}

const prisma = new PrismaClient(
  databaseUrl ? { datasources: { db: { url: databaseUrl } } } : undefined,
);
try {
  const count = await prisma.user.count();
  const first = await prisma.user.findFirst({ orderBy: { email: 'asc' }, select: { email: true } });
  console.log(`prisma_user_count=${count}`);
  console.log(`prisma_first_user=${first?.email || '<none>'}`);
} finally {
  await prisma.$disconnect();
}
