import prisma from '../utils/db.js';
import { resolveShares } from '../utils/settlement.js';

export async function listPlans(userId) {
  const plans = await prisma.plan.findMany({
    where: {
      OR: [
        { createdByUserId: userId },
        { participants: { some: { userId } } },
        { room: { members: { some: { userId, status: 'approved' } } } },
      ],
    },
    include: {
      participants: { include: { user: { select: { id: true, name: true } }, guestMember: true } },
      expenses: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return attachTrackingSummaries(plans);
}

export async function createPlan(userId, body) {
  const { name, description, type, startDate, endDate, roomId, participants = [] } = body;
  const targetBudgetAmount = normalizeOptionalMoney(body.targetBudgetAmount, 'Ngan sach muc tieu');
  if (!name?.trim()) throw httpError('Ten ke hoach khong duoc de trong.', 400);
  validateDates(startDate, endDate);
  if (roomId) await assertApprovedRoomMember(roomId, userId);
  const normalizedParticipants = await normalizeParticipants({ roomId, participants, ownerUserId: userId });

  const plan = await prisma.plan.create({
    data: {
      name: name.trim(),
      description: description ?? null,
      type: type ?? 'custom',
      status: 'draft',
      roomId: roomId ?? null,
      targetBudgetAmount: targetBudgetAmount ?? null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      createdByUserId: userId,
      participants: { create: normalizedParticipants },
    },
    include: planInclude,
  });

  return withTrackingSummary(plan);
}

export async function updatePlan(planId, userId, body) {
  const plan = await assertCanManagePlan(planId, userId);
  validateDates(body.startDate ?? plan.startDate, body.endDate ?? plan.endDate);
  const targetBudgetAmount = normalizeOptionalMoney(body.targetBudgetAmount, 'Ngan sach muc tieu');

  const updated = await prisma.plan.update({
    where: { id: planId },
    data: {
      name: body.name?.trim() || plan.name,
      description: body.description ?? plan.description,
      type: body.type ?? plan.type,
      status: body.status ?? plan.status,
      ...(targetBudgetAmount !== undefined ? { targetBudgetAmount } : {}),
      startDate: body.startDate === null ? null : body.startDate ? new Date(body.startDate) : plan.startDate,
      endDate: body.endDate === null ? null : body.endDate ? new Date(body.endDate) : plan.endDate,
    },
    include: planInclude,
  });

  return withTrackingSummary(updated);
}

export async function updatePlanParticipants(planId, userId, body) {
  const plan = await assertCanManagePlan(planId, userId, { includeParticipants: true, includeExpenses: true });
  const normalizedParticipants = await normalizeParticipants({
    roomId: plan.roomId,
    participants: body.participants,
    ownerUserId: plan.createdByUserId,
  });

  const removed = plan.participants.filter((existing) =>
    !normalizedParticipants.some((next) => sameParticipant(existing, next))
  );
  assertNoConvertedParticipantRemoval(plan.expenses, removed);

  const oldDefaultKeys = plan.participants.map(participantKey).sort().join('|');
  const nextDefaultPayload = normalizedParticipants.map(toExpenseParticipant);

  await prisma.$transaction(async (tx) => {
    await tx.planParticipant.deleteMany({ where: { planId } });
    await tx.planParticipant.createMany({
      data: normalizedParticipants.map((participant) => ({ planId, ...participant })),
    });

    for (const expense of plan.expenses.filter((item) => !item.convertedToExpenseId)) {
      const currentParticipants = parsePlanExpenseParticipants(expense.participants);
      const currentKeys = currentParticipants.map(participantKey).sort().join('|');
      const shouldFollowPlanDefaults = currentKeys === oldDefaultKeys;
      const withoutRemoved = currentParticipants.filter((participant) =>
        !removed.some((item) => sameParticipant(item, participant))
      );
      const nextParticipants = shouldFollowPlanDefaults ? nextDefaultPayload : withoutRemoved;
      if (nextParticipants.length === 0) throw httpError('Khong the xoa tat ca nguoi tham gia khoi muc ke hoach.', 409);
      if (shouldFollowPlanDefaults || withoutRemoved.length !== currentParticipants.length) {
        await tx.planExpense.update({
          where: { id: expense.id },
          data: { participants: JSON.stringify(nextParticipants) },
        });
      }
    }
  });

  const updated = await prisma.plan.findUnique({ where: { id: planId }, include: planInclude });
  return withTrackingSummary(updated);
}

export async function deletePlan(planId, userId) {
  await assertCanManagePlan(planId, userId);
  await prisma.plan.delete({ where: { id: planId } });
  return { success: true };
}

export async function addPlanExpense(planId, userId, body) {
  await assertPlanMember(planId, userId);
  const { title, estimatedAmount, category, splitType, note, participants } = body;
  if (!title?.trim()) throw httpError('Ten khoan chi khong duoc de trong.', 400);
  if (typeof estimatedAmount !== 'number' || estimatedAmount <= 0) throw httpError('So tien uoc tinh phai lon hon 0.', 400);
  if (!Array.isArray(participants) || participants.length === 0) throw httpError('Can co it nhat mot nguoi tham gia.', 400);

  resolveShares(estimatedAmount, splitType ?? 'equal', participants);
  const planExpense = await prisma.planExpense.create({
    data: {
      planId,
      title: title.trim(),
      estimatedAmount,
      category: category ?? 'other',
      splitType: splitType ?? 'equal',
      note: note ?? null,
      participants: JSON.stringify(participants),
    },
  });
  await recalcPlanTotal(planId);
  return planExpense;
}

export async function updatePlanExpense(planExpenseId, userId, body) {
  const pe = await prisma.planExpense.findUnique({ where: { id: planExpenseId } });
  if (!pe) throw httpError('Khong tim thay muc ke hoach.', 404);
  if (pe.convertedToExpenseId) throw httpError('Khong the sua muc da chuyen thanh khoan chi thuc te.', 409);
  await assertPlanMember(pe.planId, userId);

  const estimatedAmount = body.estimatedAmount ?? pe.estimatedAmount;
  const category = body.category ?? pe.category;
  const splitType = body.splitType ?? pe.splitType;
  const participants = body.participants ?? parsePlanExpenseParticipants(pe.participants);
  if (typeof estimatedAmount !== 'number' || estimatedAmount <= 0) throw httpError('So tien uoc tinh phai lon hon 0.', 400);
  if (!Array.isArray(participants) || participants.length === 0) throw httpError('Can co it nhat mot nguoi tham gia.', 400);
  resolveShares(estimatedAmount, splitType, participants);

  const updated = await prisma.planExpense.update({
    where: { id: planExpenseId },
    data: {
      title: body.title?.trim() || pe.title,
      estimatedAmount,
      category,
      splitType,
      note: body.note ?? pe.note,
      participants: JSON.stringify(participants),
    },
  });
  await recalcPlanTotal(pe.planId);
  return updated;
}

export async function deletePlanExpense(planExpenseId, userId) {
  const pe = await prisma.planExpense.findUnique({ where: { id: planExpenseId } });
  if (!pe) throw httpError('Khong tim thay muc ke hoach.', 404);
  await assertPlanMember(pe.planId, userId);
  await prisma.planExpense.delete({ where: { id: planExpenseId } });
  await recalcPlanTotal(pe.planId);
  return { success: true };
}

export async function convertPlanExpenseToReal(planExpenseId, userId, { roomId, paidByUserId, paidByGuestMemberId, date, participantMapping }) {
  const pe = await prisma.planExpense.findUnique({ where: { id: planExpenseId } });
  if (!pe) throw httpError('Khong tim thay muc ke hoach.', 404);
  if (pe.convertedToExpenseId) throw httpError('Muc nay da duoc chuyen doi thanh khoan chi thuc te.', 409);
  await assertPlanMember(pe.planId, userId);

  let participants = parsePlanExpenseParticipants(pe.participants);
  if (participantMapping) {
    participants = participants.map((participant) => {
      if (participant.type === 'manual' && participant.displayName && participantMapping[participant.displayName]) {
        const mapped = participantMapping[participant.displayName];
        return {
          ...participant,
          userId: mapped.type === 'user' ? mapped.id : null,
          guestMemberId: mapped.type === 'guest' ? mapped.id : null,
          type: mapped.type,
        };
      }
      return participant;
    });
  }

  const withShares = resolveShares(pe.estimatedAmount, pe.splitType, participants);
  const expense = await prisma.expense.create({
    data: {
      roomId,
      planId: pe.planId,
      sourcePlanExpenseId: pe.id,
      title: pe.title,
      amount: pe.estimatedAmount,
      category: pe.category,
      splitType: pe.splitType,
      note: pe.note,
      paidByUserId: paidByUserId ?? null,
      paidByGuestMemberId: paidByGuestMemberId ?? null,
      createdByUserId: userId,
      date: date ? new Date(date) : new Date(),
      participants: {
        create: withShares.map((participant) => ({
          userId: participant.userId ?? null,
          guestMemberId: participant.guestMemberId ?? null,
          shareAmount: participant.shareAmount,
        })),
      },
    },
    include: { participants: true },
  });

  await prisma.planExpense.update({
    where: { id: planExpenseId },
    data: { convertedToExpenseId: expense.id },
  });
  return { expense, planExpense: pe };
}

export function buildPlanTrackingSummary(plan, actualExpenses = []) {
  const plannedExpenses = plan.expenses ?? [];
  const targetBudgetAmount = normalizeNumberOrNull(plan.targetBudgetAmount);
  const plannedTotal = plannedExpenses.reduce((sum, expense) => sum + normalizeAmount(expense.estimatedAmount), 0);
  const uniqueActualExpenses = Array.from(new Map(
    actualExpenses.filter(Boolean).map((expense) => [expense.id, expense])
  ).values());
  const actualTotal = uniqueActualExpenses.reduce((sum, expense) => sum + normalizeAmount(expense.amount), 0);
  const budgetReference = targetBudgetAmount ?? plannedTotal;
  const hasBudgetReference = budgetReference > 0;
  const remainingAmount = hasBudgetReference ? budgetReference - actualTotal : 0;
  const progressPercent = hasBudgetReference ? (actualTotal / budgetReference) * 100 : 0;
  const varianceAmount = hasBudgetReference ? actualTotal - budgetReference : 0;
  const variancePercent = hasBudgetReference ? (varianceAmount / budgetReference) * 100 : null;

  const status = !hasBudgetReference
    ? 'no_budget'
    : progressPercent > 100
      ? 'over_budget'
      : progressPercent >= 85
        ? 'near_limit'
        : 'under_budget';

  const plannedByCategory = new Map();
  for (const expense of plannedExpenses) {
    const category = expense.category || 'other';
    plannedByCategory.set(category, (plannedByCategory.get(category) || 0) + normalizeAmount(expense.estimatedAmount));
  }

  const actualByCategory = new Map();
  for (const expense of uniqueActualExpenses) {
    const category = expense.category || 'other';
    actualByCategory.set(category, (actualByCategory.get(category) || 0) + normalizeAmount(expense.amount));
  }

  const categoryBreakdown = Array.from(new Set([...plannedByCategory.keys(), ...actualByCategory.keys()]))
    .sort()
    .map((category) => {
      const plannedAmount = plannedByCategory.get(category) || 0;
      const actualAmount = actualByCategory.get(category) || 0;
      const categoryVariance = actualAmount - plannedAmount;
      return {
        category,
        plannedAmount,
        actualAmount,
        varianceAmount: categoryVariance,
        variancePercent: plannedAmount > 0 ? (categoryVariance / plannedAmount) * 100 : null,
      };
    });

  const itemBreakdown = plannedExpenses.map((plannedExpense) => {
    const itemActualTotal = uniqueActualExpenses
      .filter((expense) =>
        expense.sourcePlanExpenseId === plannedExpense.id
        || (plannedExpense.convertedToExpenseId && expense.id === plannedExpense.convertedToExpenseId)
      )
      .reduce((sum, expense) => sum + normalizeAmount(expense.amount), 0);
    const plannedAmount = normalizeAmount(plannedExpense.estimatedAmount);
    const itemVariance = itemActualTotal - plannedAmount;
    return {
      id: plannedExpense.id,
      title: plannedExpense.title,
      category: plannedExpense.category || 'other',
      plannedAmount,
      actualAmount: itemActualTotal,
      varianceAmount: itemVariance,
      variancePercent: plannedAmount > 0 ? (itemVariance / plannedAmount) * 100 : null,
      convertedExpenseId: plannedExpense.convertedToExpenseId || null,
    };
  });

  return {
    targetBudgetAmount,
    plannedTotal,
    actualTotal,
    remainingAmount,
    progressPercent,
    status,
    varianceAmount,
    variancePercent,
    categoryBreakdown,
    itemBreakdown,
    linkedExpenseCount: uniqueActualExpenses.length,
  };
}

const planInclude = {
  participants: { include: { user: { select: { id: true, name: true } }, guestMember: true } },
  expenses: true,
};

async function withTrackingSummary(plan) {
  const [tracked] = await attachTrackingSummaries([plan]);
  return tracked;
}

async function attachTrackingSummaries(plans) {
  if (!plans.length) return plans;
  const planIds = plans.map((plan) => plan.id);
  const convertedExpenseToPlan = new Map();

  for (const plan of plans) {
    for (const expense of plan.expenses ?? []) {
      if (expense.convertedToExpenseId) convertedExpenseToPlan.set(expense.convertedToExpenseId, plan.id);
    }
  }

  const filters = [{ planId: { in: planIds } }];
  if (convertedExpenseToPlan.size > 0) {
    filters.push({ id: { in: Array.from(convertedExpenseToPlan.keys()) } });
  }

  const actualExpenses = await prisma.expense.findMany({
    where: { OR: filters },
    select: {
      id: true,
      planId: true,
      sourcePlanExpenseId: true,
      title: true,
      amount: true,
      category: true,
    },
  });

  const actualsByPlan = new Map(planIds.map((planId) => [planId, []]));
  for (const expense of actualExpenses) {
    const planId = expense.planId || convertedExpenseToPlan.get(expense.id);
    if (!planId || !actualsByPlan.has(planId)) continue;
    actualsByPlan.get(planId).push(expense);
  }

  return plans.map((plan) => ({
    ...plan,
    tracking: buildPlanTrackingSummary(plan, actualsByPlan.get(plan.id) || []),
  }));
}

async function assertPlanMember(planId, userId) {
  const participant = await prisma.planParticipant.findFirst({ where: { planId, userId } });
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!participant && plan?.createdByUserId !== userId) throw httpError('Ban khong phai thanh vien cua ke hoach nay.', 403);
}

async function assertCanManagePlan(planId, userId, options = {}) {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: {
      ...(options.includeParticipants ? { participants: true } : {}),
      ...(options.includeExpenses ? { expenses: true } : {}),
    },
  });
  if (!plan) throw httpError('Khong tim thay ke hoach.', 404);
  if (plan.createdByUserId === userId) return plan;
  if (plan.roomId) {
    await assertApprovedRoomMember(plan.roomId, userId);
    return plan;
  }
  throw httpError('Ban khong co quyen sua ke hoach nay.', 403);
}

