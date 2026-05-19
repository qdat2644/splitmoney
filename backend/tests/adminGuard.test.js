import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { env } from '../config/env.js';

const prisma = {
  user: { findUnique: vi.fn() },
  operationalEvent: { create: vi.fn() },
};

const adminService = {
  buildAdminOverview: vi.fn(),
  buildImportObservability: vi.fn(),
  buildAiObservability: vi.fn(),
  buildSecurityVisibility: vi.fn(),
  inspectAdminRoom: vi.fn(),
  inspectAdminUser: vi.fn(),
};

vi.mock('../utils/db.js', () => ({ default: prisma }));
vi.mock('../services/adminOperationsService.js', () => adminService);

const { requireAdmin } = await import('../middleware/adminMiddleware.js');
const { createApp } = await import('../app.js');

const res = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

const token = (userId) => jwt.sign({ userId }, env.jwtSecret);

describe('admin operations authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminService.buildAdminOverview.mockResolvedValue({ metrics: {}, sections: {}, narrative: [], recentAnomalies: [] });
    adminService.buildImportObservability.mockResolvedValue({ metrics: {}, recentImports: [] });
    adminService.buildAiObservability.mockResolvedValue({ metrics: {}, recentActivity: [] });
    adminService.buildSecurityVisibility.mockResolvedValue({ metrics: { failedAuthAttempts: 0 }, signals: [] });
    adminService.inspectAdminRoom.mockResolvedValue({ id: 'room-a', counts: {} });
    adminService.inspectAdminUser.mockResolvedValue({ id: 'u-admin', counts: {} });
  });

  it('rejects unauthenticated middleware usage', async () => {
    const response = res();
    const next = vi.fn();

    await requireAdmin({ user: null }, response, next);

    expect(response.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects non-admin users with a safe 403', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-member', role: 'member' });
    const response = res();
    const next = vi.fn();

    await requireAdmin({ user: { userId: 'u-member' } }, response, next);

    expect(response.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows admin middleware usage', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u-admin', role: 'admin' });
    const response = res();
    const next = vi.fn();
    const req = { user: { userId: 'u-admin' } };

    await requireAdmin(req, response, next);

    expect(req.admin).toEqual({ userId: 'u-admin', role: 'admin' });
    expect(next).toHaveBeenCalledOnce();
  });

  it('keeps admin API routes isolated from missing and non-admin sessions', async () => {
    const app = createApp();

    await request(app).get('/api/admin/overview').expect(401);

    prisma.user.findUnique.mockResolvedValue({ id: 'u-member', role: 'member' });
    await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${token('u-member')}`)
      .expect(403);

    expect(adminService.buildAdminOverview).not.toHaveBeenCalled();
  });

  it('allows admins to access the security endpoint', async () => {
    const app = createApp();
    prisma.user.findUnique.mockResolvedValue({ id: 'u-admin', role: 'admin' });

    const response = await request(app)
      .get('/api/admin/security')
      .set('Authorization', `Bearer ${token('u-admin')}`)
      .expect(200);

    expect(response.body.metrics.failedAuthAttempts).toBe(0);
    expect(adminService.buildSecurityVisibility).toHaveBeenCalledOnce();
  });

  it('protects room inspection behind admin authorization', async () => {
    const app = createApp();

    prisma.user.findUnique.mockResolvedValueOnce({ id: 'u-member', role: 'member' });
    await request(app)
      .get('/api/admin/rooms/room-a')
      .set('Authorization', `Bearer ${token('u-member')}`)
      .expect(403);
    expect(adminService.inspectAdminRoom).not.toHaveBeenCalled();

    prisma.user.findUnique.mockResolvedValueOnce({ id: 'u-admin', role: 'admin' });
    const response = await request(app)
      .get('/api/admin/rooms/room-a')
      .set('Authorization', `Bearer ${token('u-admin')}`)
      .expect(200);

    expect(response.body.room.id).toBe('room-a');
    expect(adminService.inspectAdminRoom).toHaveBeenCalledWith('room-a');
  });
});
