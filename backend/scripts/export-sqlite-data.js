import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import dotenv from 'dotenv';

dotenv.config();

const MODELS = [
  ['users', 'user'],
  ['rooms', 'room'],
  ['roomMembers', 'roomMember'],
  ['guestMembers', 'guestMember'],
  ['expenses', 'expense'],
  ['expenseParticipants', 'expenseParticipant'],
  ['payments', 'payment'],
  ['budgets', 'budget'],
  ['plans', 'plan'],
  ['planParticipants', 'planParticipant'],
  ['planExpenses', 'planExpense'],
  ['financialProfiles', 'financialProfile'],
  ['operationalEvents', 'operationalEvent'],
  ['auditTrails', 'auditTrail'],
  ['passwordResetTokens', 'passwordResetToken'],
];

const args = parseArgs(process.argv.slice(2));
if (args.databaseUrl) process.env.DATABASE_URL = args.databaseUrl;

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient(
  process.env.DATABASE_URL ? { datasources: { db: { url: process.env.DATABASE_URL } } } : undefined,
);

try {
  const exportedAt = new Date().toISOString();
  const data = {};
  const counts = {};

  for (const [key, model] of MODELS) {
    const rows = await prisma[model].findMany({ orderBy: { id: 'asc' } });
    data[key] = rows;
    counts[key] = rows.length;
  }

  const payload = {
    exportedAt,
    source: {
      provider: 'sqlite',
      databaseUrl: redactDatabaseUrl(process.env.DATABASE_URL || ''),
    },
    counts,
    data,
  };

  printCounts(counts);

  if (!args.out) {
    console.log('\nDry run complete. No file was written. Pass --out <path> to write a JSON export.');
    process.exitCode = 0;
  } else {
    const outPath = path.resolve(args.out);
    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    console.log(`\nExport written to ${outPath}`);
  }
} finally {
  await prisma.$disconnect();
}

function parseArgs(argv) {
  const parsed = { out: null, databaseUrl: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--out') {
      parsed.out = argv[index + 1];
      index += 1;
    } else if (arg === '--database-url') {
      parsed.databaseUrl = argv[index + 1];
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/export-sqlite-data.js [--database-url <url>] [--out <path>]');
      process.exit(0);
    }
  }
  return parsed;
}

function printCounts(counts) {
  console.log('SQLite export row counts:');
  for (const [key, count] of Object.entries(counts)) {
    console.log(`- ${key}: ${count}`);
  }
}

function redactDatabaseUrl(value) {
  if (!value) return '';
  if (value.startsWith('file:')) return value;
  return value.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@');
}
