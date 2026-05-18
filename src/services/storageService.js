// storageService.js
// Abstraction layer for data persistence
// Easy to swap out localStorage for API calls in the future

const KEYS = {
  MEMBERS: 'spliteasy_members',
  EXPENSES: 'spliteasy_expenses',
  SETTLEMENTS: 'spliteasy_settlements',
  THEME: 'spliteasy_theme',
  PLANNED_EXPENSES: 'spliteasy_planned_expenses',
  BUDGETS: 'spliteasy_budgets',
};

// ─── Generic helpers ──────────────────────────────────────────────────────────
const load = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const save = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
};

// ─── Members ─────────────────────────────────────────────────────────────────
export const memberService = {
  getAll: () => load(KEYS.MEMBERS, null),
  saveAll: (members) => save(KEYS.MEMBERS, members),
};

// ─── Expenses ─────────────────────────────────────────────────────────────────
export const expenseService = {
  getAll: () => load(KEYS.EXPENSES, null),
  saveAll: (expenses) => save(KEYS.EXPENSES, expenses),
};

// ─── Settlements ──────────────────────────────────────────────────────────────
export const settlementService = {
  getAll: () => load(KEYS.SETTLEMENTS, []),
  saveAll: (settlements) => save(KEYS.SETTLEMENTS, settlements),
};

// ─── Planned Expenses ────────────────────────────────────────────────────────
export const plannedExpenseService = {
  getAll: () => load(KEYS.PLANNED_EXPENSES, []),
  saveAll: (plans) => save(KEYS.PLANNED_EXPENSES, plans),
};

// ─── Budgets ─────────────────────────────────────────────────────────────────
export const budgetService = {
  getAll: () => load(KEYS.BUDGETS, []),
  saveAll: (budgets) => save(KEYS.BUDGETS, budgets),
};

// ─── Theme ────────────────────────────────────────────────────────────────────
export const themeService = {
  get: () => load(KEYS.THEME, 'dark'),
  save: (theme) => save(KEYS.THEME, theme),
};

// ─── Full data export / import ────────────────────────────────────────────────
export const dataService = {
  export: () => ({
    members: memberService.getAll(),
    expenses: expenseService.getAll(),
    settlements: settlementService.getAll(),
    exportedAt: new Date().toISOString(),
    version: '1.0',
  }),
  import: (data) => {
    if (data.members) memberService.saveAll(data.members);
    if (data.expenses) expenseService.saveAll(data.expenses);
    if (data.settlements) settlementService.saveAll(data.settlements);
  },
  clear: () => {
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
  },
};
