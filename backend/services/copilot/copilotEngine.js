import { buildPersonalFinanceSnapshot } from '../personalFinanceSnapshotService.js';
import { buildPersonalSummary } from '../personalSummaryService.js';
import { buildPersonalAnalytics } from '../analyticsService.js';
import { getOrRefreshProfile } from '../intelligence/personalFinanceProfileService.js';
import { listPlans } from '../planningService.js';
import { buildRecommendations } from './recommendationEngine.js';
import { serializeCopilotPayload } from './copilotSerializer.js';

const copilotCache = new Map();
const COPILOT_TTL_MS = 5 * 60 * 1000;

export async function buildCopilotWorkspace(userId) {
  const cached = copilotCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const createdAt = new Date().toISOString();
  const snapshot = await buildPersonalFinanceSnapshot(userId);
  const [summary, analytics, profile, plans] = await Promise.all([
    buildPersonalSummary(userId, snapshot),
    buildPersonalAnalytics(userId, snapshot),
    getOrRefreshProfile(userId),
    listPlans(userId),
  ]);
  const recommendations = buildRecommendations({ summary, analytics, profile, plans, createdAt });
  const payload = serializeCopilotPayload({ recommendations, analytics, profile, plans });

  copilotCache.set(userId, { value: payload, expiresAt: Date.now() + COPILOT_TTL_MS });
  return payload;
}

export function clearCopilotCache(userId) {
  if (userId) copilotCache.delete(userId);
  else copilotCache.clear();
}
