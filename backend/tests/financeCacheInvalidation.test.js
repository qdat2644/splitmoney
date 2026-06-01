import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = {
  roomMember: { findMany: vi.fn() },
};
const clearCopilotCache = vi.fn();
const invalidateProfileCache = vi.fn(() => Promise.resolve());

vi.mock('../utils/db.js', () => ({ default: prisma }));
vi.mock('../services/copilot/copilotEngine.js', () => ({ clearCopilotCache }));
vi.mock('../services/intelligence/personalFinanceProfileService.js', () => ({ invalidateProfileCache }));

const { invalidateRoomFinanceCaches, invalidateUserFinanceCaches } = await import('../services/financeCacheInvalidationService.js');

describe('finance cache invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidates profile and copilot cache for each user once', () => {
    invalidateUserFinanceCaches(['u-1', 'u-1', 'u-2', null]);

    expect(clearCopilotCache).toHaveBeenCalledTimes(2);
    expect(clearCopilotCache).toHaveBeenCalledWith('u-1');
    expect(clearCopilotCache).toHaveBeenCalledWith('u-2');
    expect(invalidateProfileCache).toHaveBeenCalledTimes(2);
  });

  it('invalidates all approved room members for room-scoped mutations', async () => {
    prisma.roomMember.findMany.mockResolvedValue([{ userId: 'u-1' }, { userId: 'u-2' }]);

    await invalidateRoomFinanceCaches('room-a');

    expect(prisma.roomMember.findMany).toHaveBeenCalledWith({
      where: { roomId: 'room-a', status: 'approved' },
      select: { userId: true },
    });
    expect(clearCopilotCache).toHaveBeenCalledWith('u-1');
    expect(clearCopilotCache).toHaveBeenCalledWith('u-2');
  });
});
