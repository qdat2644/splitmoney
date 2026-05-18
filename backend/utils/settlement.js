// settlement.js — Canonical Settlement Engine
// Single authoritative source for all financial calculations.
// Used by: expense controller, room balance API, personal summary, AI insights, plan previews.

// ── Split Type Resolution ─────────────────────────────────────────────────────

/**
 * Resolve the canonical shareAmount for each participant given a split type.
 * This is called BEFORE persisting any expense.
 *
 * @param {number} totalAmount
 * @param {'equal'|'exact'|'percentage'} splitType
 * @param {Array<{id: string, shareAmount?: number, sharePercent?: number}>} rawParticipants
 * @returns {Array<{id: string, shareAmount: number}>}  — shareAmount always in absolute VND
 * @throws {Error} if validation fails
 */
export function resolveShares(totalAmount, splitType, rawParticipants) {
  if (!rawParticipants || rawParticipants.length === 0) {
    throw new Error('Cần ít nhất một người tham gia.');
  }
  if (typeof totalAmount !== 'number' || isNaN(totalAmount) || totalAmount <= 0) {
    throw new Error('Số tiền không hợp lệ.');
  }

  switch (splitType) {
    case 'equal': {
      const rawShares = rawParticipants.map(() => totalAmount / rawParticipants.length);
      return attachRoundedShares(rawParticipants, rawShares, totalAmount);
    }

    case 'exact': {
      const sum = rawParticipants.reduce((s, p) => s + (Number(p.shareAmount) || 0), 0);
      if (Math.abs(sum - totalAmount) > 1) {
        throw new Error(`Tổng chia chính xác (${sum}) phải bằng tổng khoản chi (${totalAmount}).`);
      }
      return rawParticipants.map(p => ({ ...p, shareAmount: Number(p.shareAmount) }));
    }

    case 'percentage': {
      const sumPct = rawParticipants.reduce((s, p) => s + (Number(p.sharePercent) || 0), 0);
      if (Math.abs(sumPct - 100) > 0.01) {
        throw new Error(`Tổng phần trăm (${sumPct.toFixed(2)}%) phải bằng 100%.`);
      }
      const rawShares = rawParticipants.map(p => (Number(p.sharePercent) / 100) * totalAmount);
      return attachRoundedShares(rawParticipants, rawShares, totalAmount);
    }

    default:
      throw new Error(`splitType không hợp lệ: "${splitType}". Phải là equal | exact | percentage.`);
  }
}

// ── Balance Calculation ───────────────────────────────────────────────────────

/**
 * Calculate net balance map for a set of members given expenses and payments.
 * Positive balance = this member is owed money.
 * Negative balance = this member owes money.
 *
 * @param {string[]} memberIds
 * @param {Array<{paidById: string, amount: number, participants: Array<{id: string, shareAmount: number}>}>} expenses
 * @param {Array<{fromId: string, toId: string, amount: number}>} payments
 * @returns {Object.<string, number>}  balanceMap: memberId → signedBalance
 */
export function computeBalanceMap(memberIds, expenses, payments = []) {
  const balances = {};
  memberIds.forEach(id => (balances[id] = 0));

  // Expenses: payer gets credited full amount, each participant debited their shareAmount
  for (const expense of expenses) {
    const { paidById, amount, participants } = expense;
    if (!participants || participants.length === 0) continue;

    balances[paidById] = (balances[paidById] || 0) + amount;
    for (const p of participants) {
      balances[p.id] = (balances[p.id] || 0) - p.shareAmount;
    }
  }

  // Payments: sender's balance improves (they paid off debt), receiver's decreases
  const seenPaymentIds = new Set();
  for (const payment of payments ?? []) {
    if (payment.id && seenPaymentIds.has(payment.id)) continue;
    if (payment.id) seenPaymentIds.add(payment.id);
    const amount = Number(payment.amount) || 0;
    if (amount <= 0) continue;
    balances[payment.fromId] = (balances[payment.fromId] || 0) + amount;
    balances[payment.toId]   = (balances[payment.toId]   || 0) - amount;
  }

  return balances;
}

