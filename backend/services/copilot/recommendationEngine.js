import { buildRiskRecommendations } from './riskEngine.js';
import { buildOpportunityRecommendations } from './opportunityEngine.js';

const severityWeight = { critical: 3, warning: 2, info: 1 };

export function buildRecommendations(context) {
  return dedupeRecommendations([
    ...buildRiskRecommendations(context),
    ...buildOpportunityRecommendations(context),
  ]).sort(compareRecommendationPriority);
}

export function dedupeRecommendations(recommendations) {
  const bestById = new Map();
  for (const recommendation of recommendations) {
    const previous = bestById.get(recommendation.id);
    if (!previous || compareRecommendationPriority(recommendation, previous) < 0) {
      bestById.set(recommendation.id, recommendation);
    }
  }
  return [...bestById.values()];
}

export function compareRecommendationPriority(left, right) {
  const severityDelta = (severityWeight[right.severity] ?? 0) - (severityWeight[left.severity] ?? 0);
  if (severityDelta !== 0) return severityDelta;
  return right.confidence - left.confidence;
}
