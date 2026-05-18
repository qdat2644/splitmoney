import { GoogleGenAI } from '@google/genai';
import { planSchema } from './schema.js';
import dotenv from 'dotenv';
import { logger } from '../../utils/logger.js';

dotenv.config();

let ai = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (e) {
  logger.warn('ai_plan_init_failed', { message: e.message });
}

const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export function generatePlanFallback(inputs) {
  const { prompt, destination, days, peopleCount, budget, style, transport } = inputs;
  const count = peopleCount || 1;
  const daysNum = days || 1;
  const isTrip = !!destination || (prompt && prompt.toLowerCase().includes('đi'));

  const b = budget || (count * daysNum * 1000000); // 1tr/person/day
  
  const items = [];
  if (isTrip) {
    items.push({ title: 'Di chuyển', category: 'transport', estimatedAmountMin: b*0.1, estimatedAmountMax: b*0.2, recommendedAmount: b*0.15, splitType: 'equal', confidence: 0.5, notes: transport || 'Chi phí đi lại' });
    items.push({ title: 'Lưu trú', category: 'accommodation', estimatedAmountMin: b*0.25, estimatedAmountMax: b*0.45, recommendedAmount: b*0.35, splitType: 'equal', confidence: 0.5, notes: style || 'Khách sạn/Homestay' });
    items.push({ title: 'Ăn uống', category: 'food', estimatedAmountMin: b*0.2, estimatedAmountMax: b*0.4, recommendedAmount: b*0.3, splitType: 'equal', confidence: 0.5, notes: 'Ăn uống hàng ngày' });
    items.push({ title: 'Vui chơi', category: 'entertainment', estimatedAmountMin: b*0.05, estimatedAmountMax: b*0.15, recommendedAmount: b*0.1, splitType: 'equal', confidence: 0.5, notes: 'Vé tham quan' });
    items.push({ title: 'Mua sắm & Dự phòng', category: 'other', estimatedAmountMin: b*0.05, estimatedAmountMax: b*0.15, recommendedAmount: b*0.1, splitType: 'equal', confidence: 0.5, notes: 'Phát sinh' });
  } else {
    items.push({ title: 'Chi phí chính', category: 'other', estimatedAmountMin: b*0.4, estimatedAmountMax: b*0.6, recommendedAmount: b*0.5, splitType: 'equal', confidence: 0.5, notes: 'Chi phí cốt lõi' });
    items.push({ title: 'Ăn uống', category: 'food', estimatedAmountMin: b*0.2, estimatedAmountMax: b*0.4, recommendedAmount: b*0.3, splitType: 'equal', confidence: 0.5, notes: 'F&B' });
    items.push({ title: 'Dự phòng', category: 'other', estimatedAmountMin: b*0.1, estimatedAmountMax: b*0.3, recommendedAmount: b*0.2, splitType: 'equal', confidence: 0.5, notes: 'Chi phí dự phòng' });
  }

  return {
    title: isTrip ? (destination ? `Chuyến đi ${destination}` : 'Kế hoạch du lịch') : 'Kế hoạch chi tiêu',
    estimatedTotalMin: b * 0.8,
    estimatedTotalMax: b * 1.2,
    recommendedTotal: b,
    budgetFitScore: 100,
    budgetStatus: 'ok',
    assumptions: ['Sử dụng mẫu dự phòng do AI không phản hồi'],
    warnings: ['Đây là ước tính tự động từ template, cần kiểm tra lại.'],
    items
  };
}

export const generatePlanWithAI = async (inputs) => {
  if (!ai) {
    logger.warn('ai_plan_fallback_used', { reason: 'gemini_not_initialized' });
    return generatePlanFallback(inputs);
  }

  const promptText = `
Bạn là chuyên gia tài chính lập kế hoạch. Hãy phân tích thông tin và tạo kế hoạch chi tiêu.
Đầu vào:
- Prompt nhanh: ${inputs.prompt || 'Không có'}
- Điểm đến: ${inputs.destination || 'Không xác định'}
- Số ngày: ${inputs.days || 'Không xác định'}
- Số người: ${inputs.peopleCount || 1}
- Ngân sách tổng (VND): ${inputs.budget || 'Không xác định'}
- Phong cách: ${inputs.style || 'Bình thường'}
- Di chuyển: ${inputs.transport || 'Không xác định'}
- Sở thích: ${inputs.preferences || 'Không có'}
- Hồ sơ chi tiêu quá khứ:
${inputs.profileContext || 'Không có dữ liệu'}

Quy tắc:
1. Trả về JSON theo đúng định dạng.
2. Số tiền phải hợp lý với thị trường Việt Nam (tính bằng VND).
3. Đưa ra khoảng chi phí min/max và recommended (tối đa 8 hạng mục).
4. Phân loại chuẩn (food, drinks, transport, accommodation, grocery, entertainment, other).
5. budgetFitScore từ 0-100 đánh giá độ khả thi.
6. Nếu budget quá thấp, cảnh báo trong warnings.
7. splitType nên là 'equal'.
`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: promptText,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: planSchema
      }
    });

    const parsed = JSON.parse(response.text);
    return parsed;
  } catch (error) {
    logger.error('ai_plan_failed', { message: error.message });
    return generatePlanFallback(inputs);
  }
};
