import prisma from '../utils/db.js';

export const requireRoomMember = async (req, res, next) => {
  const { roomId } = req.params;
  const userId = req.user.userId;

  if (!roomId) return res.status(400).json({ error: 'Thiếu mã phòng.' });

  try {
    const membership = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } }
    });

    if (!membership || membership.status !== 'approved') {
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
      return res.status(403).json({ error: 'Chỉ chủ phòng mới có quyền thực hiện thao tác này.' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Không thể xác minh quyền chủ phòng.' });
  }
};
