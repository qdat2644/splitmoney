import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/db.js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/email.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Vui lòng nhập đầy đủ thông tin.' });

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return res.status(400).json({ error: 'Email này đã được sử dụng.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true }
    });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ user, token });
  } catch (error) {
    res.status(500).json({ error: 'Không thể tạo tài khoản lúc này.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(400).json({ error: 'Email hoặc mật khẩu không đúng.' });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Email hoặc mật khẩu không đúng.' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  } catch (error) {
    res.status(500).json({ error: 'Không thể đăng nhập lúc này.' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, email: true }
    });
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Không thể tải thông tin tài khoản.' });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ message: 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.' }); // prevent enum

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt }
    });

    await sendPasswordResetEmail(email, resetToken);
    res.json({ message: 'Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.' });
  } catch (error) {
    res.status(500).json({ error: 'Không thể xử lý yêu cầu đặt lại mật khẩu.' });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ error: 'Thiếu mã đặt lại hoặc mật khẩu mới.' });

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const resetTokenDoc = await prisma.passwordResetToken.findUnique({
      where: { tokenHash }
    });

    if (!resetTokenDoc || resetTokenDoc.usedAt || resetTokenDoc.expiresAt < new Date()) {
      return res.status(400).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: resetTokenDoc.userId },
      data: { passwordHash }
    });

    await prisma.passwordResetToken.update({
      where: { id: resetTokenDoc.id },
      data: { usedAt: new Date() }
    });

    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    res.status(500).json({ error: 'Không thể đặt lại mật khẩu lúc này.' });
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

    res.json({ success: true, message: 'Đổi mật khẩu thành công.' });
  } catch (error) {
    res.status(500).json({ error: 'Không thể đổi mật khẩu lúc này.' });
  }
};
