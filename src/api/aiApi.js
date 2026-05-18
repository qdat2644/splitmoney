export const parseExpenseFromAI = async (text, members) => {
  const response = await fetch('/api/ai/parse-expense', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text, members })
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'Lỗi khi gọi AI service');
  }

  // Return the full result including data, isFallback, confidence
  return result;
};
