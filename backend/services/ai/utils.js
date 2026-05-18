export const safeLower = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

export const getMemberDisplayName = (member) =>
  member?.displayName || member?.name || member?.username || member?.email || 'Unknown';

export const normalizeVietnameseExpenseText = (text) => {
  let str = safeLower(text);
  str = str.replace(/(\d)[.,](\d)/g, '$1_DOT_$2');
  str = str.replace(/[.,;:!?()[\]"]/g, ' ');
  str = str.replace(/_DOT_/g, '.');
  return str.replace(/\s+/g, ' ').trim();
};

export const parseVietnameseAmount = (text) => {
  const normalized = normalizeVietnameseExpenseText(text);
  const compoundMillion = normalized.match(/\b(\d+)\s*tr\s*(\d+)\b/);
  if (compoundMillion) {
    return Number(compoundMillion[1]) * 1000000 + Number(compoundMillion[2]) * 100000;
  }

  const amountMatch = normalized.match(/\b(\d+(?:\.\d+)?)\s*(trieu|tr|m|cu|nghin|k)?\b/);
  if (!amountMatch) return 0;

  const value = Number(amountMatch[1]);
  const unit = amountMatch[2];
  if (['trieu', 'tr', 'm', 'cu'].includes(unit)) return value * 1000000;
  if (['nghin', 'k'].includes(unit)) return value * 1000;
  return value;
};

export const detectSelfPayer = (text) =>
  /\b(toi|minh|tao|to|em)\b/.test(normalizeVietnameseExpenseText(text));

export const detectPaymentVerb = (text) =>
  /\b(tra tien|thanh toan|tra ho|chi ho|tra|chi|ung|bao|moi|dai)\b/.test(normalizeVietnameseExpenseText(text));

export const detectGroupParticipants = (text) =>
  /\b(tat ca|ca nhom|ca nha|moi nguoi|anh em|tui minh|team)\b/.test(normalizeVietnameseExpenseText(text));

const nameMatches = (text, member) => {
  const name = normalizeVietnameseExpenseText(getMemberDisplayName(member));
  return name && new RegExp(`(^|\\s)${name}(?=\\s|$)`).test(text);
};

export const extractNamedParticipants = (text, members) => {
  const normalized = normalizeVietnameseExpenseText(text);
  const participantSection = normalized.match(/\bcho\s+(.+)$/)?.[1];
  if (!participantSection || detectGroupParticipants(participantSection)) return [];
  return members.filter((member) => nameMatches(participantSection, member));
};

export const inferExpenseTitle = (text) => {
  const normalized = normalizeVietnameseExpenseText(text);
  const hints = [
    ['tra sua', 'Trà sữa'],
    ['an lau', 'Ăn lẩu'],
    ['an toi', 'Ăn tối'],
    ['ve xe', 'Vé xe'],
    ['khach san', 'Khách sạn'],
    ['cafe', 'Cafe'],
  ];
  return hints.find(([hint]) => normalized.includes(hint))?.[1] || '';
};

export const inferCategory = (text) => {
  const normalized = normalizeVietnameseExpenseText(text);
  if (/\b(an lau|an toi)\b/.test(normalized)) return 'food';
  if (/\b(cafe|tra sua)\b/.test(normalized)) return 'drinks';
  if (/\b(ve xe)\b/.test(normalized)) return 'transport';
  if (/\b(khach san)\b/.test(normalized)) return 'housing';
  return 'other';
};
