import prisma from '../utils/db.js';

export const getGuests = async (req, res) => {
  try {
    const { roomId } = req.params;
    const guests = await prisma.guestMember.findMany({
      where: { roomId, status: { not: 'removed' } },
      include: {
        claimedByUser: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, name: true } }
      }
    });
    res.json({ guests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createGuest = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { displayName, email } = req.body;
    const createdByUserId = req.user.userId;

    if (!displayName) {
      return res.status(400).json({ error: 'Tên thành viên ảo không được để trống' });
    }

    // Check duplicate active/claimed names in room
    const existing = await prisma.guestMember.findFirst({
      where: { roomId, displayName, status: { not: 'removed' } }
    });

    if (existing) {
      return res.status(400).json({ error: 'Tên này đã tồn tại trong phòng' });
    }

    const guest = await prisma.guestMember.create({
      data: {
        roomId,
        displayName,
        email,
        createdByUserId
      },
      include: {
        claimedByUser: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ guest });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateGuest = async (req, res) => {
  try {
    const { roomId, guestId } = req.params;
    const { displayName, email } = req.body;

    // Fetch current guest to check claimed status
    const existing = await prisma.guestMember.findUnique({ where: { id: guestId } });
    if (!existing || existing.roomId !== roomId) return res.status(404).json({ error: 'Không tìm thấy thành viên ảo.' });

    // Lock: claimed guests cannot be renamed
    if (existing.status === 'claimed' || existing.claimedByUserId) {
      return res.status(400).json({
        success: false,
        message: 'Thành viên ảo này đã được một người dùng nhận diện và không thể đổi tên.',
        code: 'CLAIMED_GUEST_LOCKED'
      });
    }

    const guest = await prisma.guestMember.update({
      where: { id: guestId },
      data: { displayName, email },
      include: {
        claimedByUser: { select: { id: true, name: true } },
        createdByUser: { select: { id: true, name: true } }
      }
    });

    res.json({ guest });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteGuest = async (req, res) => {
  try {
    const { roomId, guestId } = req.params;
    const existing = await prisma.guestMember.findUnique({ where: { id: guestId } });
    if (!existing || existing.roomId !== roomId) return res.status(404).json({ error: 'Không tìm thấy thành viên ảo.' });
    
    // Check if guest has expenses
    const expenses = await prisma.expenseParticipant.findFirst({
      where: { guestMemberId: guestId }
    });

    const expensesPaid = await prisma.expense.findFirst({
      where: { paidByGuestMemberId: guestId }
    });

    if (expenses || expensesPaid) {
      // Soft delete
      await prisma.guestMember.update({
        where: { id: guestId },
        data: { status: 'removed' }
      });
      return res.json({ success: true, message: 'Đã ẩn thành viên ảo (do có dữ liệu liên quan)' });
    } else {
      // Hard delete
      await prisma.guestMember.delete({ where: { id: guestId } });
      return res.json({ success: true, message: 'Đã xoá thành viên ảo vĩnh viễn' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
