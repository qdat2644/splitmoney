import { describe, expect, it } from 'vitest';
import { assertSafeDatabaseUrl, isDevDatabaseUrl } from '../utils/databaseSafety.js';

describe('database safety guard', () => {
  it('rejects dev.db when NODE_ENV is test', () => {
    expect(() =>
      assertSafeDatabaseUrl({
        nodeEnv: 'test',
        databaseUrl: 'file:./dev.db',
        context: 'test',
      })
    ).toThrow(/must never use backend\/prisma\/dev\.db/);
  });

  it('allows e2e.db when NODE_ENV is test', () => {
    expect(() =>
      assertSafeDatabaseUrl({
        nodeEnv: 'test',
        databaseUrl: 'file:./e2e.db',
        context: 'test',
      })
    ).not.toThrow();
  });

  it('detects dev.db even when the path is absolute or quoted', () => {
    expect(isDevDatabaseUrl('"file:C:/tmp/dev.db"')).toBe(true);
  });
});
