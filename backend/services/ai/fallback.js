import {
  detectGroupParticipants,
  detectPaymentVerb,
  detectSelfPayer,
  extractNamedParticipants,
  getMemberDisplayName,
  inferCategory,
  inferExpenseTitle,
  normalizeVietnameseExpenseText,
  parseVietnameseAmount,
} from './utils.js';

export const parseWithFallback = (text, members, currentUser, selectedParticipants = []) => {
  const rawText = String(text || '');
  const normalizedText = normalizeVietnameseExpenseText(rawText);
  const amount = parseVietnameseAmount(rawText);
  const selfPayer = detectSelfPayer(rawText) && detectPaymentVerb(rawText);
  const payerNameMatch = members.find((member) => {
    const name = normalizeVietnameseExpenseText(getMemberDisplayName(member));
    return new RegExp(`(^|\\s)${name}\\s+(tra tien|thanh toan|tra ho|chi ho|tra|chi|ung|bao|moi|dai)\\b`).test(normalizedText);
  });
  const payerCandidate = normalizedText.match(/(?:^|\s)([a-z0-9]+)\s+(tra tien|thanh toan|tra ho|chi ho|tra|chi|ung|bao|moi|dai)\b/)?.[1];
  const payer = selfPayer
    ? getMemberDisplayName(currentUser)
    : payerNameMatch
      ? getMemberDisplayName(payerNameMatch)
      : payerCandidate || '';

  const namedParticipants = extractNamedParticipants(rawText, members);
  const participants = detectGroupParticipants(rawText)
    ? members.map(getMemberDisplayName)
    : namedParticipants.length > 0
      ? namedParticipants.map(getMemberDisplayName)
      : members.filter(m => selectedParticipants.includes(m.id) || selectedParticipants.includes(m.userId) || selectedParticipants.includes(m.guestMemberId)).map(getMemberDisplayName);

  return {
    title: inferExpenseTitle(rawText) || rawText.substring(0, 30) + (rawText.length > 30 ? '...' : ''),
    amount,
    payer,
    participants,
    category: inferCategory(rawText),
    date: new Date().toISOString().split('T')[0],
    splitType: 'equal',
    confidence: 0.3,
    signals: {
      amountDetected: amount > 0,
      payerMatched: selfPayer || Boolean(payerNameMatch),
      participantsMatched: detectGroupParticipants(rawText) || namedParticipants.length > 0,
    },
  };
};
