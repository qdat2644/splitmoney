import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from './apiClient.js';

describe('apiClient error normalization', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    globalThis.fetch = vi.fn();
  });

  it('turns network failures into friendly copy', async () => {
    fetch.mockRejectedValue(new Error('socket closed'));

    await expect(apiClient('/health')).rejects.toThrow('Không thể kết nối tới máy chủ');
  });

  it('turns 500 responses into friendly copy', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: true, message: 'Internal server error' }),
    });

    await expect(apiClient('/boom')).rejects.toThrow('Máy chủ đang gặp sự cố');
  });

  it('keeps expected validation/auth messages clean', async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Phiên đăng nhập không hợp lệ.' }),
    });

    await expect(apiClient('/auth/me')).rejects.toThrow('Phiên đăng nhập không hợp lệ.');
  });
});
