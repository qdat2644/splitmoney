// personalInsightService.js
// Orchestrates the insight generation pipeline:
//   1. Fetch personal summary
//   2. Try AI generation (Gemini)
//   3. On failure → deterministic rule-based fallback
//   4. Return validated insight array

import { buildPersonalSummary } from './personalSummaryService.js';
import { buildPersonalAnalytics } from './analyticsService.js';
import { buildPersonalFinanceSnapshot } from './personalFinanceSnapshotService.js';
import { generateAIInsights } from './ai/insightGenerator.js';
import { generateRuleBasedInsights } from '../utils/insightRules.js';
import { getOrRefreshProfile } from './intelligence/personalFinanceProfileService.js';
import { serializeProfileForPrompt } from './intelligence/profileSerializer.js';

const insightCache = new Map();
const INSIGHT_TTL_MS = 5 * 60 * 1000;

/**
 * Build finance insights for a user.
 * Always returns a safe result — never throws to the caller.
 * @param {string} userId
 * @returns {Promise<{ insights: Array, source: 'ai' | 'rules', generatedAt: string }>}
 */
export async function buildPersonalInsights(userId) {
  const cached = insightCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  // ── Step 1: Get the financial summary ───────────────────────────────────
  const snapshot = await buildPersonalFinanceSnapshot(userId);
  const [summary, analytics, rawProfile] = await Promise.all([
    buildPersonalSummary(userId, snapshot),
    buildPersonalAnalytics(userId, snapshot),
    getOrRefreshProfile(userId)
  ]);
  const profileContext = serializeProfileForPrompt(rawProfile);

  // ── Step 2: Try AI generation ────────────────────────────────────────────
  let insights = null;
  let source = 'rules';

  try {
    const timeout = (ms) => new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Gemini timeout after ${ms}ms`)), ms)
    );
    const aiInsights = await Promise.race([generateAIInsights({ summary, analytics, profileContext }), timeout(8000)]);
    if (Array.isArray(aiInsights) && aiInsights.length > 0) {
      insights = aiInsights;
      source = 'ai';
      console.log(`[PersonalInsights] AI generated ${insights.length} insights for user ${userId}`);
    } else {
      console.log(`[PersonalInsights] AI returned empty array, falling back to rules`);
    }
  } catch (err) {
    console.warn(`[PersonalInsights] AI failed (${err.message}), using rule-based fallback`);
  }

  // ── Step 3: Deterministic fallback ───────────────────────────────────────
  if (!insights) {
    insights = generateRuleBasedInsights(summary, analytics);
    console.log(`[PersonalInsights] Rules generated ${insights.length} insights for user ${userId}`);
  }

  const result = {
    insights,
    source,
    generatedAt: new Date().toISOString(),
  };
  insightCache.set(userId, { value: result, expiresAt: Date.now() + INSIGHT_TTL_MS });
  return result;
}
