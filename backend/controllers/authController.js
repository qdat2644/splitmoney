import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../utils/db.js';
import { env } from '../config/env.js';
import { sendPasswordResetEmail } from '../utils/email.js';
import { recordOperationalEvent } from '../services/operationalEventService.js';
import { logger } from '../utils/logger.js';

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin.' });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email này đã được sử dụng.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, role: true },
    });

    const token = jwt.sign({ userId: user.id }, env.jwtSecret, { expiresIn: '7d' });
    return res.status(201).json({ user, token });
  } catch (error) {
    logger.error('auth_register_failed', {
      message: error.message,
      code: error.code,
      stack: env.nodeEnv === 'development' ? error.stack : undefined,
    });
    return res.status(500).json({ error: 'Không thể tạo tài khoản lúc này.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      recordOperationalEvent({
        type: 'security.auth_failed',
        source: 'auth',
        severity: 'warning',
        metadata: { reason: 'unknown_email', emailDomain: emailDomain(email) },
      }).catch(() => {});
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      recordOperationalEvent({
        type: 'security.auth_failed',
        source: 'auth',
        severity: 'warning',
        userId: user.id,
        metadata: { reason: 'invalid_password', emailDomain: emailDomain(email) },
      }).catch(() => {});
      return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng.' });
    }

    const token = jwt.sign({ userId: user.id }, env.jwtSecret, { expiresIn: '7d' });
    return res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  } catch (error) {
    logger.error('auth_login_failed', {
      message: error.message,
      code: error.code,
      stack: env.nodeEnv === 'development' ? error.stack : undefined,
    });
    return res.status(500).json({ error: 'Không thể đăng nhập lúc này.' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    return res.json({ user });
  } catch (error) {
    logger.error('auth_me_failed', {
      message: error.message,
      code: error.code,
      stack: env.nodeEnv === 'development' ? error.stack : undefined,
    });
    return res.status(500).json({ error: 'Không thể tải thông tin tài khoản.' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ message: 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    await sendPasswordResetEmail(email, resetToken);
    return res.json({ message: 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.' });
  } catch (error) {
    logger.error('auth_forgot_password_failed', {
      message: error.message,
      code: error.code,
      stack: env.nodeEnv === 'development' ? error.stack : undefined,
    });
    return res.status(500).json({ error: 'Không thể xử lý yêu cầu đặt lại mật khẩu.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Thiếu mã đặt lại hoặc mật khẩu mới.' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetTokenDoc = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetTokenDoc || resetTokenDoc.usedAt || resetTokenDoc.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: resetTokenDoc.userId },
      data: { passwordHash },
    });

    await prisma.passwordResetToken.update({
      where: { id: resetTokenDoc.id },
      data: { usedAt: new Date() },
    });

    return res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    logger.error('auth_reset_password_failed', {
      message: error.message,
      code: error.code,
      stack: env.nodeEnv === 'development' ? error.stack : undefined,
    });
    return res.status(500).json({ error: 'Không thể đặt lại mật khẩu lúc này.' });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng.' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: newHash } });

    return res.json({ success: true, message: 'Đổi mật khẩu thành công.' });
  } catch (error) {
    logger.error('auth_change_password_failed', {
      message: error.message,
      code: error.code,
      stack: env.nodeEnv === 'development' ? error.stack : undefined,
    });
    return res.status(500).json({ error: 'Không thể đổi mật khẩu lúc này.' });
  }
};

function emailDomain(email) {
  if (!email || !email.includes('@')) return null;
  return email.split('@').pop();
}
