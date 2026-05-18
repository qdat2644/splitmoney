// exportService.js — CSV + JSON export for expenses, payments, plans, budgets
import prisma from '../utils/db.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function toCSV(rows, headers) {
  const head = headers.map(escapeCSV).join(',');
  const body = rows.map(r => headers.map(h => escapeCSV(r[h])).join(','));
  return [head, ...body].join('\n');
}

async function assertRoomAccess(roomId, userId) {
  const membership = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!membership || membership.status !== 'approved')
    throw Object.assign(new Error('Bạn cần là thành viên đã duyệt của phòng này.'), { status: 403 });
}

// ── Room export ───────────────────────────────────────────────────────────────

export async function exportRoomData(roomId, userId, format = 'json') {
  await assertRoomAccess(roomId, userId);

  const [expenses, payments] = await Promise.all([
    prisma.expense.findMany({
      where:   { roomId },
      include: {
        participants: true,
        paidByUser:  { select: { id: true, name: true } },
        paidByGuest: { select: { id: true, displayName: true } },
      },
      orderBy: { date: 'desc' },
    }),
    prisma.payment.findMany({
      where:   { roomId },
      include: {
        fromUser:  { select: { id: true, name: true } },
        fromGuest: { select: { id: true, displayName: true } },
        toUser:    { select: { id: true, name: true } },
        toGuest:   { select: { id: true, displayName: true } },
      },
      orderBy: { paidAt: 'desc' },
    }),
  ]);

  if (format === 'csv') {
    const expenseRows = expenses.map(e => ({
      id:          e.id,
      date:        e.date.toISOString().split('T')[0],
      title:       e.title,
      amount:      e.amount,
      category:    e.category,
      splitType:   e.splitType,
      paidBy:      e.paidByUser?.name ?? e.paidByGuest?.displayName ?? '',
      participants: e.participants.length,
      note:        e.note ?? '',
    }));
    const paymentRows = payments.map(p => ({
      id:     p.id,
      date:   p.paidAt.toISOString().split('T')[0],
      from:   p.fromUser?.name ?? p.fromGuest?.displayName ?? '',
      to:     p.toUser?.name   ?? p.toGuest?.displayName   ?? '',
      amount: p.amount,
      note:   p.note ?? '',
    }));
    return {
      expenses: toCSV(expenseRows, ['id','date','title','amount','category','splitType','paidBy','participants','note']),
      payments: toCSV(paymentRows, ['id','date','from','to','amount','note']),
    };
  }

  // JSON format
  return {
    roomId,
    exportedAt: new Date().toISOString(),
    expenses:   expenses.map(e => ({
      id: e.id, date: e.date, title: e.title, amount: e.amount,
      category: e.category, splitType: e.splitType,
      paidBy: e.paidByUser?.name ?? e.paidByGuest?.displayName,
      participants: e.participants.map(p => ({ shareAmount: p.shareAmount })),
      note: e.note,
    })),
    payments: payments.map(p => ({
      id: p.id, paidAt: p.paidAt, amount: p.amount, note: p.note,
      from: p.fromUser?.name ?? p.fromGuest?.displayName,
      to:   p.toUser?.name   ?? p.toGuest?.displayName,
    })),
  };
}

// ── Personal dashboard export ─────────────────────────────────────────────────

export async function exportPersonalData(userId, format = 'json') {
  const memberships     = await prisma.roomMember.findMany({ where: { userId, status: 'approved' }, include: { room: true } });
  const claimedGuests   = await prisma.guestMember.findMany({ where: { claimedByUserId: userId, status: 'claimed' } });
  const claimedGuestIds = claimedGuests.map(g => g.id);
  const roomIds         = memberships.map(m => m.roomId);

  const isMe = (uId, gId) => (uId && uId === userId) || (gId && claimedGuestIds.includes(gId));

  const expenses = await prisma.expense.findMany({
    where:   { roomId: { in: roomIds } },
    include: { participants: true, room: { select: { name: true } } },
    orderBy: { date: 'desc' },
  });

  const budgets  = await prisma.budget.findMany({ where: { userId }, orderBy: [{ year: 'desc' }, { month: 'desc' }] });
  const plans    = await prisma.plan.findMany({ where: { createdByUserId: userId }, include: { expenses: true } });

  const myExpenses = expenses.filter(e => e.participants.some(p => isMe(p.userId, p.guestMemberId)));

  if (format === 'csv') {
    const rows = myExpenses.map(e => {
      const me = e.participants.find(p => isMe(p.userId, p.guestMemberId));
      return {
        date:      e.date.toISOString().split('T')[0],
        room:      e.room.name,
        title:     e.title,
        total:     e.amount,
        myShare:   me?.shareAmount ?? 0,
        category:  e.category,
        splitType: e.splitType,
      };
    });
    return { expenses: toCSV(rows, ['date','room','title','total','myShare','category','splitType']) };
  }

  return {
    userId,
    exportedAt: new Date().toISOString(),
    rooms:    memberships.map(m => ({ id: m.roomId, name: m.room.name, role: m.role })),
    expenses: myExpenses.map(e => {
      const me = e.participants.find(p => isMe(p.userId, p.guestMemberId));
      return { id: e.id, date: e.date, room: e.room.name, title: e.title, amount: e.amount, myShare: me?.shareAmount ?? 0, category: e.category };
    }),
    budgets:  budgets.map(b => ({ category: b.category, amount: b.amount, month: b.month, year: b.year })),
    plans:    plans.map(p => ({ id: p.id, name: p.name, status: p.status, estimatedTotal: p.estimatedTotal })),
  };
}
