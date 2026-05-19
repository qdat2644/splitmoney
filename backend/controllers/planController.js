import {
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  addPlanExpense,
  updatePlanExpense,
  deletePlanExpense,
  convertPlanExpenseToReal,
  updatePlanParticipants,
} from '../services/planningService.js';
import { generatePlanWithAI } from '../services/ai/planGenerator.js';
import { invalidateProfileCache, getOrRefreshProfile } from '../services/intelligence/personalFinanceProfileService.js';
import { recordOperationalEvent } from '../services/operationalEventService.js';

export const getPlans = async (req, res) => {
  try {
    res.json({ plans: await listPlans(req.user.userId) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const postPlan = async (req, res) => {
  try {
    const plan = await createPlan(req.user.userId, req.body);
    invalidateProfileCache(req.user.userId).catch(() => {});
    res.status(201).json({ plan });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const patchPlan = async (req, res) => {
  try {
    const plan = await updatePlan(req.params.planId, req.user.userId, req.body);
    invalidateProfileCache(req.user.userId).catch(() => {});
    res.json({ plan });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const patchPlanParticipants = async (req, res) => {
  try {
    res.json({ plan: await updatePlanParticipants(req.params.planId, req.user.userId, req.body) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const removePlan = async (req, res) => {
  try {
    const result = await deletePlan(req.params.planId, req.user.userId);
    invalidateProfileCache(req.user.userId).catch(() => {});
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const postPlanExpense = async (req, res) => {
  try {
    res.status(201).json({ planExpense: await addPlanExpense(req.params.planId, req.user.userId, req.body) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const removePlanExpense = async (req, res) => {
  try {
    res.json(await deletePlanExpense(req.params.planExpenseId, req.user.userId));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const patchPlanExpense = async (req, res) => {
  try {
    res.json({ planExpense: await updatePlanExpense(req.params.planExpenseId, req.user.userId, req.body) });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const convertPlanExpense = async (req, res) => {
  try {
    const result = await convertPlanExpenseToReal(req.params.planExpenseId, req.user.userId, req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

export const generateAIPlan = async (req, res) => {
  try {
    const rawProfile = await getOrRefreshProfile(req.user.userId);
    const { serializeProfileForPrompt } = await import('../services/intelligence/profileSerializer.js');
    const profileContext = serializeProfileForPrompt(rawProfile);
    const result = await generatePlanWithAI({ ...req.body, profileContext });
    const fallback = result?.warnings?.some((item) => String(item).toLowerCase().includes('template')) || false;

    recordOperationalEvent({
      type: 'ai.plan_generation',
      source: 'ai',
      severity: 'info',
      userId: req.user.userId,
      roomId: req.body.roomId || null,
      metadata: {
        fallback,
        itemCount: result?.items?.length || 0,
        budgetStatus: result?.budgetStatus || null,
        hasTemporalContext: Boolean(rawProfile?.temporalMemory),
      },
    }).catch(() => {});

    res.json(result);
  } catch (err) {
    recordOperationalEvent({
      type: 'ai.plan_generation',
      source: 'ai',
      severity: 'error',
      userId: req.user?.userId,
      roomId: req.body?.roomId || null,
      metadata: { failed: true },
    }).catch(() => {});
    res.status(err.status || 500).json({ error: err.message });
  }
};
