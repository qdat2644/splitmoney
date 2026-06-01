import { PrismaClient } from '@prisma/client';
import { assertSafeDatabaseUrl } from './databaseSafety.js';

assertSafeDatabaseUrl({ context: 'PrismaClient' });

const globalForPrisma = globalThis;
const prisma = globalForPrisma.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

export default prisma;
