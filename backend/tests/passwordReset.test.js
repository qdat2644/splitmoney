import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = {
  user: { findUnique: vi.fn(), update: vi.fn() },
  passwordResetToken: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const sendPasswordResetEmail = vi.fn();
const recordOperationalEvent = vi.fn();

vi.mock('../utils/db.js', () => ({ default: prisma }));
vi.mock('../utils/email.js', () => ({ sendPasswordResetEmail }));
vi.mock('../services/operationalEventService.js', () => ({ recordOperationalEvent }));

const { forgotPassword, resetPassword } = await import('../controllers/authController.js');

const res = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

describe('password reset flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prisma.passwordResetToken.create.mockResolvedValue({ id: 'reset-1' });
    prisma.passwordResetToken.update.mockResolvedValue({ id: 'reset-1' });
    prisma.user.update.mockResolvedValue({ id: 'user-1' });
    sendPasswordResetEmail.mockResolvedValue({ delivered: true, provider: 'resend' });
    recordOperationalEvent.mockResolvedValue(null);
  });

  it('returns the same generic response when email is missing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const response = res();

    await forgotPassword({ body: { email: 'missing@example.com' } }, response);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Neu email ton tai, lien ket dat lai mat khau da duoc gui.');
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('stores only a hashed reset token and sends the raw token by email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
    const response = res();

    await forgotPassword({ body: { email: 'user@example.com' } }, response);

    const rawToken = sendPasswordResetEmail.mock.calls[0][1];
    const createArgs = prisma.passwordResetToken.create.mock.calls[0][0];

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Neu email ton tai, lien ket dat lai mat khau da duoc gui.');
    expect(rawToken).toMatch(/^[a-f0-9]{64}$/);
    expect(createArgs.data.tokenHash).toBe(tokenHash(rawToken));
    expect(createArgs.data.tokenHash).not.toBe(rawToken);
    expect(createArgs.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('does not reveal delivery failures to the client', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'user@example.com' });
    sendPasswordResetEmail.mockRejectedValue(new Error('resend unavailable'));
    const response = res();

    await forgotPassword({ body: { email: 'user@example.com' } }, response);

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Neu email ton tai, lien ket dat lai mat khau da duoc gui.');
    expect(recordOperationalEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: 'auth.password_reset_delivery_failed',
      userId: 'user-1',
    }));
  });

  it('resets password with a valid unused token', async () => {
    const rawToken = 'valid-token';
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'reset-1',
      userId: 'user-1',
      tokenHash: tokenHash(rawToken),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    const response = res();

    await resetPassword({ body: { token: rawToken, newPassword: 'NewPass123!' } }, response);

    expect(response.statusCode).toBe(200);
    const updateArgs = prisma.user.update.mock.calls[0][0];
    expect(updateArgs.where).toEqual({ id: 'user-1' });
    expect(updateArgs.data.passwordHash).not.toBe('NewPass123!');
    await expect(bcrypt.compare('NewPass123!', updateArgs.data.passwordHash)).resolves.toBe(true);
    expect(prisma.passwordResetToken.update).toHaveBeenCalledWith({
      where: { id: 'reset-1' },
      data: { usedAt: expect.any(Date) },
    });
  });

  it('rejects weak reset passwords', async () => {
    const response = res();

    await resetPassword({ body: { token: 'valid-token', newPassword: 'short' } }, response);

    expect(response.statusCode).toBe(400);
    expect(prisma.passwordResetToken.findUnique).not.toHaveBeenCalled();
  });

  it('rejects expired reset tokens', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'reset-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() - 60_000),
      usedAt: null,
    });
    const response = res();

    await resetPassword({ body: { token: 'expired-token', newPassword: 'NewPass123!' } }, response);

    expect(response.statusCode).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects already used reset tokens', async () => {
    prisma.passwordResetToken.findUnique.mockResolvedValue({
      id: 'reset-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(),
    });
    const response = res();

    await resetPassword({ body: { token: 'used-token', newPassword: 'NewPass123!' } }, response);

    expect(response.statusCode).toBe(400);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
