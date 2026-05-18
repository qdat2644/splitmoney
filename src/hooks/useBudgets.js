// useBudgets.js — Isolated hook for budget management
import { useState, useEffect, useCallback } from 'react';
import { budgetApi } from '../services/apiClient';

export function useBudgets() {
  const [budgets, setBudgets]   = useState([]);
  const [status,  setStatus]    = useState(null); // budget comparison
  const [loading, setLoading]   = useState(true);
  const [error,   setError]     = useState(null);

  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [budgetsRes, statusRes] = await Promise.all([
        budgetApi.getBudgets(),
        budgetApi.getStatus(month, year),
      ]);
      setBudgets(budgetsRes.budgets ?? []);
      setStatus(statusRes);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetch(); }, [fetch]);

  const setBudget = useCallback(async (data) => {
    const res = await budgetApi.setBudget(data);
    setBudgets(prev => {
      const idx = prev.findIndex(b => b.id === res.budget.id);
      return idx >= 0 ? prev.map(b => b.id === res.budget.id ? res.budget : b) : [res.budget, ...prev];
    });
    // Refresh status
    const statusRes = await budgetApi.getStatus(month, year);
    setStatus(statusRes);
    return res.budget;
  }, [month, year]);

  const deleteBudget = useCallback(async (id) => {
    await budgetApi.deleteBudget(id);
    setBudgets(prev => prev.filter(b => b.id !== id));
    const statusRes = await budgetApi.getStatus(month, year);
    setStatus(statusRes);
  }, [month, year]);

  return { budgets, status, loading, error, refetch: fetch, setBudget, deleteBudget };
}
