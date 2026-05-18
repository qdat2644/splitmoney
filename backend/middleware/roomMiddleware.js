import prisma from '../utils/db.js';

export const requireRoomMember = async (req, res, next) => {
  const { roomId } = req.params;
  const userId = req.user.userId;

  if (!roomId) return res.status(400).json({ error: 'Room ID required' });

  try {
    const membership = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId } }
    });

    if (!membership || membership.status !== 'approved') {
      return res.status(403).json({ error: 'Access denied: Must be an approved member of this room' });
    }

    req.roomMember = membership;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error verifying room membership' });
  }
};

export const requireRoomOwner = async (req, res, next) => {
  const { roomId } = req.params;
  const userId = req.user.userId;

  try {
    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (!room || room.ownerId !== userId) {
      return res.status(403).json({ error: 'Access denied: Room owner only' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server error verifying room ownership' });
  }
};
