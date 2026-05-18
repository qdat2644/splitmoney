import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = {
  room: { findUnique: vi.fn() },
  roomMember: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  guestMember: { findUnique: vi.fn(), update: vi.fn() },
};
vi.mock('../utils/db.js', () => ({ default: prisma }));

const { joinRoom, approveMember } = await import('../controllers/roomController.js');
const res = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

describe('guest claim regression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('case 13: rejects already claimed guests during join', async () => {
    prisma.room.findUnique.mockResolvedValue({ id: 'room-a' });
    prisma.roomMember.findUnique.mockResolvedValue(null);
    prisma.guestMember.findUnique.mockResolvedValue({ id: 'g-minh', roomId: 'room-a', status: 'claimed' });
    const response = res();
    await joinRoom({ body: { code: 'ROOMA', claimGuestMemberId: 'g-minh' }, user: { userId: 'u-tea' } }, response);
    expect(response.statusCode).toBe(400);
  });

  it('case 13: approving a stale second claim does not overwrite an existing claim', async () => {
    prisma.roomMember.update.mockResolvedValue({ claimGuestMemberId: 'g-minh' });
    prisma.guestMember.findUnique.mockResolvedValue({ id: 'g-minh', roomId: 'room-a', status: 'claimed', claimedByUserId: 'u-tea' });
    const response = res();
    await approveMember({ params: { roomId: 'room-a' }, body: { userId: 'u-tuan' } }, response);
    expect(response.statusCode).toBe(409);
    expect(prisma.guestMember.update).not.toHaveBeenCalled();
  });
});
