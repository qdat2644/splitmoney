import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { env } from '../config/env.js';

const prisma = {
  roomMember: { findUnique: vi.fn() },
  operationalEvent: { create: vi.fn().mockResolvedValue({ id: 'event-1' }) },
};

vi.mock('../utils/db.js', () => ({ default: prisma }));

const { createApp } = await import('../app.js');

function token(userId = 'u-import') {
  return jwt.sign({ userId }, env.jwtSecret);
}

describe('import upload file limit', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
    prisma.roomMember.findUnique.mockResolvedValue({ roomId: 'room-a', userId: 'u-import', status: 'approved' });
  });

  it('rejects oversized Excel files before parsing', async () => {
    const oversized = Buffer.alloc((5 * 1024 * 1024) + 1, 1);

    const response = await request(app)
      .post('/api/rooms/room-a/import/preview')
      .set('Authorization', `Bearer ${token()}`)
      .attach('file', oversized, {
        filename: 'large.xlsx',
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      .expect(413);

    expect(response.body.error).toBe('File Excel không được vượt quá 5MB.');
  });
});
