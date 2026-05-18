import { GoogleGenAI } from '@google/genai';
import { expenseSchema } from './schema.js';
import dotenv from 'dotenv';
import { logger } from '../../utils/logger.js';

dotenv.config();

let ai = null;
try {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
} catch (e) {
  logger.warn('ai_expense_init_failed', { message: e.message });
}

const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

export const parseWithGemini = async (text, memberNames, currentUser) => {
  if (!ai) throw new Error("Gemini client is not initialized. Check your API key.");

  const prompt = `
Bạn là trợ lý ảo phân tích chi tiêu. Hãy trích xuất thông tin từ câu: "${text}"

Danh sách thành viên: [${memberNames.join(', ')}].
Người đang nhập liệu ("tôi", "mình", "tao"): ${currentUser.name}.

Quy tắc:
1. Trả về JSON hợp lệ theo schema.
2. participants mặc định bao gồm payer nếu hợp ngữ cảnh.
3. Nếu chứa "cả nhóm/team", thêm toàn bộ thành viên vào participants.
4. amount là số nguyên (ví dụ: "350k" -> 350000).
5. date so với ngày hiện tại (${new Date().toISOString().split('T')[0]}). Mặc định là hôm nay.
6. Khi câu nói chứa "tôi", "mình", "tao", hãy sử dụng tên "${currentUser.name}".
`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: expenseSchema
      }
    });

    return JSON.parse(response.text);
  } catch (error) {
    if (error.status === 429) {
      throw new Error("Tài khoản Gemini đã hết tín dụng (429 RESOURCE_EXHAUSTED).");
    }
    logger.error('ai_expense_parse_failed', { message: error.message });
    throw error;
  }
};
