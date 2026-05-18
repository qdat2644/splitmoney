// usePlans.js — Isolated hook for planning system
import { useState, useEffect, useCallback } from 'react';
import { planApi } from '../services/apiClient';

export function usePlans() {
  const [plans,   setPlans]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await planApi.getPlans();
      setPlans(res.plans ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const createPlan = useCallback(async (data) => {
    const res = await planApi.createPlan(data);
    setPlans(prev => [res.plan, ...prev]);
    return res.plan;
  }, []);

  const updatePlan = useCallback(async (planId, data) => {
    const res = await planApi.updatePlan(planId, data);
    setPlans(prev => prev.map(p => p.id === planId ? res.plan : p));
    return res.plan;
  }, []);

  const updatePlanParticipants = useCallback(async (planId, data) => {
    const res = await planApi.updatePlanParticipants(planId, data);
    setPlans(prev => prev.map(p => p.id === planId ? res.plan : p));
    return res.plan;
  }, []);

  const deletePlan = useCallback(async (planId) => {
    await planApi.deletePlan(planId);
    setPlans(prev => prev.filter(p => p.id !== planId));
  }, []);

  const addPlanExpense = useCallback(async (planId, data) => {
    const res = await planApi.addPlanExpense(planId, data);
    setPlans(prev => prev.map(p =>
      p.id === planId ? { ...p, expenses: [...(p.expenses ?? []), res.planExpense], estimatedTotal: p.estimatedTotal + res.planExpense.estimatedAmount } : p
    ));
    return res.planExpense;
  }, []);

  const updatePlanExpense = useCallback(async (planId, planExpenseId, data) => {
    const res = await planApi.updatePlanExpense(planExpenseId, data);
    setPlans(prev => prev.map(p =>
      p.id === planId ? {
        ...p,
        expenses: p.expenses.map(e => e.id === planExpenseId ? res.planExpense : e),
        estimatedTotal: p.expenses.reduce((sum, e) => sum + (e.id === planExpenseId ? res.planExpense.estimatedAmount : e.estimatedAmount), 0),
      } : p
    ));
    return res.planExpense;
  }, []);

  const deletePlanExpense = useCallback(async (planId, planExpenseId) => {
    await planApi.deletePlanExpense(planExpenseId);
    setPlans(prev => prev.map(p =>
      p.id === planId ? {
        ...p,
        expenses: p.expenses.filter(e => e.id !== planExpenseId),
        estimatedTotal: p.expenses.filter(e => e.id !== planExpenseId).reduce((s, e) => s + e.estimatedAmount, 0),
      } : p
    ));
  }, []);

  const convertExpense = useCallback(async (planId, planExpenseId, data) => {
    const res = await planApi.convertExpense(planExpenseId, data);
    // Mark converted in local state
    setPlans(prev => prev.map(p =>
      p.id === planId ? {
        ...p,
        expenses: p.expenses.map(e => e.id === planExpenseId ? { ...e, convertedToExpenseId: res.expense.id } : e),
      } : p
    ));
    return res;
  }, []);

  return {
    plans, loading, error, refetch: fetch,
    createPlan, updatePlan, updatePlanParticipants, deletePlan,
    addPlanExpense, updatePlanExpense, deletePlanExpense, convertExpense,
  };
}
