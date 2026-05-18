import { describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { requireAuth } from '../middleware/authMiddleware.js';
import { env } from '../config/env.js';


const res = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

describe('auth access regression', () => {
  it('case 1: rejects missing and invalid bearer tokens', () => {
    const next = vi.fn();
    const missing = res();
    requireAuth({ headers: {} }, missing, next);
    expect(missing.statusCode).toBe(401);

    const invalid = res();
    requireAuth({ headers: { authorization: 'Bearer nope' } }, invalid, next);
    expect(invalid.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows valid authenticated requests through', () => {
    const next = vi.fn();
    const token = jwt.sign({ userId: 'u-dat' }, env.jwtSecret);
    const req = { headers: { authorization: `Bearer ${token}` } };
    requireAuth(req, res(), next);
    expect(req.user.userId).toBe('u-dat');
    expect(next).toHaveBeenCalledOnce();
  });
});
