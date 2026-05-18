import { listBudgets, upsertBudget, deleteBudget, getBudgetComparison } from '../services/budgetService.js';
import { invalidateProfileCache } from '../services/intelligence/personalFinanceProfileService.js';

export const getBudgets = async (req, res) => {
  try {
    const budgets = await listBudgets(req.user.userId);
    res.json({ budgets });
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

export const setBudget = async (req, res) => {
  try {
    const budget = await upsertBudget(req.user.userId, req.body);
    invalidateProfileCache(req.user.userId).catch(() => {});
    res.status(201).json({ budget });
  } catch (err) {
    console.error('[setBudget] Error:', err.message, err.code);
    const status = err.status || 500;
    const message = status === 500 ? 'Lỗi tạo/cập nhật ngân sách. Vui lòng thử lại.' : err.message;
    res.status(status).json({ error: message });
  }
};

export const removeBudget = async (req, res) => {
  try {
    const result = await deleteBudget(req.params.budgetId, req.user.userId);
    invalidateProfileCache(req.user.userId).catch(() => {});
    res.json(result);
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

export const getBudgetStatus = async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const m = month ? parseInt(month) : now.getMonth() + 1;
    const y = year  ? parseInt(year)  : now.getFullYear();
    const data = await getBudgetComparison(req.user.userId, m, y);
    res.json(data);
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};
