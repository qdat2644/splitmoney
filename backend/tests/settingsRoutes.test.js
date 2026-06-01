import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { env } from '../config/env.js';

const prisma = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  operationalEvent: {
    create: vi.fn().mockResolvedValue({ id: 'event-1' }),
  },
};

vi.mock('../utils/db.js', () => ({ default: prisma }));

const { createApp } = await import('../app.js');

function token(userId = 'u-settings') {
  return jwt.sign({ userId }, env.jwtSecret);
}

describe('settings account routes', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  it('updates profile name for the authenticated user', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ status: 'active' });
    prisma.user.update.mockResolvedValue({
      id: 'u-settings',
      name: 'Dat Nguyen',
      email: 'dat@example.com',
      role: 'member',
      status: 'active',
    });

    const response = await request(app)
      .patch('/api/users/me/profile')
      .set('Authorization', `Bearer ${token()}`)
      .send({ name: '  Dat Nguyen  ' })
      .expect(200);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u-settings' },
      data: { name: 'Dat Nguyen' },
      select: { id: true, name: true, email: true, role: true, status: true },
    });
    expect(response.body.user).toMatchObject({ name: 'Dat Nguyen', email: 'dat@example.com' });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });

  it('rejects empty or too-short profile names', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ status: 'active' });

    const response = await request(app)
      .patch('/api/users/me/profile')
      .set('Authorization', `Bearer ${token()}`)
      .send({ name: 'A' })
      .expect(400);

    expect(response.body.error).toBe('Tên hiển thị cần ít nhất 2 ký tự.');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('changes password after verifying the current password', async () => {
    const oldHash = await bcrypt.hash('current-password', 10);
    prisma.user.findUnique
      .mockResolvedValueOnce({ status: 'active' })
      .mockResolvedValueOnce({ id: 'u-settings', passwordHash: oldHash });
    prisma.user.update.mockResolvedValue({ id: 'u-settings', passwordHash: 'new-hash' });

    const response = await request(app)
      .post('/api/users/me/change-password')
      .set('Authorization', `Bearer ${token()}`)
      .send({ currentPassword: 'current-password', newPassword: 'new-password' })
      .expect(200);

    expect(response.body).toMatchObject({ success: true });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u-settings' },
      data: { passwordHash: expect.any(String) },
      select: { id: true },
    });
    expect(JSON.stringify(response.body)).not.toContain('passwordHash');
  });

  it('rejects wrong current password', async () => {
    const oldHash = await bcrypt.hash('current-password', 10);
    prisma.user.findUnique
      .mockResolvedValueOnce({ status: 'active' })
      .mockResolvedValueOnce({ id: 'u-settings', passwordHash: oldHash });

    const response = await request(app)
      .post('/api/users/me/change-password')
      .set('Authorization', `Bearer ${token()}`)
      .send({ currentPassword: 'wrong-password', newPassword: 'new-password' })
      .expect(400);

    expect(response.body.error).toBe('Mật khẩu hiện tại không đúng.');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects weak new passwords', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ status: 'active' });

    const response = await request(app)
      .post('/api/users/me/change-password')
      .set('Authorization', `Bearer ${token()}`)
      .send({ currentPassword: 'current-password', newPassword: 'short' })
      .expect(400);

    expect(response.body.error).toBe('Mật khẩu mới cần ít nhất 8 ký tự.');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
