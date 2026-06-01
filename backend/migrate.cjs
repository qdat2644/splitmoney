const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient(
  process.env.DATABASE_URL ? { datasources: { db: { url: process.env.DATABASE_URL } } } : undefined,
);

async function run() {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE PlanParticipant ADD COLUMN displayName TEXT');
  } catch(e) { console.log(e.message); }
  
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE PlanParticipant ADD COLUMN type TEXT DEFAULT "user"');
  } catch(e) { console.log(e.message); }
  
  console.log('Done');
}

run().finally(() => prisma.$disconnect());
