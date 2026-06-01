import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { env } from '../config/env.js';

const prisma = {
  operationalEvent: { create: vi.fn().mockResolvedValue({ id: 'event-1' }) },
};

vi.mock('../utils/db.js', () => ({ default: prisma }));

vi.mock('../services/forecastService.js', () => ({
  buildUserForecast: vi.fn().mockResolvedValue({
    summary: {
      projectedMonthlySpend: 0,
      currentMonthSpend: 0,
      dailyAverage: 0,
      projectedBudgetRisk: 'unknown',
      topProjectedCategory: null,
      confidence: { level: 'low', score: 0.1, reason: 'test' },
    },
    categoryForecasts: [],
    recurringForecasts: [],
    budgetOutlook: [],
    earlyWarnings: [],
    meta: { generatedAt: '2026-06-01T00:00:00.000Z', dataQuality: 'sparse', monthsAnalyzed: 0 },
  }),
}));

const { createApp } = await import('../app.js');
const { buildUserForecast } = await import('../services/forecastService.js');

function token(userId) {
  return jwt.sign({ userId }, env.jwtSecret);
}

describe('forecast route authorization', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  it('rejects unauthenticated forecast requests', async () => {
    await request(app)
      .get('/api/users/me/forecasts')
      .expect(401);
  });

  it('uses the authenticated user id for forecast requests', async () => {
    const response = await request(app)
      .get('/api/users/me/forecasts')
      .set('Authorization', `Bearer ${token('u-forecast')}`)
      .expect(200);

    expect(buildUserForecast).toHaveBeenCalledWith('u-forecast');
    expect(response.body.meta.dataQuality).toBe('sparse');
  });
});
