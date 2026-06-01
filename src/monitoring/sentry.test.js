import { describe, expect, it } from 'vitest';
import { __sentryForTests, initSentry, scrubSentryEvent } from './sentry.js';

describe('frontend Sentry monitoring', () => {
  it('is disabled when no VITE_SENTRY_DSN is configured', () => {
    __sentryForTests.reset();
    expect(initSentry()).toBe(false);
  });

  it('scrubs auth, token, email, and request body data', () => {
    globalThis.window = { location: { origin: 'https://app.example.com' } };

    const event = scrubSentryEvent({
      request: {
        url: 'https://app.example.com/reset-password?token=abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
        headers: {
          authorization: 'Bearer eyJabc.def.ghi',
          cookie: 'session=secret',
        },
        data: { email: 'user@example.com', password: 'secret' },
      },
      user: { id: 'u-1', email: 'user@example.com' },
      extra: { nested: { resetToken: 'abcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdef' } },
    });

    expect(event.request.headers.authorization).toBe('[Filtered]');
    expect(event.request.headers.cookie).toBe('[Filtered]');
    expect(event.request.data).toBeUndefined();
    expect(event.request.url).not.toContain('abcdef');
    expect(event.user).toEqual({ id: 'u-1' });
    expect(event.extra.nested.resetToken).toBe('[Filtered]');
    expect(JSON.stringify(event)).not.toContain('user@example.com');
  });
});
