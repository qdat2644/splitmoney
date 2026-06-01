import process from 'node:process';
import { computeBalanceMap } from '../utils/settlement.js';

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
const prisma = new PrismaClient();

const failures = [];
const warnings = [];

try {
  const data = await loadData(prisma);
  printCounts(data.counts);

  checkRooms(data);
  checkRoomMembers(data);
  checkGuests(data);
  checkExpenses(data);
  checkExpenseParticipants(data);
  checkPayments(data);
  checkPlans(data);
  checkJsonFields(data);
  checkBudgetDuplicates(data);
  checkSampleRoomZeroSum(data);

  printResults();
  process.exitCode = failures.length > 0 ? 1 : 0;
} finally {
  await prisma.$disconnect();
}

async function loadData(db) {
  const counts = {};
  for (const [key, model] of MODELS) {
    counts[key] = await db[model].count();
  }

  const [
    users,
    rooms,
    roomMembers,
    guestMembers,
    expenses,
    expenseParticipants,
    payments,
    budgets,
    plans,
    planParticipants,
    planExpenses,
    financialProfiles,
    operationalEvents,
    auditTrails,
  ] = await Promise.all([
    db.user.findMany(),
    db.room.findMany(),
    db.roomMember.findMany(),
    db.guestMember.findMany(),
    db.expense.findMany({ include: { participants: true } }),
    db.expenseParticipant.findMany(),
    db.payment.findMany(),
    db.budget.findMany(),
    db.plan.findMany(),
    db.planParticipant.findMany(),
    db.planExpense.findMany(),
    db.financialProfile.findMany(),
    db.operationalEvent.findMany(),
    db.auditTrail.findMany(),
  ]);

  return {
    counts,
    users,
    rooms,
    roomMembers,
    guestMembers,
    expenses,
    expenseParticipants,
    payments,
    budgets,
    plans,
    planParticipants,
    planExpenses,
    financialProfiles,
    operationalEvents,
    auditTrails,
  };
}

function checkRooms({ rooms, users }) {
  const userIds = idSet(users);
  for (const room of rooms) {
    if (!userIds.has(room.ownerId)) fail('room.owner_missing', room.id, `ownerId ${room.ownerId} does not exist`);
  }
}

function checkRoomMembers({ roomMembers, rooms, users, guestMembers }) {
  const roomIds = idSet(rooms);
  const userIds = idSet(users);
  const guestIds = idSet(guestMembers);
  for (const member of roomMembers) {
    if (!roomIds.has(member.roomId)) fail('room_member.room_missing', member.id, `roomId ${member.roomId} does not exist`);
    if (!userIds.has(member.userId)) fail('room_member.user_missing', member.id, `userId ${member.userId} does not exist`);
    if (member.claimGuestMemberId && !guestIds.has(member.claimGuestMemberId)) {
      fail('room_member.claim_guest_missing', member.id, `claimGuestMemberId ${member.claimGuestMemberId} does not exist`);
    }
  }
}

function checkGuests({ guestMembers, rooms, users }) {
  const roomIds = idSet(rooms);
  const userIds = idSet(users);
  for (const guest of guestMembers) {
    if (!roomIds.has(guest.roomId)) fail('guest.room_missing', guest.id, `roomId ${guest.roomId} does not exist`);
    if (!userIds.has(guest.createdByUserId)) fail('guest.creator_missing', guest.id, `createdByUserId ${guest.createdByUserId} does not exist`);
    if (guest.claimedByUserId && !userIds.has(guest.claimedByUserId)) {
      fail('guest.claimed_user_missing', guest.id, `claimedByUserId ${guest.claimedByUserId} does not exist`);
    }
  }
}

