// paymentService.js
// All DB operations for the Payment ledger.
// Handles: create, list, delete, and payment formatting.

import prisma from '../utils/db.js';

// ── Identity helpers ──────────────────────────────────────────────────────────

/** Resolve human-readable name + type for one side of a payment */
function resolveIdentity(userId, guestId, userRecord, guestRecord) {
  if (userId && userRecord)  return { type: 'user',  id: userId,  name: userRecord.name };
  if (guestId && guestRecord) return { type: 'guest', id: guestId, name: guestRecord.displayName };
  return { type: 'unknown', id: null, name: '?' };
}

/** Format a raw Prisma Payment row into the public API shape */
function formatPayment(p) {
  return {
    id:     p.id,
    roomId: p.roomId,
    from:   resolveIdentity(p.fromUserId,  p.fromGuestMemberId, p.fromUser,  p.fromGuest),
    to:     resolveIdentity(p.toUserId,    p.toGuestMemberId,   p.toUser,    p.toGuest),
    amount: p.amount,
    note:   p.note ?? null,
    paidAt: p.paidAt.toISOString(),
    createdAt: p.createdAt.toISOString(),
    createdByUserId: p.createdByUserId,
  };
}

const PAYMENT_INCLUDE = {
  fromUser:  { select: { id: true, name: true } },
  fromGuest: { select: { id: true, displayName: true } },
  toUser:    { select: { id: true, name: true } },
  toGuest:   { select: { id: true, displayName: true } },
};

// ── List ──────────────────────────────────────────────────────────────────────

export async function listPayments(roomId) {
  const payments = await prisma.payment.findMany({
    where:   { roomId },
    include: PAYMENT_INCLUDE,
    orderBy: { paidAt: 'desc' },
  });
  return payments.map(formatPayment);
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createPayment(roomId, body, createdByUserId) {
  const { fromUserId, fromGuestMemberId, toUserId, toGuestMemberId, amount, note, paidAt } = body;

  // ── Validation ──────────────────────────────────────────────────────────────

  // Exactly one payer identity
  const payerCount = [fromUserId, fromGuestMemberId].filter(Boolean).length;
  if (payerCount !== 1) {
    throw Object.assign(new Error('Phải chỉ định đúng một người trả (user hoặc guest).'), { status: 400 });
  }
  // Exactly one receiver identity
  const receiverCount = [toUserId, toGuestMemberId].filter(Boolean).length;
  if (receiverCount !== 1) {
    throw Object.assign(new Error('Phải chỉ định đúng một người nhận (user hoặc guest).'), { status: 400 });
  }
  // amount > 0
  if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
    throw Object.assign(new Error('Số tiền phải lớn hơn 0.'), { status: 400 });
  }
  // payer != receiver (same type + same id)
  if (fromUserId  && fromUserId  === toUserId)  throw Object.assign(new Error('Người trả và nhận không được giống nhau.'), { status: 400 });
  if (fromGuestMemberId && fromGuestMemberId === toGuestMemberId) throw Object.assign(new Error('Người trả và nhận không được giống nhau.'), { status: 400 });

  // ── Room membership validation ──────────────────────────────────────────────
  const approvedMembers = await prisma.roomMember.findMany({ where: { roomId, status: 'approved' } });
  const activeGuests    = await prisma.guestMember.findMany({ where: { roomId, status: { not: 'removed' } } });
  const validUserIds    = new Set(approvedMembers.map(m => m.userId));
  const validGuestIds   = new Set(activeGuests.map(g => g.id));

  if (fromUserId        && !validUserIds.has(fromUserId))        throw Object.assign(new Error('Người trả không thuộc phòng này.'),  { status: 400 });
  if (fromGuestMemberId && !validGuestIds.has(fromGuestMemberId)) throw Object.assign(new Error('Guest người trả không hợp lệ.'),    { status: 400 });
  if (toUserId          && !validUserIds.has(toUserId))          throw Object.assign(new Error('Người nhận không thuộc phòng này.'), { status: 400 });
  if (toGuestMemberId   && !validGuestIds.has(toGuestMemberId))   throw Object.assign(new Error('Guest người nhận không hợp lệ.'),   { status: 400 });

  // ── Persist ─────────────────────────────────────────────────────────────────
  const payment = await prisma.payment.create({
    data: {
      roomId,
      fromUserId:        fromUserId        || null,
      fromGuestMemberId: fromGuestMemberId || null,
      toUserId:          toUserId          || null,
      toGuestMemberId:   toGuestMemberId   || null,
      amount,
      note:   note   || null,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      createdByUserId,
    },
    include: PAYMENT_INCLUDE,
  });

  return formatPayment(payment);
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deletePayment(paymentId, roomId, requesterId, requesterRole) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.roomId !== roomId) {
    throw Object.assign(new Error('Không tìm thấy thanh toán.'), { status: 404 });
  }
  // Only creator or room owner can delete
  if (payment.createdByUserId !== requesterId && requesterRole !== 'owner') {
    throw Object.assign(new Error('Bạn không có quyền xoá thanh toán này.'), { status: 403 });
  }
  await prisma.payment.delete({ where: { id: paymentId } });
  return { success: true };
}
