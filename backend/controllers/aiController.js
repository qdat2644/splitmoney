import { extractAndValidateExpense } from '../services/ai/parser.js';
import prisma from '../utils/db.js';

export const parseExpense = async (req, res, next) => {
  try {
    const { text, selectedParticipantIds = [] } = req.body;
    const { roomId } = req.params;
    
    if (!text) {
      return res.status(400).json({ error: 'Vui lòng nhập nội dung cần phân tích.' });
    }

    const currentUser = req.user;

    // Fetch approved members from db
    const roomMembers = await prisma.roomMember.findMany({
      where: { roomId, status: 'approved' },
      include: { user: { select: { id: true, name: true } } }
    });
    
    // Fetch active and claimed guests
    const guestMembers = await prisma.guestMember.findMany({
      where: { roomId, status: { in: ['active', 'claimed'] } }
    });

    const members = [
      ...roomMembers.map(m => ({ id: m.user.id, name: m.user.name, displayName: m.user.name, type: 'user' })),
      ...guestMembers.map(g => ({ id: g.id, name: g.displayName, displayName: g.displayName, type: 'guest', claimedByUserId: g.claimedByUserId }))
    ];

    const selectedParticipants = members
      .filter((member) => selectedParticipantIds.includes(member.id))
      .map((member) => member.displayName);
    const defaultParticipants = selectedParticipants.length > 0
      ? selectedParticipants
      : members.map((member) => member.displayName);

    const result = await extractAndValidateExpense(text, members, currentUser, defaultParticipants);
    
    if (!result.valid) {
      return res.status(422).json({ error: result.errors.join(' '), rawData: result.data });
    }

    res.json({ 
      success: true, 
      data: result.data, 
      isFallback: result.isFallback,
      apiErrors: result.apiErrors,
      warnings: result.warnings || [],
    });
  } catch (error) {
    console.error('AI Controller Error:', error);
    res.status(500).json({ error: 'Không thể xử lý yêu cầu AI lúc này.' });
  }
};
