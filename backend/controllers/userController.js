import bcrypt from 'bcryptjs';
import prisma from '../utils/db.js';
import { buildPersonalSummary } from '../services/personalSummaryService.js';
import { buildPersonalInsights } from '../services/personalInsightService.js';
import { buildCopilotWorkspace } from '../services/copilot/copilotEngine.js';
import { recordOperationalEvent } from '../services/operationalEventService.js';
import { buildDashboard } from '../services/dashboardService.js';
import { buildUserForecast } from '../services/forecastService.js';

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 80;
const MIN_PASSWORD_LENGTH = 8;

export const getPersonalSummary = async (req, res) => {
  try {
    const userId = req.user.userId;
    const summary = await buildPersonalSummary(userId);
    res.json(summary);
  } catch (error) {
    console.error('userController.getPersonalSummary error:', error);
    res.status(500).json({ error: 'Không thể tải tổng quan cá nhân.' });
  }
};

export const getPersonalInsights = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await buildPersonalInsights(userId);
    recordOperationalEvent({
      type: 'ai.insights',
      source: 'ai',
      severity: 'info',
      userId,
      metadata: { itemCount: result?.insights?.length || 0 },
    }).catch(() => {});
    res.json(result);
  } catch (error) {
    recordOperationalEvent({
      type: 'ai.insights',
      source: 'ai',
      severity: 'error',
      userId: req.user?.userId,
      metadata: { failed: true },
    }).catch(() => {});
    console.error('userController.getPersonalInsights error:', error);
    res.status(500).json({ error: 'Không thể tạo phân tích lúc này.' });
  }
};

export const getCopilotWorkspace = async (req, res) => {
  try {
    const result = await buildCopilotWorkspace(req.user.userId);
    recordOperationalEvent({
      type: 'ai.copilot',
      source: 'ai',
      severity: 'info',
      userId: req.user.userId,
      metadata: { recommendationCount: result?.recommendations?.length || 0 },
    }).catch(() => {});
    res.json(result);
  } catch (error) {
    recordOperationalEvent({
      type: 'ai.copilot',
      source: 'ai',
      severity: 'error',
      userId: req.user?.userId,
      metadata: { failed: true },
    }).catch(() => {});
    console.error('userController.getCopilotWorkspace error:', error);
    res.status(500).json({ error: 'Không thể tải không gian trợ lý AI.' });
  }
};

export const getForecasts = async (req, res) => {
  try {
    res.json(await buildUserForecast(req.user.userId));
  } catch (error) {
    console.error('userController.getForecasts error:', error);
    res.status(500).json({ error: 'Không thể tải dự báo tài chính.' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    if (name.length < MIN_NAME_LENGTH) {
      return res.status(400).json({ error: 'Tên hiển thị cần ít nhất 2 ký tự.' });
    }
    if (name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: 'Tên hiển thị không nên dài quá 80 ký tự.' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: { name },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    return res.json({ user, message: 'Đã cập nhật hồ sơ.' });
  } catch (error) {
    console.error('userController.updateProfile error:', error);
    return res.status(500).json({ error: 'Không thể cập nhật hồ sơ lúc này.' });
  }
};

export const changeUserPassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body ?? {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Vui lòng nhập mật khẩu hiện tại và mật khẩu mới.' });
    }
    if (String(newPassword).length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: 'Mật khẩu mới cần ít nhất 8 ký tự.' });
    }
    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'Mật khẩu mới không được trùng với mật khẩu hiện tại.' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng.' });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng.' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { passwordHash },
      select: { id: true },
    });

    return res.json({ success: true, message: 'Đã cập nhật mật khẩu.' });
  } catch (error) {
    console.error('userController.changeUserPassword error:', error);
    return res.status(500).json({ error: 'Không thể cập nhật mật khẩu lúc này.' });
  }
};

// GET /api/users/me/dashboard
// Consolidated endpoint: one snapshot → summary + analytics + insights in a single request.
export const getDashboard = async (req, res) => {
  const userId = req.user.userId;
  try {
    const result = await buildDashboard(userId);
    res.json(result);
  } catch (error) {
    console.error('userController.getDashboard error:', error);
    res.status(500).json({ error: 'Không thể tải bảng điều khiển cá nhân.' });
  }
};
