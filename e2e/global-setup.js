import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { assertE2EDatabaseUrl, assertSafeDatabaseUrl } from '../backend/utils/databaseSafety.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');

const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: 'file:./e2e.db',
  JWT_SECRET: 'zyra-e2e-jwt-secret',
  GEMINI_API_KEY: 'disabled-in-e2e',
  RESEND_API_KEY: '',
  SENTRY_DSN: '',
};

const USERS = {
  member: {
    id: 'e2e-user-member',
    name: 'E2E User',
    email: 'e2e.user@zyra.test',
    password: 'Password123!',
    role: 'member',
  },
  friend: {
    id: 'e2e-user-friend',
    name: 'E2E Friend',
    email: 'e2e.friend@zyra.test',
    password: 'Password123!',
    role: 'member',
  },
  admin: {
    id: 'e2e-user-admin',
    name: 'E2E Admin',
    email: 'e2e.admin@zyra.test',
    password: 'Admin123!',
    role: 'admin',
  },
};

const ROOM = {
  id: 'e2e-room-seed',
  name: 'E2E Seed Room',
  code: 'E2E001',
};

async function loadBackendModule(packagePath) {
  const modulePath = path.join(backendDir, 'node_modules', packagePath);
  return import(pathToFileURL(modulePath).href);
}

export default async function globalSetup() {
  assertE2EDatabaseUrl(env.DATABASE_URL);
  assertSafeDatabaseUrl({
    nodeEnv: env.NODE_ENV,
    databaseUrl: env.DATABASE_URL,
    context: 'Playwright global setup',
  });

  const command = process.platform === 'win32'
    ? (process.env.ComSpec || 'cmd.exe')
    : path.join(backendDir, 'node_modules', '.bin', 'prisma');
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', 'npx prisma db push --skip-generate']
    : ['db', 'push', '--skip-generate'];

  execFileSync(command, args, {
    cwd: backendDir,
    env,
    stdio: 'inherit',
  });

  process.env.DATABASE_URL = env.DATABASE_URL;

  const { PrismaClient } = await loadBackendModule('@prisma/client/index.js');
  const bcrypt = await loadBackendModule('bcryptjs/index.js');
  const prisma = new PrismaClient();

  try {
    await resetDatabase(prisma);
    await seedDatabase(prisma, bcrypt);
  } finally {
    await prisma.$disconnect();
  }
}

async function resetDatabase(prisma) {
  await prisma.passwordResetToken.deleteMany();
  await prisma.auditTrail.deleteMany();
  await prisma.operationalEvent.deleteMany();
  await prisma.financialProfile.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.expenseParticipant.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.planExpense.deleteMany();
  await prisma.planParticipant.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.roomMember.deleteMany();
  await prisma.guestMember.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();
}

async function seedDatabase(prisma, bcrypt) {
  const passwordHash = await bcrypt.hash(USERS.member.password, 10);
  const adminPasswordHash = await bcrypt.hash(USERS.admin.password, 10);

  await prisma.user.createMany({
    data: [
      {
        id: USERS.member.id,
        name: USERS.member.name,
        email: USERS.member.email,
        passwordHash,
        role: USERS.member.role,
      },
      {
        id: USERS.friend.id,
        name: USERS.friend.name,
        email: USERS.friend.email,
        passwordHash,
        role: USERS.friend.role,
      },
      {
        id: USERS.admin.id,
        name: USERS.admin.name,
        email: USERS.admin.email,
        passwordHash: adminPasswordHash,
        role: USERS.admin.role,
      },
    ],
  });

  await prisma.room.create({
    data: {
      id: ROOM.id,
      name: ROOM.name,
      code: ROOM.code,
      ownerId: USERS.member.id,
      members: {
        create: [
          { id: 'e2e-room-member-owner', userId: USERS.member.id, role: 'owner', status: 'approved' },
          { id: 'e2e-room-member-friend', userId: USERS.friend.id, role: 'member', status: 'approved' },
        ],
      },
      expenses: {
        create: {
          id: 'e2e-expense-seed',
          title: 'E2E Seed Dinner',
          amount: 120000,
          category: 'food',
          splitType: 'equal',
          paidByUserId: USERS.member.id,
          createdByUserId: USERS.member.id,
          date: new Date(),
          participants: {
            create: [
              { id: 'e2e-expense-participant-member', userId: USERS.member.id, shareAmount: 60000 },
              { id: 'e2e-expense-participant-friend', userId: USERS.friend.id, shareAmount: 60000 },
            ],
          },
        },
      },
    },
  });

  const now = new Date();
  await prisma.budget.create({
    data: {
      id: 'e2e-budget-member-food',
      userId: USERS.member.id,
      roomId: ROOM.id,
      category: 'food',
      amount: 1000000,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    },
  });
}
