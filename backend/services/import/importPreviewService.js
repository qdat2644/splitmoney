import crypto from 'crypto';
import prisma from '../../utils/db.js';
import { parseWorkbookBuffer } from './excelImportParser.js';
import { buildPreviewSummary, validatePreviewRows } from './importValidators.js';
import { getRoomMemberDirectory, suggestMemberMatches } from './memberResolver.js';

const TTL_MS = 15 * 60 * 1000;
const sessions = new Map();

export async function createImportPreview({ roomId, userId, fileBuffer }, db = prisma) {
  cleanupExpiredSessions();
  const parsedRows = parseWorkbookBuffer(fileBuffer);
  const [existingExpenses, roomDirectory] = await Promise.all([
    db.expense.findMany({
      where: { roomId },
      include: {
        paidByUser: { select: { name: true } },
        paidByGuest: { select: { displayName: true } },
      },
    }),
    getRoomMemberDirectory(roomId, db),
  ]);

  const rows = validatePreviewRows(parsedRows, existingExpenses);
  const summary = buildPreviewSummary(rows);
  const members = suggestMemberMatches(summary.detectedMembers, roomDirectory);
  const session = createImportSession({ roomId, userId, rows, summary });

  return {
    importId: session.importId,
    summary,
    members,
    rows,
  };
}

export function createImportSession({ roomId, userId, rows, summary }) {
  const importId = crypto.randomUUID();
  const session = {
    importId,
    roomId,
    userId,
    rows,
    summary,
    createdAt: Date.now(),
    committed: false,
    committing: false,
  };
  sessions.set(importId, session);
  return session;
}

export function getImportSession(importId, { roomId, userId }) {
  cleanupExpiredSessions();
  const session = sessions.get(importId);
  if (!session || session.roomId !== roomId || session.userId !== userId) return null;
  return session;
}

export function markImportSessionCommitting(importId) {
  const session = sessions.get(importId);
  if (!session) return null;
  session.committing = true;
  return session;
}

export function markImportSessionCommitted(importId) {
  const session = sessions.get(importId);
  if (!session) return null;
  session.committing = false;
  session.committed = true;
  return session;
}

export function clearImportSessions() {
  sessions.clear();
}

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (now - session.createdAt > TTL_MS) sessions.delete(key);
  }
}
