import { buildPersonalAnalytics } from '../services/analyticsService.js';

export const getPersonalAnalytics = async (req, res) => {
  try {
    res.json(await buildPersonalAnalytics(req.user.userId));
  } catch (error) {
    console.error('analyticsController.getPersonalAnalytics error:', error);
    res.status(500).json({ error: 'Không thể tải dữ liệu phân tích.' });
  }
};