/**
 * Greedy settlement algorithm — minimize number of transactions.
 * @param {Object.<string, number>} balanceMap
 * @returns {Array<{from: string, to: string, amount: number}>}
 */
export function computeSettlements(balanceMap) {
  const entries = Object.entries(balanceMap)
    .map(([id, balance]) => ({ id, balance: Math.round(balance) }))
    .filter(e => Math.abs(e.balance) > 1);

  const creditors = entries.filter(e => e.balance > 0).sort((a, b) => b.balance - a.balance);
  const debtors   = entries.filter(e => e.balance < 0).sort((a, b) => a.balance - b.balance);

  const transactions = [];
  let ci = 0, di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debit  = debtors[di];
    const amount = Math.min(credit.balance, -debit.balance);

    if (amount > 0) {
      transactions.push({ from: debit.id, to: credit.id, amount: Math.round(amount) });
    }

    credit.balance -= amount;
    debit.balance  += amount;

    if (Math.abs(credit.balance) <= 1) ci++;
    if (Math.abs(debit.balance)  <= 1) di++;
  }

  return transactions;
}

// ── Per-User Signed Balance ───────────────────────────────────────────────────

/**
 * Compute the signed net balance for a single user across multiple rooms.
 * Handles claimed guest identity merging.
 *
 * @param {string} userId
 * @param {string[]} claimedGuestIds
 * @param {Array<Expense>} expenses - raw Prisma expense rows with participants
 * @param {Array<Payment>} payments - raw Prisma payment rows
 * @returns {{ totalIOwe: number, totalOwedToMe: number, netBalance: number, signedBalance: number }}
 */
export function computeUserBalance(userId, claimedGuestIds, expenses, payments = []) {
  const isMe = (uId, gId) =>
    (uId && uId === userId) ||
    (gId && claimedGuestIds.includes(gId));

  let signedBalance = 0; // positive = others owe me, negative = I owe

  for (const expense of expenses) {
    const { participants, amount, paidByUserId, paidByGuestMemberId } = expense;
    if (!participants || participants.length === 0) continue;

    const paidByMe      = isMe(paidByUserId, paidByGuestMemberId);
    const iAmParticipant = participants.some(p => isMe(p.userId, p.guestMemberId));

    if (!paidByMe && !iAmParticipant) continue;

    // Find MY share from stored shareAmount (supports all split types)
    const myParticipant = participants.find(p => isMe(p.userId, p.guestMemberId));
    const myShare = myParticipant ? myParticipant.shareAmount : 0;

    if (paidByMe && iAmParticipant) {
      signedBalance += (amount - myShare); // others owe me for their shares
    } else if (paidByMe && !iAmParticipant) {
      signedBalance += amount; // I funded everything
    } else if (!paidByMe && iAmParticipant) {
      signedBalance -= myShare; // I owe my share
    }
  }

  for (const payment of payments ?? []) {
    if (isMe(payment.fromUserId, payment.fromGuestMemberId)) signedBalance += payment.amount;
    if (isMe(payment.toUserId,   payment.toGuestMemberId))   signedBalance -= payment.amount;
  }

  const netBalance      = Math.round(signedBalance);
  const totalOwedToMe   = netBalance > 0 ? netBalance : 0;
  const totalIOwe       = netBalance < 0 ? -netBalance : 0;

  return { totalIOwe, totalOwedToMe, netBalance, signedBalance };
}

function attachRoundedShares(participants, rawShares, totalAmount) {
  const floors = rawShares.map((value) => Math.floor(value));
  let remainder = Math.round(totalAmount - floors.reduce((sum, value) => sum + value, 0));
  const ranked = rawShares
    .map((value, index) => ({ index, fraction: value - floors[index] }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; i < remainder; i += 1) {
    floors[ranked[i % ranked.length].index] += 1;
  }

  return participants.map((participant, index) => ({
    ...participant,
    shareAmount: floors[index],
  }));
}
