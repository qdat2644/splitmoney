import { describe, expect, it } from 'vitest';
import { buildTemporalSignals } from '../services/intelligence/temporalSignals.js';

const now = new Date('2026-05-19T12:00:00.000Z');

function expense({ id, title = 'Cafe', amount, category = 'food', date, createdAt = date }) {
  return {
    id: id ?? `${title}-${date}-${amount}`,
    title,
    amount,
    category,
    date: new Date(`${date}T12:00:00.000Z`),
    createdAt: new Date(`${createdAt}T12:00:00.000Z`),
  };
}

describe('temporal signal engine', () => {
  it('detects month-over-month spending movement with confidence', () => {
    const signals = buildTemporalSignals({
      now,
      expenses: [
        expense({ amount: 200000, date: '2026-04-04' }),
        expense({ amount: 220000, date: '2026-04-12' }),
        expense({ amount: 180000, date: '2026-04-20' }),
        expense({ amount: 350000, date: '2026-05-03' }),
        expense({ amount: 360000, date: '2026-05-11' }),
        expense({ amount: 340000, date: '2026-05-17' }),
      ],
    });

    expect(signals.historicalComparisons.monthOverMonth).toMatchObject({
      direction: 'up',
      previousAmount: 600000,
      currentAmount: 1050000,
    });
    expect(signals.historicalComparisons.monthOverMonth.confidence).toBeGreaterThanOrEqual(0.55);
  });

  it('detects recurring cadence from repeated dated expenses', () => {
    const signals = buildTemporalSignals({
      now,
      expenses: [
        expense({ title: 'Tiền nhà', category: 'housing', amount: 3000000, date: '2026-02-01' }),
        expense({ title: 'Tiền nhà', category: 'housing', amount: 3000000, date: '2026-03-02' }),
        expense({ title: 'Tiền nhà', category: 'housing', amount: 3000000, date: '2026-04-01' }),
        expense({ title: 'Ăn trưa', category: 'food', amount: 80000, date: '2026-05-10' }),
        expense({ title: 'Ăn trưa', category: 'food', amount: 82000, date: '2026-05-12' }),
        expense({ title: 'Ăn trưa', category: 'food', amount: 78000, date: '2026-05-14' }),
      ],
    });

    expect(signals.recurringPatterns).toEqual(expect.arrayContaining([
      expect.objectContaining({ title: 'Tiền nhà', cadence: 'monthly', confidence: expect.any(Number) }),
    ]));
  });

  it('detects stabilization when recent spending varies less than prior history', () => {
    const prior = [
      expense({ amount: 50000, date: '2026-03-24' }),
      expense({ amount: 500000, date: '2026-03-29' }),
      expense({ amount: 70000, date: '2026-04-03' }),
      expense({ amount: 620000, date: '2026-04-08' }),
      expense({ amount: 90000, date: '2026-04-13' }),
    ];
    const recent = [
      expense({ amount: 190000, date: '2026-04-24' }),
      expense({ amount: 200000, date: '2026-04-29' }),
      expense({ amount: 210000, date: '2026-05-04' }),
      expense({ amount: 205000, date: '2026-05-09' }),
      expense({ amount: 195000, date: '2026-05-14' }),
    ];
    const signals = buildTemporalSignals({ now, expenses: [...prior, ...recent] });

    expect(signals.historicalComparisons.volatilityTrend.direction).toBe('stabilizing');
    expect(signals.improvingAreas).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'stabilization' }),
    ]));
  });

  it('guards against sparse history before making temporal claims', () => {
    const signals = buildTemporalSignals({
      now,
      expenses: [
        expense({ amount: 90000, date: '2026-05-12' }),
        expense({ amount: 120000, date: '2026-05-16' }),
      ],
    });

    expect(signals.dataQuality.isSparse).toBe(true);
    expect(signals.historicalComparisons.monthOverMonth.confidence).toBe(0);
    expect(signals.insightCandidates).toEqual([]);
  });

  it('detects weekend spending rhythm only with enough samples', () => {
    const signals = buildTemporalSignals({
      now,
      expenses: [
        expense({ amount: 400000, date: '2026-04-04' }),
        expense({ amount: 420000, date: '2026-04-05' }),
        expense({ amount: 450000, date: '2026-04-11' }),
        expense({ amount: 430000, date: '2026-04-12' }),
        expense({ amount: 100000, date: '2026-04-14' }),
        expense({ amount: 110000, date: '2026-04-15' }),
        expense({ amount: 90000, date: '2026-04-16' }),
        expense({ amount: 95000, date: '2026-04-17' }),
        expense({ amount: 440000, date: '2026-04-18' }),
        expense({ amount: 105000, date: '2026-04-20' }),
      ],
    });

    expect(signals.spendingRhythm.weekdayWeekend.direction).toBe('weekend_higher');
    expect(signals.insightCandidates).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'recurring_rhythm', title: 'Cuối tuần thường chi nhiều hơn' }),
    ]));
  });

  it('uses imported history to bootstrap temporal confidence', () => {
    const signals = buildTemporalSignals({
      now,
      expenses: [
        expense({ amount: 140000, date: '2026-01-10', createdAt: '2026-05-18' }),
        expense({ amount: 150000, date: '2026-02-10', createdAt: '2026-05-18' }),
        expense({ amount: 145000, date: '2026-03-10', createdAt: '2026-05-18' }),
        expense({ amount: 100000, date: '2026-04-10' }),
        expense({ amount: 95000, date: '2026-05-10' }),
        expense({ amount: 98000, date: '2026-05-15' }),
      ],
    });

    expect(signals.dataQuality.importedHistory).toMatchObject({
      hasImportedHistory: true,
      importedExpenseCount: 3,
    });
    expect(signals.historicalComparisons.importBehaviorShift).toMatchObject({
      direction: 'lower_after_import',
      confidence: expect.any(Number),
    });
    expect(signals.recurringPatterns[0]?.confidence).toBeGreaterThanOrEqual(0.55);
  });

  it('keeps confidence below threshold for weak weekend samples', () => {
    const signals = buildTemporalSignals({
      now,
      expenses: [
        expense({ amount: 500000, date: '2026-05-16' }),
        expense({ amount: 600000, date: '2026-05-17' }),
        expense({ amount: 70000, date: '2026-05-18' }),
      ],
    });

    expect(signals.spendingRhythm.weekdayWeekend).toMatchObject({
      direction: 'unknown',
      confidence: 0,
      sparse: true,
    });
  });
});
