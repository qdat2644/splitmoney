import { assertSafeDatabaseUrl, isDevDatabaseUrl } from '../utils/databaseSafety.js';

const isE2E = process.argv.includes('--e2e');
const nodeEnv = isE2E ? 'test' : process.env.NODE_ENV;
const databaseUrl = isE2E ? (process.env.DATABASE_URL || 'file:./e2e.db') : process.env.DATABASE_URL;

assertSafeDatabaseUrl({ context: isE2E ? 'db:guard:e2e' : 'db:guard', nodeEnv, databaseUrl });

if (nodeEnv === 'test') {
  console.log('Database guard passed for test environment.');
} else if (isDevDatabaseUrl(databaseUrl)) {
  console.log('Database guard passed. dev.db is allowed outside NODE_ENV=test.');
} else {
  console.log('Database guard passed.');
}
