import prisma from '../../utils/db.js';
import { createExpenseForRoom } from '../expenseWriteService.js';
import { getImportSession, markImportSessionCommitted, markImportSessionCommitting } from './importPreviewService.js';

export async function commitImport({ importId, roomId, userId, memberMappings = {}, selectedRows = [] }, db = prisma) {
  const session = getImportSession(importId, { roomId, userId });
  if (!session) throw httpError('Phiên nhập dữ liệu không tồn tại hoặc đã hết hạn.', 404);
  if (session.committed || session.committing) throw httpError('Phiên nhập dữ liệu này đã được xử lý.', 409);

  const directory = await loadDirectory(roomId, db);
  validateMappings(memberMappings, directory);
  markImportSessionCommitting(importId);

  const createdGuestBySource = new Map();
  let createdExpenses = 0;
  let skippedRows = 0;
  let totalAmount = 0;
  const errors = [];
  const selected = new Set(selectedRows);

  for (const row of session.rows) {
    if (!selected.has(row.rowIndex)) continue;
    if (row.status === 'error') {
      skippedRows += 1;
      errors.push({ rowIndex: row.rowIndex, message: 'Dòng có lỗi chặn và đã bị bỏ qua.' });
      continue;
    }

    try {
      const payer = await resolveMapping(row.paidBySourceName, memberMappings, {
        roomId,
        userId,
        db,
        createdGuestBySource,
      });
      const participants = [];
      for (const sourceName of row.participantSourceNames) {
        const resolved = await resolveMapping(sourceName, memberMappings, {
          roomId,
          userId,
          db,
          createdGuestBySource,
        });
        const share = row.shares.find((item) => item.sourceName === sourceName);
        participants.push({
          userId: resolved.userId,
          guestMemberId: resolved.guestMemberId,
          ...(row.splitType === 'exact' ? { shareAmount: share?.shareAmount || 0 } : {}),
        });
      }

      if (participants.length === 0) throw httpError('Không còn người tham gia sau khi ghép thành viên.', 400);

      await createExpenseForRoom({
        roomId,
        createdByUserId: userId,
        title: row.title,
        amount: row.amount,
        category: row.category,
        note: null,
        splitType: row.splitType,
        paidByUserId: payer.userId,
        paidByGuestMemberId: payer.guestMemberId,
        date: row.date || new Date(),
        participants,
      }, db);

      createdExpenses += 1;
      totalAmount += row.amount;
    } catch (error) {
      skippedRows += 1;
      errors.push({ rowIndex: row.rowIndex, message: error.message });
    }
  }

  markImportSessionCommitted(importId);
  return {
    createdExpenses,
    createdGuests: createdGuestBySource.size,
    skippedRows,
    totalAmount,
    errors,
  };
}

async function resolveMapping(sourceName, mappings, context) {
  const mapping = mappings[sourceName];
  if (!mapping) throw httpError(`Chưa ghép thành viên cho "${sourceName}".`, 400);
  if (mapping.type === 'user') return { userId: mapping.id, guestMemberId: null };
  if (mapping.type === 'guest') return { userId: null, guestMemberId: mapping.id };
  if (mapping.type === 'create_guest') {
    if (context.createdGuestBySource.has(sourceName)) {
      return { userId: null, guestMemberId: context.createdGuestBySource.get(sourceName).id };
    }
    if (!mapping.displayName?.trim()) throw httpError(`Tên khách mới cho "${sourceName}" không hợp lệ.`, 400);
    const guest = await context.db.guestMember.create({
      data: {
        roomId: context.roomId,
        displayName: mapping.displayName.trim(),
        createdByUserId: context.userId,
      },
    });
    context.createdGuestBySource.set(sourceName, guest);
    return { userId: null, guestMemberId: guest.id };
  }
  throw httpError(`Kiểu ghép thành viên không hợp lệ cho "${sourceName}".`, 400);
}

async function loadDirectory(roomId, db) {
  const [members, guests] = await Promise.all([
    db.roomMember.findMany({ where: { roomId, status: 'approved' } }),
    db.guestMember.findMany({ where: { roomId, status: { not: 'removed' } } }),
  ]);
  return {
    userIds: new Set(members.map((member) => member.userId)),
    guestIds: new Set(guests.map((guest) => guest.id)),
  };
}

function validateMappings(mappings, directory) {
  Object.entries(mappings).forEach(([sourceName, mapping]) => {
    if (mapping.type === 'user' && !directory.userIds.has(mapping.id)) {
      throw httpError(`Thành viên ghép cho "${sourceName}" không thuộc phòng này.`, 400);
    }
    if (mapping.type === 'guest' && !directory.guestIds.has(mapping.id)) {
      throw httpError(`Khách ghép cho "${sourceName}" không thuộc phòng này.`, 400);
    }
    if (mapping.type === 'create_guest' && !mapping.displayName?.trim()) {
      throw httpError(`Tên khách mới cho "${sourceName}" không hợp lệ.`, 400);
    }
  });
}

function httpError(message, status) {
  return Object.assign(new Error(message), { status });
}
