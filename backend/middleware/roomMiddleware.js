import prisma from '../utils/db.js';
import { recordOperationalEvent } from '../services/operationalEventService.js';

export const requireRoomMember = async (req, res, next) => {
  const { roomId } = req.params;
  const userId = req.user.userId;

  if (!roomId) return res.status(400).json({ error: 'Thiếu mã phòng.' });

  try {
    const membership = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } }
    });

    if (!membership || membership.status !== 'approved') {
      recordOperationalEvent({
        type: 'security.room_access_denied',
        source: 'security',
        severity: 'warning',
        userId,
        roomId,
        metadata: { reason: membership ? membership.status : 'not_member', path: req.originalUrl },
      }).catch(() => {});
      return res.status(403).json({ error: 'Bạn cần là thành viên đã duyệt của phòng này.' });
    }

    req.roomMember = membership;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Không thể xác minh quyền truy cập phòng.' });
  }
};

export const requireRoomOwner = async (req, res, next) => {
  const { roomId } = req.params;
  const userId = req.user.userId;

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.ownerId !== userId) {
      recordOperationalEvent({
        type: 'security.room_access_denied',
        source: 'security',
        severity: 'warning',
        userId,
        roomId,
        metadata: { reason: 'not_owner', path: req.originalUrl },
      }).catch(() => {});
      return res.status(403).json({ error: 'Chỉ chủ phòng mới có quyền thực hiện thao tác này.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Không thể xác minh quyền chủ phòng.' });
  }
};
