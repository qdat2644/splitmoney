import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = {
  roomMember: { findMany: vi.fn(), findUnique: vi.fn() },
  guestMember: { findMany: vi.fn() },
  payment: { findUnique: vi.fn(), delete: vi.fn(), create: vi.fn() },
};
vi.mock('../utils/db.js', () => ({ default: prisma }));

const { createPayment, deletePayment } = await import('../services/paymentService.js');

describe('payment access regression', () => {
  beforeEach(() => vi.clearAllMocks());

  it('case 6: only creator or room owner may delete a payment', async () => {
    prisma.payment.findUnique.mockResolvedValue({ id: 'p-1', roomId: 'room-a', createdByUserId: 'u-dat' });
    await expect(deletePayment('p-1', 'room-a', 'u-tea', 'member')).rejects.toMatchObject({ status: 403 });

    prisma.payment.findUnique.mockResolvedValue({ id: 'p-1', roomId: 'room-a', createdByUserId: 'u-dat' });
    prisma.payment.delete.mockResolvedValue({});
    await expect(deletePayment('p-1', 'room-a', 'u-dat', 'member')).resolves.toEqual({ success: true });
  });

  it('case 7: rejects cross-room payment injection', async () => {
    prisma.roomMember.findMany.mockResolvedValue([{ userId: 'u-dat' }, { userId: 'u-tea' }]);
    prisma.guestMember.findMany.mockResolvedValue([{ id: 'g-minh' }]);
    await expect(createPayment('room-a', {
      fromUserId: 'u-tuan',
      toUserId: 'u-dat',
      amount: 100000,
    }, 'u-dat')).rejects.toMatchObject({ status: 400 });
  });
});
