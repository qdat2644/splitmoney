import { getMemberDisplayName, safeLower } from './utils.js';

const WHOLE_GROUP_ALIASES = new Set([
  'tat ca',
  'ca nhom',
  'ca nha',
  'moi nguoi',
  'anh em',
  'tui minh',
  'team',
]);

const findMemberByName = (members, value) => {
  const needle = safeLower(value);
  if (!needle) return null;
  return members.find((member) => safeLower(getMemberDisplayName(member)) === needle)
    || members.find((member) => {
      const haystack = safeLower(getMemberDisplayName(member));
      return haystack.includes(needle) || needle.includes(haystack);
    })
    || null;
};

export const validateParsedData = (data, members) => {
  const errors = [];
  const warnings = [];

  if (!data) return { valid: false, errors: ['Data is null'], warnings: [] };
  if (!data.title || typeof data.title !== 'string') errors.push('Tiêu đề không hợp lệ.');
  if (typeof data.amount !== 'number' || Number.isNaN(data.amount) || data.amount <= 0) {
    errors.push('AI chưa tìm thấy số tiền trong câu này.');
  }

  if (!safeLower(data.payer)) {
    warnings.push('AI chưa xác định được người trả. Vui lòng chọn thủ công.');
  }

  const normalizedPayer = findMemberByName(members, data.payer);
  if (safeLower(data.payer) && !normalizedPayer) {
    const displayPayer = data.payer.charAt(0).toUpperCase() + data.payer.slice(1);
    warnings.push(`Không tìm thấy người trả tên ${displayPayer}. Vui lòng chọn thủ công.`);
  }
  data.payer = normalizedPayer ? getMemberDisplayName(normalizedPayer) : '';

  if (!Array.isArray(data.participants) || data.participants.length === 0) {
    warnings.push('AI chưa xác định được người tham gia, đã giữ lựa chọn hiện tại.');
    data.participants = [];
  } else {
    const validParticipants = [];
    for (const participant of data.participants) {
      if (WHOLE_GROUP_ALIASES.has(safeLower(participant))) {
        members.forEach((member) => {
          const displayName = getMemberDisplayName(member);
          if (!validParticipants.includes(displayName)) validParticipants.push(displayName);
        });
        continue;
      }

      const match = findMemberByName(members, participant);
      const displayName = match ? getMemberDisplayName(match) : null;
      if (displayName && !validParticipants.includes(displayName)) validParticipants.push(displayName);
    }
    if (validParticipants.length === 0) {
      warnings.push('AI chưa xác định được người tham gia, đã giữ lựa chọn hiện tại.');
    }
    data.participants = validParticipants;
  }

  if (typeof data.confidence !== 'number') data.confidence = 0.8;

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    data,
  };
};