function checkExpenses({ expenses, rooms, users, guestMembers }) {
  const roomIds = idSet(rooms);
  const userIds = idSet(users);
  const guestIds = idSet(guestMembers);
  for (const expense of expenses) {
    if (!roomIds.has(expense.roomId)) fail('expense.room_missing', expense.id, `roomId ${expense.roomId} does not exist`);
    if (!userIds.has(expense.createdByUserId)) fail('expense.creator_missing', expense.id, `createdByUserId ${expense.createdByUserId} does not exist`);
    if (expense.paidByUserId && !userIds.has(expense.paidByUserId)) fail('expense.payer_user_missing', expense.id, `paidByUserId ${expense.paidByUserId} does not exist`);
    if (expense.paidByGuestMemberId && !guestIds.has(expense.paidByGuestMemberId)) fail('expense.payer_guest_missing', expense.id, `paidByGuestMemberId ${expense.paidByGuestMemberId} does not exist`);
    if (!expense.paidByUserId && !expense.paidByGuestMemberId) fail('expense.payer_missing', expense.id, 'expense has no payer');
  }
}

function checkExpenseParticipants({ expenseParticipants, expenses, users, guestMembers }) {
  const expenseIds = idSet(expenses);
  const userIds = idSet(users);
  const guestIds = idSet(guestMembers);
  for (const participant of expenseParticipants) {
    if (!expenseIds.has(participant.expenseId)) fail('expense_participant.expense_missing', participant.id, `expenseId ${participant.expenseId} does not exist`);
    if (!participant.userId && !participant.guestMemberId) fail('expense_participant.identity_missing', participant.id, 'participant has no user or guest identity');
    if (participant.userId && !userIds.has(participant.userId)) fail('expense_participant.user_missing', participant.id, `userId ${participant.userId} does not exist`);
    if (participant.guestMemberId && !guestIds.has(participant.guestMemberId)) fail('expense_participant.guest_missing', participant.id, `guestMemberId ${participant.guestMemberId} does not exist`);
  }
}

function checkPayments({ payments, rooms, users, guestMembers }) {
  const roomIds = idSet(rooms);
  const userIds = idSet(users);
  const guestIds = idSet(guestMembers);
  for (const payment of payments) {
    if (!roomIds.has(payment.roomId)) fail('payment.room_missing', payment.id, `roomId ${payment.roomId} does not exist`);
    if (!userIds.has(payment.createdByUserId)) fail('payment.creator_missing', payment.id, `createdByUserId ${payment.createdByUserId} does not exist`);
    checkPaymentIdentity(payment, 'from', userIds, guestIds);
    checkPaymentIdentity(payment, 'to', userIds, guestIds);
  }
}

function checkPaymentIdentity(payment, side, userIds, guestIds) {
  const userKey = `${side}UserId`;
  const guestKey = `${side}GuestMemberId`;
  if (!payment[userKey] && !payment[guestKey]) fail(`payment.${side}_missing`, payment.id, `${side} identity is missing`);
  if (payment[userKey] && !userIds.has(payment[userKey])) fail(`payment.${side}_user_missing`, payment.id, `${userKey} ${payment[userKey]} does not exist`);
  if (payment[guestKey] && !guestIds.has(payment[guestKey])) fail(`payment.${side}_guest_missing`, payment.id, `${guestKey} ${payment[guestKey]} does not exist`);
}

function checkPlans({ plans, planParticipants, planExpenses, rooms, users, guestMembers }) {
  const planIds = idSet(plans);
  const roomIds = idSet(rooms);
  const userIds = idSet(users);
  const guestIds = idSet(guestMembers);

  for (const plan of plans) {
    if (plan.roomId && !roomIds.has(plan.roomId)) fail('plan.room_missing', plan.id, `roomId ${plan.roomId} does not exist`);
    if (!userIds.has(plan.createdByUserId)) fail('plan.creator_missing', plan.id, `createdByUserId ${plan.createdByUserId} does not exist`);
  }
  for (const participant of planParticipants) {
    if (!planIds.has(participant.planId)) fail('plan_participant.plan_missing', participant.id, `planId ${participant.planId} does not exist`);
    if (participant.userId && !userIds.has(participant.userId)) fail('plan_participant.user_missing', participant.id, `userId ${participant.userId} does not exist`);
    if (participant.guestMemberId && !guestIds.has(participant.guestMemberId)) fail('plan_participant.guest_missing', participant.id, `guestMemberId ${participant.guestMemberId} does not exist`);
  }
  for (const expense of planExpenses) {
    if (!planIds.has(expense.planId)) fail('plan_expense.plan_missing', expense.id, `planId ${expense.planId} does not exist`);
  }
}

