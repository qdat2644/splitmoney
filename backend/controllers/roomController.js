import prisma from '../utils/db.js';
import crypto from 'crypto';

export const createRoom = async (req, res) => {
  try {
    const { name } = req.body;
    const ownerId = req.user.userId;
    
    let code;
    let room;
    let attempts = 0;
    while (attempts < 5) {
      code = crypto.randomBytes(3).toString('hex').toUpperCase();
      try {
        room = await prisma.room.create({
          data: {
            name,
            code,
            ownerId,
            members: {
              create: { userId: ownerId, role: 'owner', status: 'approved' }
            }
          }
        });
        break;
      } catch (e) {
        if (e.code === 'P2002' && e.meta?.target?.includes('code')) {
          attempts++;
        } else {
          throw e;
        }
      }
    }

    if (!room) {
      return res.status(500).json({ error: 'Failed to generate a unique room code. Please try again.' });
    }

    res.status(201).json({ room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRooms = async (req, res) => {
  try {
    const userId = req.user.userId;
    const memberships = await prisma.roomMember.findMany({
      where: { userId },
      include: { room: true }
    });
    res.json({ memberships });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { members: { include: { user: { select: { id: true, name: true } } } } }
    });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json({ room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRoomGuestsByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) return res.status(404).json({ error: 'Room not found' });
    
    // Only return unclaimed active guests
    const guests = await prisma.guestMember.findMany({
      where: { roomId: room.id, status: 'active', claimedByUserId: null },
      select: { id: true, displayName: true }
    });
    
    res.json({ guests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { code, claimGuestMemberId } = req.body;
    const userId = req.user.userId;

    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) return res.status(404).json({ error: 'Invalid room code' });

    const existing = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId: room.id, userId } }
    });

    if (existing) return res.status(400).json({ error: 'Already requested or joined' });

    // Validate guest if provided
    if (claimGuestMemberId) {
      const guest = await prisma.guestMember.findUnique({ where: { id: claimGuestMemberId } });
      if (!guest || guest.roomId !== room.id || guest.status !== 'active') {
        return res.status(400).json({ error: 'Thành viên ảo không hợp lệ hoặc đã được xác nhận' });
      }
    }

    const member = await prisma.roomMember.create({
      data: { roomId: room.id, userId, status: 'pending', claimGuestMemberId }
    });

    res.json({ member, room });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMembers = async (req, res) => {
  try {
    const { roomId } = req.params;
    const members = await prisma.roomMember.findMany({
      where: { roomId },
      include: { user: { select: { id: true, name: true, email: true } } }
    });
    res.json({ members });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const approveMember = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    const member = await prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId } },
      data: { status: 'approved' }
    });

    // If claim request, update guest status
    if (member.claimGuestMemberId) {
      const guest = await prisma.guestMember.findUnique({ where: { id: member.claimGuestMemberId } });
      if (!guest || guest.roomId !== roomId || guest.status !== 'active' || guest.claimedByUserId) {
        return res.status(409).json({ error: 'Guest claim is no longer available.' });
      }
      await prisma.guestMember.update({
        where: { id: member.claimGuestMemberId },
        data: {
          status: 'claimed',
          claimedByUserId: userId,
          claimedAt: new Date()
        }
      });
    }

    res.json({ member });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const rejectMember = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    const member = await prisma.roomMember.update({
      where: { roomId_userId: { roomId, userId } },
      data: { status: 'rejected' }
    });
    res.json({ member });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const removeMember = async (req, res) => {
  try {
    const { roomId, userId } = req.params;

    const room = await prisma.room.findUnique({ where: { id: roomId } });
    if (room.ownerId === userId) {
      return res.status(400).json({ error: 'Cannot remove the room owner. Transfer ownership first.' });
    }

    // Release any claimed guest member back to active
    await prisma.guestMember.updateMany({
      where: { roomId, claimedByUserId: userId },
      data: { status: 'active', claimedByUserId: null, claimedAt: null }
    });

    await prisma.roomMember.delete({
      where: { roomId_userId: { roomId, userId } }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
