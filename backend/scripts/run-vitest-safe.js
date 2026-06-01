import { execFileSync } from 'node:child_process';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./e2e.db';

const command = process.platform === 'win32'
  ? (process.env.ComSpec || 'cmd.exe')
  : 'npx';
const args = process.platform === 'win32'
  ? ['/d', '/s', '/c', 'vitest run']
  : ['vitest', 'run'];

execFileSync(command, args, {
  env: process.env,
  stdio: 'inherit',
});
