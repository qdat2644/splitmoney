import prisma from '../../utils/db.js';
import { safeLower } from '../ai/utils.js';

export function normalizeSourceName(value) {
  return safeLower(value).replace(/\s+/g, ' ');
}

export async function getRoomMemberDirectory(roomId, db = prisma) {
  const [users, guests] = await Promise.all([
    db.roomMember.findMany({
      where: { roomId, status: 'approved' },
      include: { user: { select: { id: true, name: true } } },
    }),
    db.guestMember.findMany({
      where: { roomId, status: { not: 'removed' } },
      select: { id: true, displayName: true },
    }),
  ]);

  return [
    ...users.map((member) => ({ type: 'user', id: member.user.id, displayName: member.user.name })),
    ...guests.map((guest) => ({ type: 'guest', id: guest.id, displayName: guest.displayName })),
  ];
}

export function suggestMemberMatches(sourceNames, roomDirectory) {
  return uniqueSourceNames(sourceNames).map((sourceName) => ({
    sourceName,
    suggestedMatch: suggestMemberMatch(sourceName, roomDirectory),
  }));
}

export function suggestMemberMatch(sourceName, roomDirectory) {
  const normalizedSource = normalizeSourceName(sourceName);
  if (!normalizedSource) return noneMatch();

  const exact = roomDirectory.find((member) => normalizeSourceName(member.displayName) === normalizedSource);
  if (exact) return toMatch(exact, 1);

  const partialMatches = roomDirectory.filter((member) => {
    const normalizedMember = normalizeSourceName(member.displayName);
    return normalizedMember.includes(normalizedSource) || normalizedSource.includes(normalizedMember);
  });
  if (partialMatches.length === 1) return toMatch(partialMatches[0], 0.65);

  return noneMatch();
}

function uniqueSourceNames(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = normalizeSourceName(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toMatch(member, confidence) {
  return {
    type: member.type,
    id: member.id,
    displayName: member.displayName,
    confidence,
  };
}

function noneMatch() {
  return {
    type: 'none',
    id: null,
    displayName: null,
    confidence: 0,
  };
}
