import { beforeEach, describe, expect, it, vi } from 'vitest';

const captureServerError = vi.fn();

vi.mock('../monitoring/sentry.js', () => ({ captureServerError }));

const { errorHandler, notFoundHandler } = await import('../middleware/errorHandler.js');

function req() {
  return { method: 'GET', originalUrl: '/api/test', path: '/api/test', user: { userId: 'u-1' } };
}

function res() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

describe('Sentry error handler capture policy', () => {
  beforeEach(() => {
    captureServerError.mockClear();
  });

  it('captures unexpected 500 errors', () => {
    const response = res();
    const error = new Error('database unavailable');

    errorHandler(error, req(), response);

    expect(response.statusCode).toBe(500);
    expect(captureServerError).toHaveBeenCalledWith(error, expect.any(Object), { status: 500 });
  });

  it('does not capture expected client errors', () => {
    const expectedStatuses = [400, 401, 403, 404, 413, 429];

    for (const status of expectedStatuses) {
      const response = res();
      const error = Object.assign(new Error('expected'), { status });
      errorHandler(error, req(), response);
    }

    expect(captureServerError).not.toHaveBeenCalled();
  });

  it('keeps not found responses out of Sentry', () => {
    const response = res();

    notFoundHandler(req(), response);

    expect(response.statusCode).toBe(404);
    expect(captureServerError).not.toHaveBeenCalled();
  });
});