async function assertApprovedRoomMember(roomId, userId) {
  const membership = await prisma.roomMember.findFirst({ where: { roomId, userId, status: 'approved' } });
  if (!membership) throw httpError('Ban khong phai thanh vien duoc duyet cua phong.', 403);
}

async function normalizeParticipants({ roomId, participants, ownerUserId }) {
  const input = Array.isArray(participants) ? participants : [];
  const withOwner = [{ userId: ownerUserId, type: 'user', role: 'owner' }, ...input];
  const normalized = [];
  for (const participant of withOwner) {
    const type = participant.type || (participant.userId ? 'user' : participant.guestMemberId ? 'guest' : 'manual');
    const next = {
      userId: participant.userId ?? (type === 'user' ? participant.id ?? null : null),
      guestMemberId: participant.guestMemberId ?? (type === 'guest' ? participant.id ?? null : null),
      displayName: participant.displayName || participant.name || null,
      type,
      role: participant.userId === ownerUserId ? 'owner' : 'member',
    };
    if (type === 'manual' && !next.displayName?.trim()) throw httpError('Nguoi tham gia tam thoi can co ten hien thi.', 400);
    if (type === 'user' && !next.userId) throw httpError('Nguoi tham gia user khong hop le.', 400);
    if (type === 'guest' && !next.guestMemberId) throw httpError('Nguoi tham gia guest khong hop le.', 400);
    if (roomId && type === 'user') {
      const membership = await prisma.roomMember.findFirst({ where: { roomId, userId: next.userId, status: 'approved' } });
      if (!membership) throw httpError('Thanh vien user khong thuoc phong.', 400);
    }
    if (roomId && type === 'guest') {
      const guest = await prisma.guestMember.findFirst({ where: { id: next.guestMemberId, roomId, status: { in: ['active', 'claimed'] } } });
      if (!guest) throw httpError('Khach moi khong thuoc phong.', 400);
    }
    if (!normalized.some((item) => sameParticipant(item, next) || sameManualName(item, next))) normalized.push(next);
  }
  return normalized;
}

