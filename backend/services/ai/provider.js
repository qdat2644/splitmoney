import { parseWithGemini } from './gemini.js';

export const parseExpenseAI = async (text, memberNames, currentUser) => {
  return await parseWithGemini(text, memberNames, currentUser);
};
