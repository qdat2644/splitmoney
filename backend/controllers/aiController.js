import { extractAndValidateExpense } from '../services/ai/parser.js';
import { recordOperationalEvent } from '../services/operationalEventService.js';
import prisma from '../utils/db.js';

export const parseExpense = async (req, res) => {
  try {
    const { text, selectedParticipantIds = [] } = req.body;
    const { roomId } = req.params;

    if (!text) {
      return res.status(400).json({ error: 'Vui lòng nhập nội dung cần phân tích.' });
    }

    const currentUser = req.user;
    const roomMembers = await prisma.roomMember.findMany({
      where: { roomId, status: 'approved' },
      include: { user: { select: { id: true, name: true } } },
    });
    const guestMembers = await prisma.guestMember.findMany({
      where: { roomId, status: { in: ['active', 'claimed'] } },
    });

    const members = [
      ...roomMembers.map((member) => ({ id: member.user.id, name: member.user.name, displayName: member.user.name, type: 'user' })),
      ...guestMembers.map((guest) => ({
        id: guest.id,
        name: guest.displayName,
        displayName: guest.displayName,
        type: 'guest',
        claimedByUserId: guest.claimedByUserId,
      })),
    ];

    const selectedParticipants = members
      .filter((member) => selectedParticipantIds.includes(member.id))
      .map((member) => member.displayName);
    const defaultParticipants = selectedParticipants.length > 0
      ? selectedParticipants
      : members.map((member) => member.displayName);

    const result = await extractAndValidateExpense(text, members, currentUser, defaultParticipants);

    recordOperationalEvent({
      type: 'ai.parser',
      source: 'ai',
      severity: result.valid ? 'info' : 'warning',
      userId: req.user.userId,
      roomId,
      metadata: {
        valid: result.valid,
        isFallback: result.isFallback,
        apiErrors: result.apiErrors?.length || 0,
        warnings: result.warnings?.length || 0,
        confidence: result.data?.confidence ?? null,
        participantCount: result.data?.participants?.length || 0,
      },
    }).catch(() => {});

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
    recordOperationalEvent({
      type: 'ai.parser',
      source: 'ai',
      severity: 'error',
      userId: req.user?.userId,
      roomId: req.params.roomId,
      metadata: { valid: false },
    }).catch(() => {});
    console.error('AI Controller Error:', error);
    res.status(500).json({ error: 'Không thể xử lý yêu cầu AI lúc này.' });
  }
};
