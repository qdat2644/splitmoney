// calculations.js — Core financial logic (matches canonical backend settlement engine)

/**
 * Calculate how much each person owes/is owed across all expenses AND payments.
 * Returns a balance map: { memberId: netBalance }
 * Positive = owed money (người khác nợ bạn), Negative = owes money (bạn nợ người khác)
 *
 * IMPORTANT: reads expense.shareMap (pre-resolved shareAmounts per participant)
 * for exact/percentage splits. Falls back to equal-divide for legacy expenses
 * that don't have shareMap.
 */
export function calculateBalances(members, expenses, payments = []) {
  const balances = {};
  members.forEach((m) => (balances[m.id] = 0));

  // 1) Process expenses
  expenses.forEach((expense) => {
    const { amount, paidBy, participants, splitType, shareMap } = expense;
    if (!participants || participants.length === 0) return;

    // Payer gets credited full amount
    balances[paidBy] = (balances[paidBy] || 0) + amount;

    // Each participant debited their stored share (canonical)
    // shareMap: { participantId: shareAmount } — set by AppContext from API response
    if (shareMap && Object.keys(shareMap).length > 0) {
      Object.entries(shareMap).forEach(([pid, shareAmount]) => {
        balances[pid] = (balances[pid] || 0) - shareAmount;
      });
    } else {
      // Equal split fallback for legacy data
      const share = amount / participants.length;
      participants.forEach((pid) => {
        balances[pid] = (balances[pid] || 0) - share;
      });
    }
  });

  // 2) Process manual payments — a payment of X from A to B means:
  //    A's balance goes up (less debt), B's goes down (less credit)
  payments.forEach((payment) => {
    const amount = Number(payment.amount) || 0;
    if (amount <= 0) return;
    balances[payment.from] = (balances[payment.from] || 0) + amount;
    balances[payment.to]   = (balances[payment.to]   || 0) - amount;
  });

  return balances;
}

/**
 * Optimized settlement algorithm (greedy approach to minimize transactions).
 * Returns array of { from, to, amount } objects.
 */
export function calculateSettlements(balances) {
  // Clone and filter out zero balances
  const entries = Object.entries(balances)
    .map(([id, balance]) => ({ id, balance: Math.round(balance) }))
    .filter((e) => Math.abs(e.balance) > 1);

  const creditors = entries.filter((e) => e.balance > 0).sort((a, b) => b.balance - a.balance);
  const debtors   = entries.filter((e) => e.balance < 0).sort((a, b) => a.balance - b.balance);

  const transactions = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const credit = creditors[ci];
    const debit  = debtors[di];
    const amount = Math.min(credit.balance, -debit.balance);

    if (amount > 0) {
      transactions.push({
        from: debit.id,
        to: credit.id,
        amount: Math.round(amount),
      });
    }

    credit.balance -= amount;
    debit.balance  += amount;

    if (Math.abs(credit.balance) <= 1) ci++;
    if (Math.abs(debit.balance)  <= 1) di++;
  }

  return transactions;
}

/**
 * Calculate stats for dashboard
 */
export function calculateStats(members, expenses, payments = []) {
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalCount    = expenses.length;

  // How much each member has paid (expenses only, not settlements)
  const paidByMember = {};
  members.forEach((m) => (paidByMember[m.id] = 0));
  expenses.forEach((e) => {
    paidByMember[e.paidBy] = (paidByMember[e.paidBy] || 0) + e.amount;
  });

  // Find top payer
  const topPayer = Object.entries(paidByMember).sort((a, b) => b[1] - a[1])[0];

  // Balances including payments
  const balances  = calculateBalances(members, expenses, payments);
  const topDebtor = Object.entries(balances)
    .filter(([, b]) => b < 0)
    .sort((a, b) => a[1] - b[1])[0];

  // Expenses per category
  const byCategory = {};
  expenses.forEach((e) => {
    byCategory[e.category || 'other'] = (byCategory[e.category || 'other'] || 0) + e.amount;
  });

  // Expenses per day
  const byDate = {};
  expenses.forEach((e) => {
    byDate[e.date] = (byDate[e.date] || 0) + e.amount;
  });

  // Total payments per member (amount transferred out)
  const paidByPayment = {};
  members.forEach((m) => (paidByPayment[m.id] = 0));
  payments.forEach((p) => {
    paidByPayment[p.from] = (paidByPayment[p.from] || 0) + Number(p.amount);
  });

  // Per member spending share
  const perMember = members.map((m) => ({
    id: m.id,
    name: m.name,
    paid: paidByMember[m.id] || 0,
    paidByPayment: paidByPayment[m.id] || 0,
    balance: balances[m.id] || 0,
    colorIndex: m.colorIndex,
  }));

  return {
    totalExpenses,
    totalCount,
    paidByMember,
    paidByPayment,
    topPayer: topPayer ? { id: topPayer[0], amount: topPayer[1] } : null,
    topDebtor: topDebtor ? { id: topDebtor[0], amount: topDebtor[1] } : null,
    byCategory,
    byDate,
    perMember,
    balances,
  };
}

/**
 * Calculate average expense per person
 */
export function averagePerPerson(expenses, memberCount) {
  if (memberCount === 0) return 0;
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  return total / memberCount;
}
