import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = {
  roomMember: { findMany: vi.fn() },
  guestMember: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  expense: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn(), findFirst: vi.fn() },
  expenseParticipant: { deleteMany: vi.fn(), findFirst: vi.fn() },
};
vi.mock('../utils/db.js', () => ({ default: prisma }));
vi.mock('../services/intelligence/personalFinanceProfileService.js', () => ({
  invalidateProfileCache: vi.fn(() => Promise.resolve()),
}));

const { updateExpense, deleteExpense } = await import('../controllers/expenseController.js');
const { updateGuest, deleteGuest } = await import('../controllers/guestController.js');
const res = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

describe('unsafe mutation regression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects cross-room expense edits by id', async () => {
    prisma.expense.findUnique.mockResolvedValue({ id: 'e-b', roomId: 'room-b' });
    const response = res();
    await updateExpense({
      params: { roomId: 'room-a', expenseId: 'e-b' },
      body: { paidByUserId: 'u-dat', amount: 100000, participants: [{ userId: 'u-dat' }] },
    }, response);
    expect(response.statusCode).toBe(404);
    expect(prisma.expense.update).not.toHaveBeenCalled();
  });

  it('rejects cross-room expense deletes by id', async () => {
    prisma.expense.findUnique.mockResolvedValue({ id: 'e-b', roomId: 'room-b', participants: [] });
    const response = res();
    await deleteExpense({ params: { roomId: 'room-a', expenseId: 'e-b' } }, response);
    expect(response.statusCode).toBe(404);
    expect(prisma.expense.delete).not.toHaveBeenCalled();
  });

  it('rejects cross-room guest edits and deletes by id', async () => {
    prisma.guestMember.findUnique.mockResolvedValue({ id: 'g-lan', roomId: 'room-b', status: 'active' });
    const updateResponse = res();
    await updateGuest({ params: { roomId: 'room-a', guestId: 'g-lan' }, body: { displayName: 'Lan' } }, updateResponse);
    expect(updateResponse.statusCode).toBe(404);

    prisma.guestMember.findUnique.mockResolvedValue({ id: 'g-lan', roomId: 'room-b', status: 'active' });
    const deleteResponse = res();
    await deleteGuest({ params: { roomId: 'room-a', guestId: 'g-lan' } }, deleteResponse);
    expect(deleteResponse.statusCode).toBe(404);
    expect(prisma.guestMember.update).not.toHaveBeenCalled();
    expect(prisma.guestMember.delete).not.toHaveBeenCalled();
  });
});
