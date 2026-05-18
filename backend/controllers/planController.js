// planController.js
import {
  listPlans, createPlan, updatePlan, deletePlan,
  addPlanExpense, updatePlanExpense, deletePlanExpense, convertPlanExpenseToReal, updatePlanParticipants,
} from '../services/planningService.js';
import { invalidateProfileCache, getOrRefreshProfile } from '../services/intelligence/personalFinanceProfileService.js';

export const getPlans      = async (req, res) => {
  try { res.json({ plans: await listPlans(req.user.userId) }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

export const postPlan      = async (req, res) => {
  try {
    const plan = await createPlan(req.user.userId, req.body);
    invalidateProfileCache(req.user.userId).catch(() => {});
    res.status(201).json({ plan });
  }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

export const patchPlan     = async (req, res) => {
  try {
    const plan = await updatePlan(req.params.planId, req.user.userId, req.body);
    invalidateProfileCache(req.user.userId).catch(() => {});
    res.json({ plan });
  }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

export const patchPlanParticipants = async (req, res) => {
  try { res.json({ plan: await updatePlanParticipants(req.params.planId, req.user.userId, req.body) }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

export const removePlan    = async (req, res) => {
  try {
    const result = await deletePlan(req.params.planId, req.user.userId);
    invalidateProfileCache(req.user.userId).catch(() => {});
    res.json(result);
  }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

export const postPlanExpense = async (req, res) => {
  try { res.status(201).json({ planExpense: await addPlanExpense(req.params.planId, req.user.userId, req.body) }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

export const removePlanExpense = async (req, res) => {
  try { res.json(await deletePlanExpense(req.params.planExpenseId, req.user.userId)); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

export const patchPlanExpense = async (req, res) => {
  try { res.json({ planExpense: await updatePlanExpense(req.params.planExpenseId, req.user.userId, req.body) }); }
  catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

export const convertPlanExpense = async (req, res) => {
  try {
    const result = await convertPlanExpenseToReal(req.params.planExpenseId, req.user.userId, req.body);
    res.status(201).json(result);
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};

import { generatePlanWithAI } from '../services/ai/planGenerator.js';

export const generateAIPlan = async (req, res) => {
  try {
    const rawProfile = await getOrRefreshProfile(req.user.userId);
    const { serializeProfileForPrompt } = await import('../services/intelligence/profileSerializer.js');
    const profileContext = serializeProfileForPrompt(rawProfile);
    
    const inputs = { ...req.body, profileContext };
    const result = await generatePlanWithAI(inputs);
    res.json(result);
  } catch (err) { res.status(err.status || 500).json({ error: err.message }); }
};
