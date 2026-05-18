import prisma from '../utils/db.js';
import { resolveShares } from '../utils/settlement.js';
import { invalidateProfileCache } from './intelligence/personalFinanceProfileService.js';

export async function getRoomIdentities(roomId, db = prisma) {
  const [roomMembers, guestMembers] = await Promise.all([
    db.roomMember.findMany({ where: { roomId, status: 'approved' } }),
    db.guestMember.findMany({ where: { roomId, status: { not: 'removed' } } }),
  ]);

  return {
    validUserIds: new Set(roomMembers.map((member) => member.userId)),
    validGuestIds: new Set(guestMembers.map((guest) => guest.id)),
  };
}

export function buildParticipantRows(participants, amount, splitType, validUserIds, validGuestIds) {
  for (const participant of participants) {
    if (participant.userId && !validUserIds.has(participant.userId)) {
      throw httpError('Người tham gia không thuộc phòng này.', 400);
    }
    if (participant.guestMemberId && !validGuestIds.has(participant.guestMemberId)) {
      throw httpError('Khách tham gia không thuộc phòng này.', 400);
    }
  }

  return resolveShares(amount, splitType, participants).map((participant) => ({
    userId: participant.userId || null,
    guestMemberId: participant.guestMemberId || null,
    shareAmount: participant.shareAmount,
  }));
}

export async function createExpenseForRoom({
  roomId,
  createdByUserId,
  title,
  amount,
  category,
  note,
  splitType = 'equal',
  paidByUserId,
  paidByGuestMemberId,
  date,
  participants,
}, db = prisma) {
  if (!title?.trim()) throw httpError('Vui lòng nhập tên khoản chi.', 400);
  if (!paidByUserId && !paidByGuestMemberId) throw httpError('Vui lòng chọn người trả.', 400);
  if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
    throw httpError('Số tiền không hợp lệ.', 400);
  }
  if (!Array.isArray(participants) || participants.length === 0) {
    throw httpError('Cần có ít nhất một người tham gia.', 400);
  }

  const { validUserIds, validGuestIds } = await getRoomIdentities(roomId, db);
  if (paidByUserId && !validUserIds.has(paidByUserId)) throw httpError('Người trả không thuộc phòng này.', 400);
  if (paidByGuestMemberId && !validGuestIds.has(paidByGuestMemberId)) throw httpError('Khách trả tiền không hợp lệ.', 400);

  const participantRows = buildParticipantRows(participants, amount, splitType, validUserIds, validGuestIds);
  const expense = await db.expense.create({
    data: {
      roomId,
      title: title.trim(),
      amount,
      category: category || 'other',
      note: note || null,
      splitType,
      paidByUserId: paidByUserId || null,
      paidByGuestMemberId: paidByGuestMemberId || null,
      createdByUserId,
      date: date ? new Date(date) : new Date(),
      participants: { create: participantRows },
    },
    include: { participants: true },
  });

  if (paidByUserId) invalidateProfileCache(paidByUserId).catch(() => {});
  participants.forEach((participant) => {
    if (participant.userId) invalidateProfileCache(participant.userId).catch(() => {});
  });

  return expense;
}

function httpError(message, status) {
  return Object.assign(new Error(message), { status });
}
