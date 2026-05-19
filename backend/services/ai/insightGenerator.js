import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { formatCurrencyText } from '../../utils/currencyFormatter.js';
import { logger } from '../../utils/logger.js';
dotenv.config();

let ai = null;
try {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} catch (error) {
  logger.warn('ai_insight_init_failed', { message: error.message });
}

const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const VALID_TYPES = new Set([
  'spending',
  'debt',
  'trend',
  'suggestion',
  'positive',
  'warning',
  'improvement',
  'worsening',
  'recurring_rhythm',
  'stabilization',
  'anomaly_shift',
  'habit_reinforcement',
]);
const VALID_SEVERITIES = new Set(['info', 'positive', 'warning']);
const insightSchema = {
  type: Type.OBJECT,
  properties: {
    insights: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING },
          title: { type: Type.STRING },
          message: { type: Type.STRING },
          severity: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
        },
        required: ['type', 'title', 'message', 'severity', 'confidence'],
      },
    },
  },
  required: ['insights'],
};

export async function generateAIInsights({ summary, analytics, profileContext }) {
  if (!ai) throw new Error('Gemini client not initialized');

  const categoryLines = summary.categoryBreakdown
    .slice(0, 6)
    .map((item) => `  - ${item.category}: ${(item.amount / 1000).toFixed(0)}k VND`)
    .join('\n');
  const roomLines = summary.roomBreakdown
    .slice(0, 4)
    .map((item, index) => `  - room_${index + 1}: ${(item.amount / 1000).toFixed(0)}k VND`)
    .join('\n');
  const trendLines = analytics.monthlyTrend
    .slice(-6)
    .map((item) => `  - ${item.month}: ${(item.amount / 1000).toFixed(0)}k VND`)
    .join('\n');
  const recentLines = summary.recentExpenses
    .slice(0, 5)
    .map((item) => `  - ${item.category}: ${(item.myShareAmount / 1000).toFixed(0)}k VND`)
    .join('\n');
  const recurringLines = analytics.recurringCandidates
    .slice(0, 4)
    .map((item) => `  - ${item.category} (${item.frequency}): ${(item.estimatedAmount / 1000).toFixed(0)}k VND`)
    .join('\n');
  const anomalyLines = analytics.anomalies
    .slice(0, 4)
    .map((item) => `  - ${item.type}: ${item.severity}`)
    .join('\n');

  const prompt = `
Ban la tro ly phan tich tai chinh ca nhan. Hay tao toi da 5 nhan xet ngan gon, thuc te, dua tren du lieu tong hop sau.

Du lieu tong quan
- So phong dang tham gia: ${summary.activeRoomsCount}
- Chi tieu thang nay: ${(summary.totalSpentThisMonth / 1000).toFixed(0)}k VND
- Dang no: ${(summary.totalIOwe / 1000).toFixed(0)}k VND
- Duoc no: ${(summary.totalOwedToMe / 1000).toFixed(0)}k VND
- So du rong: ${(summary.netBalance / 1000).toFixed(0)}k VND

Danh muc chi tieu
${categoryLines || '  - Khong co'}

Phong chi tieu
${roomLines || '  - Khong co'}

Xu huong 6 thang
${trendLines || '  - Khong co'}

Giao dich gan day
${recentLines || '  - Khong co'}

Du bao
- Tong chi cuoi thang: ${(analytics.forecast.forecastMonthTotal / 1000).toFixed(0)}k VND
- Do tin cay: ${Math.round((analytics.forecast.confidence || 0) * 100)}%
- Xu huong no: ${analytics.forecast.debtTrendDirection}

Toc do chi
- Da chi toi nay: ${((analytics.spendingVelocity.spentToDate || 0) / 1000).toFixed(0)}k VND
- Trung binh ngay: ${((analytics.spendingVelocity.dailyAverage || 0) / 1000).toFixed(0)}k VND

Tinh trang ngan sach
- Theo doi: ${analytics.budgetHealth.trackedBudgets}
- Vuot han: ${analytics.budgetHealth.overBudgetCount}
- Co nguy co: ${analytics.budgetHealth.atRiskCount}

Khoan lap lai
${recurringLines || '  - Khong co'}

Bat thuong
${anomalyLines || '  - Khong co'}

${profileContext ? profileContext + '\n' : ''}
Yeu cau
- Toi da 5 nhan xet, moi nhan xet duoi 40 tu.
- Giong van: binh tinh, tu nhien, ho tro, khong gay hoang mang.
- Viet nhu tro ly tai chinh ca nhan, khong viet nhu dashboard BI hay canh bao he thong.
- Tranh cac tu "phat hien", "dot bien", "canh bao", "bat thuong" neu khong that su can.
- Neu nhac tien, dinh dang theo Tieng Viet va them "đ" (vi du 8.468.334đ), khong de so nguyen tho.
- Khong dua loi khuyen dau tu, phap ly, y te.
- Khong suy doan ngoai du lieu tong hop o tren.
- Khong liet ke thong tin dinh danh hay du lieu nhay cam.
- type thuoc: spending, debt, trend, suggestion, positive, warning, improvement, worsening, recurring_rhythm, stabilization, anomaly_shift, habit_reinforcement.
- severity thuoc: info, positive, warning.
- confidence bat buoc tu 0 den 1.
- Ngon ngu: Tieng Viet.
`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      temperature: 0.2,
      responseMimeType: 'application/json',
      responseSchema: insightSchema,
    },
  });

  return validateAndFilter(JSON.parse(response.text)?.insights ?? []);
}

function validateAndFilter(items) {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) =>
      item &&
      VALID_TYPES.has(item.type) &&
      typeof item.title === 'string' &&
      item.title.trim() &&
      typeof item.message === 'string' &&
      item.message.trim() &&
      VALID_SEVERITIES.has(item.severity) &&
      typeof item.confidence === 'number' &&
      item.confidence >= 0 &&
      item.confidence <= 1
    )
    .map((item) => ({
      type: item.type,
      title: formatCurrencyText(item.title.trim()).slice(0, 80),
      message: formatCurrencyText(item.message.trim()).slice(0, 300),
      severity: item.severity,
      confidence: item.confidence,
    }))
    .slice(0, 5);
}
