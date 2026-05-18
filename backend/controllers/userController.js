// userController.js
import { buildPersonalSummary } from '../services/personalSummaryService.js';
import { buildPersonalInsights } from '../services/personalInsightService.js';

export const getPersonalSummary = async (req, res) => {
  try {
    const userId = req.user.userId;
    const summary = await buildPersonalSummary(userId);
    res.json(summary);
  } catch (error) {
    console.error('userController.getPersonalSummary error:', error);
    res.status(500).json({ error: error.message || 'Failed to build personal summary' });
  }
};

export const getPersonalInsights = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await buildPersonalInsights(userId);
    res.json(result);
  } catch (error) {
    console.error('userController.getPersonalInsights error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate insights' });
  }
};
