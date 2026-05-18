import { parseExpenseAI } from './provider.js';
import { parseWithFallback } from './fallback.js';
import { validateParsedData } from './validator.js';
import { getMemberDisplayName } from './utils.js';

export const extractAndValidateExpense = async (text, members, currentUser, selectedParticipants = []) => {
  let rawData = parseWithFallback(text, members, currentUser, selectedParticipants);
  let isFallback = false;
  let errors = [];

  try {
    console.log("[AI Parser] Sending request to AI provider for:", text);
    const aiData = await parseExpenseAI(text, members.map(getMemberDisplayName), currentUser);
    console.log("[AI Parser] AI response received:", aiData);
    rawData = {
      ...aiData,
      ...rawData,
      title: rawData.title || aiData.title,
      amount: rawData.amount || aiData.amount,
      payer: rawData.payer || aiData.payer,
      participants: rawData.participants?.length ? rawData.participants : aiData.participants,
      category: rawData.category !== 'other' ? rawData.category : aiData.category,
      confidence: Math.max(rawData.confidence || 0, aiData.confidence || 0),
      signals: rawData.signals,
    };
  } catch (error) {
    console.error("[AI Parser] Provider failed:", error.message);
    console.log("[AI Parser] Continuing with deterministic parser...");
    isFallback = true;
    errors.push(error.message);
  }

  const validation = validateParsedData(rawData, members);
  
  if (!validation.valid) {
    console.warn("[AI Parser] Validation failed:", validation.errors);
    if (!isFallback) {
       console.log("[AI Parser] Attempting fallback due to invalid AI output");
       rawData = parseWithFallback(text, members, currentUser, selectedParticipants);
       const fallbackValidation = validateParsedData(rawData, members);
       return { ...fallbackValidation, isFallback: true, apiErrors: errors };
    }
  }

  return { ...validation, isFallback, apiErrors: errors };
};
