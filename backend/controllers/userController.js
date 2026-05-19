import { buildPersonalSummary } from '../services/personalSummaryService.js';
import { buildPersonalInsights } from '../services/personalInsightService.js';
import { buildCopilotWorkspace } from '../services/copilot/copilotEngine.js';
import { recordOperationalEvent } from '../services/operationalEventService.js';

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
