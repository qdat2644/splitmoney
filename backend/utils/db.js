import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { assertSafeDatabaseUrl } from './databaseSafety.js';

dotenv.config();
assertSafeDatabaseUrl({ context: 'PrismaClient' });

const globalForPrisma = globalThis;
const prismaOptions = process.env.DATABASE_URL
  ? { datasources: { db: { url: process.env.DATABASE_URL } } }
  : undefined;
const prisma = globalForPrisma.__prisma ?? new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

export default prisma;
