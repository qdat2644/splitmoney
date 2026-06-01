import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(backendDir, '..');
const source = path.join(backendDir, 'prisma', 'dev.db');
const backupDir = path.join(rootDir, 'backups');

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const target = path.join(backupDir, `dev-${stamp}.db`);

await fs.access(source);
await fs.mkdir(backupDir, { recursive: true });
await fs.copyFile(source, target);

console.log(`dev.db backup written to ${target}`);
