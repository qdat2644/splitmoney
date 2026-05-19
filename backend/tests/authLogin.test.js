import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const prisma = {
  user: { findUnique: vi.fn() },
};
const recordOperationalEvent = vi.fn();

vi.mock('../utils/db.js', () => ({ default: prisma }));
vi.mock('../services/operationalEventService.js', () => ({ recordOperationalEvent }));

const { login } = await import('../controllers/authController.js');

const res = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

describe('auth login regression', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    recordOperationalEvent.mockResolvedValue(null);
  });

  it('valid login succeeds with token and safe user role', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    prisma.user.findUnique.mockResolvedValue({
      id: 'u-admin',
      name: 'Admin',
      email: 'admin@example.com',
      passwordHash,
      role: 'admin',
    });
    const response = res();

    await login({ body: { email: 'admin@example.com', password: 'Password123!' } }, response);

    expect(response.statusCode).toBe(200);
    expect(response.body.user).toEqual({
      id: 'u-admin',
      name: 'Admin',
      email: 'admin@example.com',
      role: 'admin',
    });
    expect(response.body.token).toBeTruthy();
    expect(jwt.verify(response.body.token, env.jwtSecret).userId).toBe('u-admin');
  });

  it('invalid password returns 401 instead of 500', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 10);
    prisma.user.findUnique.mockResolvedValue({
      id: 'u-member',
      name: 'Member',
      email: 'member@example.com',
      passwordHash,
      role: 'member',
    });
    const response = res();

    await login({ body: { email: 'member@example.com', password: 'wrong' } }, response);

    expect(response.statusCode).toBe(401);
    expect(response.body.error).toMatch(/Email/);
  });

  it('missing user returns 401 instead of 500', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const response = res();

    await login({ body: { email: 'missing@example.com', password: 'wrong' } }, response);

    expect(response.statusCode).toBe(401);
    expect(response.body.error).toMatch(/Email/);
  });

  it('operational event logging failure does not break bad login handling', async () => {
    recordOperationalEvent.mockRejectedValue(new Error('event store unavailable'));
    prisma.user.findUnique.mockResolvedValue(null);
    const response = res();

    await login({ body: { email: 'missing@example.com', password: 'wrong' } }, response);

    expect(response.statusCode).toBe(401);
    expect(recordOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'security.auth_failed',
      source: 'auth',
    }));
  });
});
