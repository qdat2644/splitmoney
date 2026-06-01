// dashboardService.js
// Consolidated personal dashboard: builds one snapshot, reuses it for summary + analytics + insights.
// Called exclusively by GET /api/users/me/dashboard.

import { buildPersonalFinanceSnapshot } from './personalFinanceSnapshotService.js';
import { buildPersonalSummary } from './personalSummaryService.js';
import { buildPersonalAnalytics } from './analyticsService.js';
import { buildPersonalInsights } from './personalInsightService.js';

/**
 * Build the full personal dashboard payload in a single pass.
 * - buildPersonalFinanceSnapshot() runs exactly once.
 * - summary and analytics both receive the same snapshot so they skip their own fetch.
 * - insights calls buildPersonalInsights() which has its own 5-min in-process cache;
 *   on a cache miss it will call the snapshot/summary/analytics internally — acceptable
 *   since that path is already guarded by the cache. If the cache is warm it returns immediately.
 *
 * @param {string} userId
 * @returns {Promise<{ summary: object, analytics: object, insights: object, meta: object }>}
 */
export async function buildDashboard(userId) {
  // One snapshot for the entire dashboard request.
  const snapshot = await buildPersonalFinanceSnapshot(userId);

  // summary and analytics both accept the pre-built snapshot — no second DB round-trip.
  const [summary, analytics, insights] = await Promise.all([
    buildPersonalSummary(userId, snapshot),
    buildPersonalAnalytics(userId, snapshot),
    buildPersonalInsights(userId),        // has its own 5-min cache; uses snapshot internally on miss
  ]);

  return {
    summary,
    analytics,
    insights,
    meta: {
      computedAt: new Date().toISOString(),
    },
  };
}
