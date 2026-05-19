import { buildRiskRecommendations } from './riskEngine.js';
import { buildOpportunityRecommendations } from './opportunityEngine.js';
import { serializeRecommendation } from './copilotSerializer.js';

const severityWeight = { critical: 3, warning: 2, info: 1 };
const ACTION_GROUPS = {
  open_budget: 'budget',
  create_budget: 'budget',
  create_recurring_budget: 'budget',
  open_forecasts: 'forecast',
  open_analytics: 'forecast',
  review_settlements: 'settlement',
};

export function buildRecommendations(context) {
  return dedupeRecommendations([
    ...buildRiskRecommendations(context),
    ...buildOpportunityRecommendations(context),
    ...buildTemporalRecommendations(context),
  ]).sort(compareRecommendationPriority);
}

export function dedupeRecommendations(recommendations) {
  const selected = [];

  for (const recommendation of recommendations) {
    const duplicateIndex = selected.findIndex((existing) => areSimilarRecommendations(existing, recommendation));
    if (duplicateIndex === -1) {
      selected.push(recommendation);
      continue;
    }

    if (compareRecommendationPriority(recommendation, selected[duplicateIndex]) < 0) {
      selected[duplicateIndex] = recommendation;
    }
  }

  return selected;
}

export function compareRecommendationPriority(left, right) {
  const severityDelta = (severityWeight[right.severity] ?? 0) - (severityWeight[left.severity] ?? 0);
  if (severityDelta !== 0) return severityDelta;
  const leftScore = (left.confidence ?? 0) + (left.priorityBoost ?? 0);
  const rightScore = (right.confidence ?? 0) + (right.priorityBoost ?? 0);
  return rightScore - leftScore;
}

function buildTemporalRecommendations({ profile, createdAt }) {
  const memory = profile?.temporalMemory;
  if (!memory || memory.dataQuality?.isSparse) return [];

  const recommendations = [];
  const rolling = memory.historicalComparisons?.rolling7DayTrend;
  if (rolling?.confidence >= 0.6 && rolling.direction === 'up') {
    recommendations.push(serializeRecommendation({
      id: 'temporal:rolling-7-up',
      type: 'temporal_worsening',
      personality: 'gentle_warning',
      title: '7 ngày gần đây đang chi nhanh hơn',
      description: 'Nhịp chi tuần này cao hơn tuần trước. Bạn có thể xem lại các khoản mới nhất trước khi xu hướng này kéo dài.',
      severity: 'warning',
      confidence: rolling.confidence,
      priorityBoost: 0.18,
      evidence: ['7 ngày gần đây', 'So với 7 ngày trước'],
      action: { type: 'open_forecasts', label: 'Xem xu hướng', to: '/forecasts' },
      createdAt,
    }));
  }

  const categoryGrowth = memory.historicalComparisons?.categoryMomentum
    ?.find((item) => item.direction === 'up' && item.confidence >= 0.58);
  if (categoryGrowth) {
    recommendations.push(serializeRecommendation({
      id: `temporal:category-growth:${categoryGrowth.category}`,
      type: 'temporal_category_growth',
      category: categoryGrowth.category,
      personality: 'supportive_guidance',
      title: `Danh mục “${formatCategoryLabel(categoryGrowth.category)}” đang tăng dần`,
      description: `Danh mục này cao hơn tháng trước khoảng ${Math.abs(Math.round(categoryGrowth.deltaPct))}%. Đây là tín hiệu theo thời gian, không phải cảnh báo tức thì.`,
      severity: 'info',
      confidence: categoryGrowth.confidence,
      priorityBoost: 0.1,
      evidence: ['So với tháng trước', 'Tăng dần'],
      action: { type: 'open_forecasts', label: 'Xem xu hướng', to: '/forecasts' },
      createdAt,
    }));
  }

  const improvement = memory.improvingAreas?.find((item) => item.confidence >= 0.6);
  if (improvement) {
    recommendations.push(serializeRecommendation({
      id: `temporal:improvement:${improvement.type}:${improvement.category ?? 'overall'}`,
      type: 'temporal_improvement',
      category: improvement.category,
      personality: 'positive_reinforcement',
      title: improvement.label,
      description: 'Zyra thấy tín hiệu này từ dữ liệu chi tiêu theo thời gian. Bạn có thể tiếp tục giữ nhịp hiện tại nếu nó phù hợp với kế hoạch.',
      severity: 'info',
      confidence: improvement.confidence,
      priorityBoost: -0.12,
      evidence: ['Ổn định hơn', 'So với giai đoạn trước'],
      action: { type: 'open_forecasts', label: 'Xem xu hướng', to: '/forecasts' },
      createdAt,
    }));
  }

  const recurring = memory.recurringPatterns?.find((item) => item.confidence >= 0.68);
  if (recurring) {
    recommendations.push(serializeRecommendation({
      id: `temporal:recurring:${normalizeValue(recurring.title)}:${recurring.cadence}`,
      type: 'temporal_recurring_rhythm',
      category: recurring.category,
      personality: 'supportive_guidance',
      title: `${recurring.title} gần như theo chu kỳ`,
      description: recurring.cadence === 'weekly'
        ? 'Khoản này xuất hiện khá đều mỗi tuần. Một hạn mức nhỏ có thể giúp bạn theo dõi mà không cần kiểm tra thủ công.'
        : 'Khoản này xuất hiện khá đều mỗi tháng. Theo dõi riêng sẽ giúp dự báo tháng gọn hơn.',
      severity: 'info',
      confidence: recurring.confidence,
      priorityBoost: 0.08,
      evidence: ['Theo chu kỳ', `${recurring.occurrences} lần xuất hiện`],
      action: { type: 'create_recurring_budget', label: 'Tạo ngân sách', to: '/budget' },
      createdAt,
    }));
  }

  return recommendations;
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
  return ACTION_GROUPS[type] ?? type ?? 'none';
}

function normalizeValue(value) {
  return String(value ?? '').trim().toLowerCase();
}

function titleTokens(value) {
  return tokenize(value).filter((token) => !TITLE_STOPWORDS.has(token));
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
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd');
}

const TITLE_STOPWORDS = new Set([
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

function formatCategoryLabel(category) {
  return {
    food: 'Ăn uống',
    drinks: 'Đồ uống',
    transport: 'Di chuyển',
    housing: 'Nhà ở',
    accommodation: 'Lưu trú',
    entertainment: 'Giải trí',
    shopping: 'Mua sắm',
    other: 'Khác',
  }[category] ?? category;
}
