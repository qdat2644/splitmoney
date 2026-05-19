import prisma from '../utils/db.js';

export const requireAdmin = async (req, res, next) => {
  if (!req.user?.userId) {
    return res.status(401).json({ error: 'Bạn cần đăng nhập để tiếp tục.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, role: true },
    });

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Bạn không có quyền truy cập khu vực quản trị.' });
    }

    req.admin = { userId: user.id, role: user.role };
    next();
  } catch (error) {
    res.status(500).json({ error: 'Không thể xác minh quyền quản trị.' });
  }
};
