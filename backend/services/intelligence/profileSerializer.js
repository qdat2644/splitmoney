/**
 * Serializes the financial profile into a concise, privacy-safe string format for LLM prompts.
 */
function serializeProfileForPrompt(profileData) {
  if (!profileData || !profileData.traits) return "User profile: unknown (new user)";

  const { traits } = profileData;
  const parts = [];

  // Spending Style
  if (traits.spendingStyle && traits.spendingStyle.confidence > 0.3) {
    parts.push(`Spending Style: ${traits.spendingStyle.type}`);
  }

  // Volatility
  if (traits.volatility && traits.volatility.confidence > 0.3) {
    parts.push(`Spending Volatility: ${traits.volatility.level}`);
  }

  // Category Preferences
  if (traits.categoryPreferences && traits.categoryPreferences.confidence > 0.3) {
    if (traits.categoryPreferences.topCategories.length > 0) {
      parts.push(`Top Categories: ${traits.categoryPreferences.topCategories.join(', ')}`);
    }
  }

  // Budget Discipline
  if (traits.budgetDiscipline && traits.budgetDiscipline.confidence > 0.3) {
    parts.push(`Budget Discipline: ${traits.budgetDiscipline.level}`);
  }

  // Planning Accuracy
  if (traits.planningAccuracy && traits.planningAccuracy.confidence > 0.3) {
    parts.push(`Planning Accuracy: ${traits.planningAccuracy.level}`);
  }

  if (parts.length === 0) {
    return "User Profile Context: sparse history, not enough data to infer strong traits.";
  }

  return `User Profile Context:\n- ${parts.join('\n- ')}`;
}

export {
  serializeProfileForPrompt
};
