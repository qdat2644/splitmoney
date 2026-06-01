import { describe, expect, it } from 'vitest';
import { scrubSentryEvent } from '../monitoring/sentry.js';

describe('backend Sentry scrubber', () => {
  it('removes sensitive request and nested data', () => {
    const event = scrubSentryEvent({
      request: {
        url: 'https://app.example.com/reset-password?token=abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        headers: {
          authorization: 'Bearer eyJabc.def.ghi',
          cookie: 'session=secret',
          'x-safe': 'ok',
        },
        data: {
          email: 'dat@example.com',
          password: 'secret',
          nested: { resetToken: 'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef' },
        },
      },
      user: { id: 'u-1', email: 'dat@example.com', username: 'Dat' },
      extra: {
        passwordHash: 'hash',
        profile: { email: 'admin@example.com', note: 'safe note' },
      },
    });

    expect(event.request.headers.authorization).toBe('[Filtered]');
    expect(event.request.headers.cookie).toBe('[Filtered]');
    expect(event.request.headers['x-safe']).toBe('ok');
    expect(event.request.data).toBeUndefined();
    expect(event.request.url).not.toContain('abcdef');
    expect(event.user).toEqual({ id: 'u-1' });
    expect(event.extra.passwordHash).toBe('[Filtered]');
    expect(event.extra.profile.email).toBe('[Filtered]');
    expect(JSON.stringify(event)).not.toContain('dat@example.com');
    expect(JSON.stringify(event)).not.toContain('admin@example.com');
  });
});
