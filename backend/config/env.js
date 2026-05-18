import dotenv from 'dotenv';

dotenv.config();

const REQUIRED = ['DATABASE_URL', 'JWT_SECRET', 'GEMINI_API_KEY'];
const ALLOWED_NODE_ENVS = new Set(['development', 'test', 'production']);

function readPort(value) {
  const port = Number(value ?? 5000);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('Invalid PORT. Expected an integer between 1 and 65535.');
  }
  return port;
}

export function loadEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  if (!ALLOWED_NODE_ENVS.has(nodeEnv)) {
    throw new Error('Invalid NODE_ENV. Expected development, test, or production.');
  }

  return Object.freeze({
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    nodeEnv,
    port: readPort(process.env.PORT),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    corsOrigins: (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  });
}

export const env = loadEnv();
