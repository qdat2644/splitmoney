import { Type } from '@google/genai';

export const expenseSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Ngắn gọn mô tả chi phí (ví dụ: Ăn lẩu, Tiền cafe)" },
    amount: { type: Type.NUMBER, description: "Số tiền (VND). Hiểu các từ lóng: k=1000, củ=1000000" },
    payer: { type: Type.STRING, description: "Tên người trả tiền" },
    participants: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Danh sách người tham gia chia tiền (nếu không rõ, bao gồm cả payer)"
    },
    category: { 
      type: Type.STRING, 
      description: "Danh mục: food, coffee, travel, shopping, hotel, entertainment, transport, other" 
    },
    date: { type: Type.STRING, description: "Ngày chi tiêu định dạng YYYY-MM-DD" },
    confidence: { type: Type.NUMBER, description: "Độ tự tin từ 0.0 đến 1.0. Chấm điểm dựa trên sự rõ ràng của câu." }
  },
  required: ["title", "amount", "payer", "participants", "category", "date", "confidence"]
};

export const planSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    estimatedTotalMin: { type: Type.NUMBER },
    estimatedTotalMax: { type: Type.NUMBER },
    recommendedTotal: { type: Type.NUMBER },
    budgetFitScore: { type: Type.NUMBER },
    budgetStatus: { type: Type.STRING },
    assumptions: { type: Type.ARRAY, items: { type: Type.STRING } },
    warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          category: { type: Type.STRING },
          estimatedAmountMin: { type: Type.NUMBER },
          estimatedAmountMax: { type: Type.NUMBER },
          recommendedAmount: { type: Type.NUMBER },
          splitType: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          notes: { type: Type.STRING }
        },
        required: ["title", "category", "estimatedAmountMin", "estimatedAmountMax", "recommendedAmount", "splitType", "confidence"]
      }
    }
  },
  required: ["title", "estimatedTotalMin", "estimatedTotalMax", "recommendedTotal", "budgetFitScore", "budgetStatus", "assumptions", "warnings", "items"]
};
