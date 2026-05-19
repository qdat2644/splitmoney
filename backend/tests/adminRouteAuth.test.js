import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { env } from '../config/env.js';

const prisma = {
  user: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]), update: vi.fn(), count: vi.fn().mockResolvedValue(0) },
  room: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]), update: vi.fn(), count: vi.fn().mockResolvedValue(0) },
  financialProfile: { deleteMany: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
  operationalEvent: { create: vi.fn(), findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  auditTrail: { create: vi.fn().mockResolvedValue({ id: 'a-1' }), findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  expense: { count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
  payment: { count: vi.fn().mockResolvedValue(0) },
  budget: { count: vi.fn().mockResolvedValue(0) },
  roomMember: { count: vi.fn().mockResolvedValue(0) },
  guestMember: { count: vi.fn().mockResolvedValue(0) },
};

vi.mock('../utils/db.js', () => ({ default: prisma }));

const { createApp } = await import('../app.js');
const token = (userId) => jwt.sign({ userId }, env.jwtSecret);

describe('admin mutation route authorization', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  it('rejects non-admin user from suspending', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-member', role: 'member' });

    await request(app)
      .post('/api/admin/users/suspend')
      .set('Authorization', `Bearer ${token('u-member')}`)
      .send({ userId: 'u-target' })
      .expect(403);
  });

  it('rejects unauthenticated suspension', async () => {
    await request(app)
      .post('/api/admin/users/suspend')
      .send({ userId: 'u-target' })
      .expect(401);
  });

  it('rejects non-admin from archiving rooms', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-member', role: 'member' });

    await request(app)
      .post('/api/admin/rooms/archive')
      .set('Authorization', `Bearer ${token('u-member')}`)
      .send({ roomId: 'r-1' })
      .expect(403);
  });

  it('rejects non-admin from AI recompute', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-member', role: 'member' });

    await request(app)
      .post('/api/admin/ai/recompute-profile')
      .set('Authorization', `Bearer ${token('u-member')}`)
      .send({ userId: 'u-1' })
      .expect(403);
  });

  it('rejects non-admin from accessing user listing', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-member', role: 'member' });

    await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token('u-member')}`)
      .expect(403);
  });

  it('rejects non-admin from accessing audit log', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-member', role: 'member' });

    await request(app)
      .get('/api/admin/audit')
      .set('Authorization', `Bearer ${token('u-member')}`)
      .expect(403);
  });

  it('allows admin to access new endpoints', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-admin', role: 'admin' });

    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${token('u-admin')}`)
      .expect(200);

    expect(res.body.users).toBeDefined();
  });

  it('returns 400 for missing userId on suspend', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-admin', role: 'admin' });

    await request(app)
      .post('/api/admin/users/suspend')
      .set('Authorization', `Bearer ${token('u-admin')}`)
      .send({})
      .expect(400);
  });
});
