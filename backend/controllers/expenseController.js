// expenseController.js — Handles expense CRUD with unified split type support
import prisma from '../utils/db.js';
import { resolveShares } from '../utils/settlement.js';
import { invalidateProfileCache } from '../services/intelligence/personalFinanceProfileService.js';

// ── Room identity helpers ─────────────────────────────────────────────────────

async function getRoomIdentities(roomId) {
  const [roomMembers, guestMembers] = await Promise.all([
    prisma.roomMember.findMany({ where: { roomId, status: 'approved' } }),
    prisma.guestMember.findMany({ where: { roomId, status: { not: 'removed' } } }),
  ]);
  return {
    validUserIds:  new Set(roomMembers.map(m => m.userId)),
    validGuestIds: new Set(guestMembers.map(g => g.id)),
  };
}

// ── Participant resolution ────────────────────────────────────────────────────

/**
 * Convert raw frontend participant list into validated DB rows using canonical share amounts.
 * Supports equal | exact | percentage split types.
 */
function buildParticipantRows(participants, amount, splitType, validUserIds, validGuestIds) {
  // Validate identities
  for (const p of participants) {
    if (p.userId      && !validUserIds.has(p.userId))      throw Object.assign(new Error('Participant user not in room'), { status: 400 });
    if (p.guestMemberId && !validGuestIds.has(p.guestMemberId)) throw Object.assign(new Error('Participant guest not in room'), { status: 400 });
  }

  // Resolve shares using canonical engine
  const withShares = resolveShares(amount, splitType, participants);

  return withShares.map(p => ({
    userId:        p.userId        || null,
    guestMemberId: p.guestMemberId || null,
    shareAmount:   p.shareAmount,
  }));
}

// ── GET /expenses ─────────────────────────────────────────────────────────────

export const getExpenses = async (req, res) => {
  try {
    const { roomId } = req.params;
    const expenses = await prisma.expense.findMany({
      where: { roomId },
      include: {
        participants: true,
        paidByUser:  { select: { id: true, name: true } },
        paidByGuest: { select: { id: true, displayName: true } },
      },
      orderBy: { date: 'desc' },
    });
    res.json({ expenses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── POST /expenses ────────────────────────────────────────────────────────────

export const addExpense = async (req, res) => {
  try {
    const { roomId } = req.params;
    const {
      title, amount, category, note,
      splitType = 'equal',
      paidByUserId, paidByGuestMemberId,
      date, participants,
    } = req.body;
    const createdByUserId = req.user.userId;

    // Basic validation
    if (!paidByUserId && !paidByGuestMemberId)
      return res.status(400).json({ error: 'Must specify a payer' });
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0)
      return res.status(400).json({ error: 'Invalid amount' });
    if (!participants || participants.length === 0)
      return res.status(400).json({ error: 'Must have at least one participant' });

    const { validUserIds, validGuestIds } = await getRoomIdentities(roomId);

    if (paidByUserId        && !validUserIds.has(paidByUserId))        return res.status(400).json({ error: 'Invalid payer (not in room)' });
    if (paidByGuestMemberId && !validGuestIds.has(paidByGuestMemberId)) return res.status(400).json({ error: 'Invalid guest payer' });

    let participantRows;
    try {
      participantRows = buildParticipantRows(participants, amount, splitType, validUserIds, validGuestIds);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const expense = await prisma.expense.create({
      data: {
        roomId,
        title,
        amount,
        category: category || 'other',
        note:     note     || null,
        splitType,
        paidByUserId:        paidByUserId        || null,
        paidByGuestMemberId: paidByGuestMemberId || null,
        createdByUserId,
        date: new Date(date),
        participants: { create: participantRows },
      },
      include: { participants: true },
    });

    if (paidByUserId) invalidateProfileCache(paidByUserId).catch(() => {});
    participants.forEach(p => {
      if (p.userId) invalidateProfileCache(p.userId).catch(() => {});
    });

    res.status(201).json({ expense });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── PUT /expenses/:expenseId ──────────────────────────────────────────────────

export const updateExpense = async (req, res) => {
  try {
    const { roomId, expenseId } = req.params;
    const {
      title, amount, category, note,
      splitType = 'equal',
      paidByUserId, paidByGuestMemberId,
      date, participants,
    } = req.body;

    const existingExpense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!existingExpense || existingExpense.roomId !== roomId)
      return res.status(404).json({ error: 'Expense not found' });
    if (!paidByUserId && !paidByGuestMemberId)
      return res.status(400).json({ error: 'Must specify a payer' });
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0)
      return res.status(400).json({ error: 'Invalid amount' });
    if (!participants || participants.length === 0)
      return res.status(400).json({ error: 'Must have at least one participant' });

    const { validUserIds, validGuestIds } = await getRoomIdentities(roomId);

    if (paidByUserId        && !validUserIds.has(paidByUserId))        return res.status(400).json({ error: 'Invalid payer' });
    if (paidByGuestMemberId && !validGuestIds.has(paidByGuestMemberId)) return res.status(400).json({ error: 'Invalid guest payer' });

    let participantRows;
    try {
      participantRows = buildParticipantRows(participants, amount, splitType, validUserIds, validGuestIds);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    await prisma.expenseParticipant.deleteMany({ where: { expenseId } });

    const expense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        title,
        amount,
        category: category || 'other',
        note:     note     || null,
        splitType,
        paidByUserId:        paidByUserId        || null,
        paidByGuestMemberId: paidByGuestMemberId || null,
        date: date ? new Date(date) : undefined,
        participants: { create: participantRows },
      },
      include: { participants: true },
    });

    if (paidByUserId) invalidateProfileCache(paidByUserId).catch(() => {});
    participants.forEach(p => {
      if (p.userId) invalidateProfileCache(p.userId).catch(() => {});
    });

    res.json({ expense });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ── DELETE /expenses/:expenseId ───────────────────────────────────────────────

export const deleteExpense = async (req, res) => {
  try {
    const { roomId, expenseId } = req.params;
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { participants: true }
    });
    if (!expense || expense.roomId !== roomId)
      return res.status(404).json({ error: 'Expense not found' });

    await prisma.expense.delete({ where: { id: expenseId } });

    if (expense) {
      if (expense.paidByUserId) invalidateProfileCache(expense.paidByUserId).catch(() => {});
      expense.participants.forEach(p => {
        if (p.userId) invalidateProfileCache(p.userId).catch(() => {});
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
