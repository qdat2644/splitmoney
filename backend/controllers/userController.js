// userController.js
import { buildPersonalSummary } from '../services/personalSummaryService.js';
import { buildPersonalInsights } from '../services/personalInsightService.js';
import { buildCopilotWorkspace } from '../services/copilot/copilotEngine.js';

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
    res.json(result);
  } catch (error) {
    console.error('userController.getPersonalInsights error:', error);
    res.status(500).json({ error: 'Không thể tạo phân tích lúc này.' });
  }
};

export const getCopilotWorkspace = async (req, res) => {
  try {
    res.json(await buildCopilotWorkspace(req.user.userId));
  } catch (error) {
    console.error('userController.getCopilotWorkspace error:', error);
    res.status(500).json({ error: 'Không thể tải không gian trợ lý AI.' });
  }
};