function validateDates(startDate, endDate) {
  if (startDate && Number.isNaN(new Date(startDate).getTime())) throw httpError('Ngay bat dau khong hop le.', 400);
  if (endDate && Number.isNaN(new Date(endDate).getTime())) throw httpError('Ngay ket thuc khong hop le.', 400);
  if (startDate && endDate && new Date(startDate) > new Date(endDate)) throw httpError('Ngay ket thuc phai sau ngay bat dau.', 400);
}

function normalizeOptionalMoney(value, label) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw httpError(`${label} khong hop le.`, 400);
  return amount;
}

function normalizeNumberOrNull(value) {
  if (value === null || value === undefined) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

function normalizeAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function participantKey(participant) {
  if (participant.userId) return `user:${participant.userId}`;
  if (participant.guestMemberId) return `guest:${participant.guestMemberId}`;
  return `manual:${String(participant.displayName || '').trim().toLowerCase()}`;
}

function sameParticipant(left, right) {
  return participantKey(left) === participantKey(right);
}

function sameManualName(left, right) {
  return !left.userId && !left.guestMemberId && !right.userId && !right.guestMemberId
    && String(left.displayName || '').trim().toLowerCase() === String(right.displayName || '').trim().toLowerCase();
}

function toExpenseParticipant(participant) {
  return {
    userId: participant.userId,
    guestMemberId: participant.guestMemberId,
    displayName: participant.displayName,
    type: participant.type,
  };
}

function parsePlanExpenseParticipants(value) {
  if (Array.isArray(value)) return value;
  try { return JSON.parse(value || '[]'); } catch { return []; }
}

function assertNoConvertedParticipantRemoval(expenses, removed) {
  const convertedUsingRemoved = expenses.some((expense) => expense.convertedToExpenseId
    && parsePlanExpenseParticipants(expense.participants).some((participant) =>
      removed.some((item) => sameParticipant(item, participant))
    ));
  if (convertedUsingRemoved) throw httpError('Khong the xoa nguoi tham gia da duoc dung trong khoan chi da chuyen doi.', 409);
}

async function recalcPlanTotal(planId) {
  const expenses = await prisma.planExpense.findMany({ where: { planId } });
  const total = expenses.reduce((sum, expense) => sum + expense.estimatedAmount, 0);
  await prisma.plan.update({ where: { id: planId }, data: { estimatedTotal: total } });
}

function httpError(message, status) {
  return Object.assign(new Error(message), { status });
}
