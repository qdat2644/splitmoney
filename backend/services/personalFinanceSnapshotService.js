import prisma from '../utils/db.js';

export async function buildPersonalFinanceSnapshot(userId, { startDate } = {}) {
  const memberships = await prisma.roomMember.findMany({
    where: { userId, status: 'approved' },
    include: { room: { select: { id: true, name: true } } },
  });

  const roomIds = memberships.map((membership) => membership.room.id);
  const claimedGuests = await prisma.guestMember.findMany({
    where: { claimedByUserId: userId, status: 'claimed' },
  });
  const claimedGuestIds = claimedGuests.map((guest) => guest.id);
  const isMe = (userRef, guestRef) =>
    (userRef && userRef === userId) ||
    (guestRef && claimedGuestIds.includes(guestRef));

  if (roomIds.length === 0) {
    return { memberships, roomIds, claimedGuestIds, allExpenses: [], allPayments: [], myExpenses: [], isMe };
  }

  const [allExpenses, allPayments] = await Promise.all([
    prisma.expense.findMany({
      where: {
        roomId: { in: roomIds },
        ...(startDate ? { date: { gte: startDate } } : {}),
      },
      include: { participants: true, room: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    }),
    prisma.payment.findMany({
      where: {
        roomId: { in: roomIds },
        ...(startDate ? { paidAt: { gte: startDate } } : {}),
      },
    }),
  ]);

  const myExpenses = allExpenses.filter((expense) =>
    isMe(expense.paidByUserId, expense.paidByGuestMemberId) ||
    expense.participants.some((participant) => isMe(participant.userId, participant.guestMemberId))
  );

  return { memberships, roomIds, claimedGuestIds, allExpenses, allPayments, myExpenses, isMe };
}