function checkJsonFields({ planExpenses, financialProfiles, operationalEvents, auditTrails }) {
  for (const row of planExpenses) checkJson('plan_expense.participants_json', row.id, row.participants);
  for (const row of financialProfiles) checkJson('financial_profile.profile_json', row.id, row.profileData);
  for (const row of operationalEvents) checkJson('operational_event.metadata_json', row.id, row.metadata, { optional: true });
  for (const row of auditTrails) checkJson('audit_trail.metadata_json', row.id, row.metadata, { optional: true });
}

function checkJson(type, id, value, { optional = false } = {}) {
  if ((value === null || value === undefined || value === '') && optional) return;
  try {
    JSON.parse(value);
  } catch (error) {
    fail(type, id, `invalid JSON: ${error.message}`);
  }
}

function checkBudgetDuplicates({ budgets }) {
  const groups = new Map();
  for (const budget of budgets) {
    const key = [
      budget.userId,
      budget.roomId || '<overall>',
      budget.category || '<overall>',
      budget.month,
      budget.year,
    ].join('|');
    const next = groups.get(key) || [];
    next.push(budget.id);
    groups.set(key, next);
  }
  for (const [key, ids] of groups.entries()) {
    if (ids.length > 1) warn('budget.duplicate_scope', key, `duplicate budget ids: ${ids.join(', ')}`);
  }
}

function checkSampleRoomZeroSum({ rooms, roomMembers, guestMembers, expenses, payments }) {
  const sampleRooms = rooms.slice(0, 10);
  for (const room of sampleRooms) {
    const memberIds = [
      ...roomMembers.filter((member) => member.roomId === room.id && member.status === 'approved').map((member) => `user:${member.userId}`),
      ...guestMembers.filter((guest) => guest.roomId === room.id && guest.status !== 'removed').map((guest) => `guest:${guest.id}`),
    ];
    const roomExpenses = expenses
      .filter((expense) => expense.roomId === room.id)
      .map((expense) => ({
        paidById: expense.paidByUserId ? `user:${expense.paidByUserId}` : `guest:${expense.paidByGuestMemberId}`,
        amount: expense.amount,
        participants: expense.participants.map((participant) => ({
          id: participant.userId ? `user:${participant.userId}` : `guest:${participant.guestMemberId}`,
          shareAmount: participant.shareAmount,
        })),
      }));
    const roomPayments = payments
      .filter((payment) => payment.roomId === room.id)
      .map((payment) => ({
        id: payment.id,
        fromId: payment.fromUserId ? `user:${payment.fromUserId}` : `guest:${payment.fromGuestMemberId}`,
        toId: payment.toUserId ? `user:${payment.toUserId}` : `guest:${payment.toGuestMemberId}`,
        amount: payment.amount,
      }));
    const balances = computeBalanceMap(memberIds, roomExpenses, roomPayments);
    const sum = Object.values(balances).reduce((total, value) => total + value, 0);
    if (Math.abs(Math.round(sum)) > 1) fail('room.zero_sum', room.id, `balance sum is ${sum}`);
  }
}

function idSet(rows) {
  return new Set(rows.map((row) => row.id));
}

function fail(type, id, message) {
  failures.push({ type, id, message });
}

function warn(type, id, message) {
  warnings.push({ type, id, message });
}

function printCounts(counts) {
  console.log('Data integrity row counts:');
  for (const [key, count] of Object.entries(counts)) console.log(`- ${key}: ${count}`);
}

function printResults() {
  if (warnings.length > 0) {
    console.log('\nWarnings:');
    for (const item of warnings) console.log(`- ${item.type} ${item.id}: ${item.message}`);
  }
  if (failures.length > 0) {
    console.error('\nFailures:');
    for (const item of failures) console.error(`- ${item.type} ${item.id}: ${item.message}`);
    return;
  }
  console.log('\nIntegrity check passed.');
}

function parseArgs(argv) {
  const parsed = { databaseUrl: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--database-url') {
      parsed.databaseUrl = argv[index + 1];
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: node scripts/check-data-integrity.js [--database-url <url>]');
      process.exit(0);
    }
  }
  return parsed;
}
