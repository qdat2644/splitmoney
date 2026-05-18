// expenseController.js - Handles expense CRUD with unified split type support
import prisma from '../utils/db.js';
import { invalidateProfileCache } from '../services/intelligence/personalFinanceProfileService.js';
import {
  buildParticipantRows,
  createExpenseForRoom,
  getRoomIdentities,
} from '../services/expenseWriteService.js';

export const getExpenses = async (req, res) => {
  try {
    const { roomId } = req.params;
    const expenses = await prisma.expense.findMany({
      where: { roomId },
      include: {
        participants: true,
        paidByUser: { select: { id: true, name: true } },
        paidByGuest: { select: { id: true, displayName: true } },
      },
      orderBy: { date: 'desc' },
    });
    res.json({ expenses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const addExpense = async (req, res) => {
  try {
    const { roomId } = req.params;
    const expense = await createExpenseForRoom({
      roomId,
      createdByUserId: req.user.userId,
      ...req.body,
    });
    res.status(201).json({ expense });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.status ? error.message : 'Không thể tạo khoản chi lúc này.',
    });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const { roomId, expenseId } = req.params;
    const {
      title,
      amount,
      category,
      note,
      splitType = 'equal',
      paidByUserId,
      paidByGuestMemberId,
      date,
      participants,
    } = req.body;

    const existingExpense = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!existingExpense || existingExpense.roomId !== roomId) {
      return res.status(404).json({ error: 'Không tìm thấy khoản chi.' });
    }
    if (!paidByUserId && !paidByGuestMemberId) return res.status(400).json({ error: 'Vui lòng chọn người trả.' });
    if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
      return res.status(400).json({ error: 'Số tiền không hợp lệ.' });
    }
    if (!participants || participants.length === 0) {
      return res.status(400).json({ error: 'Cần có ít nhất một người tham gia.' });
    }

    const { validUserIds, validGuestIds } = await getRoomIdentities(roomId);
    if (paidByUserId && !validUserIds.has(paidByUserId)) return res.status(400).json({ error: 'Người trả không hợp lệ.' });
    if (paidByGuestMemberId && !validGuestIds.has(paidByGuestMemberId)) {
      return res.status(400).json({ error: 'Khách trả tiền không hợp lệ.' });
    }

    let participantRows;
    try {
      participantRows = buildParticipantRows(participants, amount, splitType, validUserIds, validGuestIds);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    await prisma.expenseParticipant.deleteMany({ where: { expenseId } });
    const expense = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        title,
        amount,
        category: category || 'other',
        note: note || null,
        splitType,
        paidByUserId: paidByUserId || null,
        paidByGuestMemberId: paidByGuestMemberId || null,
        date: date ? new Date(date) : undefined,
        participants: { create: participantRows },
      },
      include: { participants: true },
    });

    if (paidByUserId) invalidateProfileCache(paidByUserId).catch(() => {});
    participants.forEach((participant) => {
      if (participant.userId) invalidateProfileCache(participant.userId).catch(() => {});
    });

    res.json({ expense });
  } catch (error) {
    res.status(500).json({ error: 'Không thể cập nhật khoản chi lúc này.' });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const { roomId, expenseId } = req.params;
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      include: { participants: true },
    });
    if (!expense || expense.roomId !== roomId) return res.status(404).json({ error: 'Không tìm thấy khoản chi.' });

    await prisma.expense.delete({ where: { id: expenseId } });
    if (expense.paidByUserId) invalidateProfileCache(expense.paidByUserId).catch(() => {});
    expense.participants.forEach((participant) => {
      if (participant.userId) invalidateProfileCache(participant.userId).catch(() => {});
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Không thể xoá khoản chi lúc này.' });
  }
};
