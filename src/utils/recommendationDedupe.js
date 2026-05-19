const severityWeight = { critical: 3, warning: 2, info: 1 };
const actionGroups = {
  open_budget: 'budget',
  create_budget: 'budget',
  create_recurring_budget: 'budget',
  open_forecasts: 'forecast',
  open_analytics: 'forecast',
  review_settlements: 'settlement',
};

export function compareRecommendationPriority(left, right) {
  const severityDelta = (severityWeight[right.severity] ?? 0) - (severityWeight[left.severity] ?? 0);
  if (severityDelta !== 0) return severityDelta;
  const leftScore = (left.confidence ?? 0) + (left.priorityBoost ?? 0);
  const rightScore = (right.confidence ?? 0) + (right.priorityBoost ?? 0);
  return rightScore - leftScore;
}

export function dedupeRecommendations(recommendations = []) {
  const selected = [];

  for (const recommendation of recommendations.filter(Boolean)) {
    const duplicateIndex = selected.findIndex((existing) => areSimilarRecommendations(existing, recommendation));
    if (duplicateIndex === -1) {
      selected.push(recommendation);
    } else if (compareRecommendationPriority(recommendation, selected[duplicateIndex]) < 0) {
      selected[duplicateIndex] = recommendation;
    }
  }

  return selected;
}

export function excludeSimilarRecommendations(recommendations = [], reserved = []) {
  return recommendations.filter((recommendation) =>
    !reserved.some((reservedRecommendation) => areSimilarRecommendations(reservedRecommendation, recommendation))
  );
}

export function areSimilarRecommendations(left, right) {
  if (!left || !right) return false;
  if (left.id && right.id && left.id === right.id) return true;

  const sameAction = actionGroup(left.action?.type) === actionGroup(right.action?.type);
  const sameCategory = normalizeValue(left.category) && normalizeValue(left.category) === normalizeValue(right.category);
  const sameType = left.type === right.type;
  const evidenceOverlap = overlapScore(evidenceTokens(left), evidenceTokens(right));
  const titleOverlap = overlapScore(titleTokens(left.title), titleTokens(right.title));

  if (sameType && sameCategory && (sameAction || evidenceOverlap >= 0.34)) return true;
  if (sameAction && sameCategory && (titleOverlap >= 0.45 || evidenceOverlap >= 0.34)) return true;
  return titleOverlap >= 0.72 && (sameAction || sameCategory);
}

function actionGroup(type) {
  return actionGroups[type] ?? type ?? 'none';
}

function normalizeValue(value) {
  return String(value ?? '').trim().toLowerCase();
}

function titleTokens(value) {
  return tokenize(value).filter((token) => !titleStopwords.has(token));
}

function evidenceTokens(recommendation) {
  return tokenize([recommendation.type, recommendation.category, ...(recommendation.evidence ?? [])].join(' '));
}

function tokenize(value) {
  return normalizeVietnamese(value)
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

function overlapScore(left, right) {
  if (!left.length || !right.length) return 0;
  const rightSet = new Set(right);
  const matches = new Set(left.filter((token) => rightSet.has(token)));
  return matches.size / Math.min(new Set(left).size, rightSet.size);
}

function normalizeVietnamese(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

const titleStopwords = new Set([
  'dang',
  'danh',
  'muc',
  'khoan',
  'thang',
  'gan',
  'day',
  'the',
  'can',
  'theo',
  'doi',
  'them',
  'cao',
  'hon',
  'khong',
]);
