import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

describe('production hardening regression', () => {
  const app = createApp();

  it('serves health status', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body.status).toBe('ok');
    expect(response.body.environment).toBeTruthy();
  });

  it('adds security headers and keeps unknown api routes json-shaped', async () => {
    const response = await request(app).get('/api/not-real').expect(404);
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.body).toEqual({ error: true, message: 'Không tìm thấy nội dung.', code: 'NOT_FOUND' });
  });

  it('rejects oversized json payloads', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: `${'a'.repeat(110000)}@example.com`, password: 'x' });
    expect(response.status).toBe(413);
    expect(response.body.error).toBe(true);
  });

  it('rate limits repeated auth attempts', async () => {
    let last;
    for (let i = 0; i < 21; i += 1) {
      last = await request(app).post('/api/auth/login').send({ email: 'missing@example.com', password: 'wrong' });
    }
    expect(last.status).toBe(429);
    expect(last.body.code).toBe('RATE_LIMITED');
  });
});
