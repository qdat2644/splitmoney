import prisma from '../utils/db.js';
import { clearCopilotCache } from './copilot/copilotEngine.js';
import { invalidateProfileCache } from './intelligence/personalFinanceProfileService.js';

export function invalidateUserFinanceCaches(userIds) {
  const uniqueUserIds = [...new Set((Array.isArray(userIds) ? userIds : [userIds]).filter(Boolean))];
  uniqueUserIds.forEach((userId) => {
    invalidateProfileCache(userId).catch(() => {});
    clearCopilotCache(userId);
  });
}

export async function invalidateRoomFinanceCaches(roomId, db = prisma) {
  if (!roomId) return;
  try {
    const members = await db.roomMember.findMany({
      where: { roomId, status: 'approved' },
      select: { userId: true },
    });
    invalidateUserFinanceCaches(members.map((member) => member.userId));
  } catch {
    // Cache invalidation must never block the primary mutation response.
  }
}
