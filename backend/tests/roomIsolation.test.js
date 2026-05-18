import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = {
  roomMember: { findUnique: vi.fn() },
};
vi.mock('../utils/db.js', () => ({ default: prisma }));

const { requireRoomMember } = await import('../middleware/roomMiddleware.js');
const res = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

describe('room isolation regression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('case 2: rejects non-members from room finance routes', async () => {
    prisma.roomMember.findUnique.mockResolvedValue(null);
    const response = res();
    await requireRoomMember({ params: { roomId: 'room-a' }, user: { userId: 'u-stranger' } }, response, vi.fn());
    expect(response.statusCode).toBe(403);
  });

  it('case 3: rejects pending and rejected members', async () => {
    for (const status of ['pending', 'rejected']) {
      prisma.roomMember.findUnique.mockResolvedValueOnce({ status });
      const response = res();
      await requireRoomMember({ params: { roomId: 'room-a' }, user: { userId: 'u-tea' } }, response, vi.fn());
      expect(response.statusCode).toBe(403);
    }
  });

  it('case 4: allows approved members', async () => {
    const next = vi.fn();
    prisma.roomMember.findUnique.mockResolvedValue({ status: 'approved', role: 'member' });
    await requireRoomMember({ params: { roomId: 'room-a' }, user: { userId: 'u-tea' } }, res(), next);
    expect(next).toHaveBeenCalledOnce();
  });
});
