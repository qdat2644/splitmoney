import { defineConfig, devices } from '@playwright/test';

const backendEnv = {
  NODE_ENV: 'test',
  PORT: '5500',
  DATABASE_URL: 'file:./e2e.db',
  JWT_SECRET: 'zyra-e2e-jwt-secret',
  GEMINI_API_KEY: 'disabled-in-e2e',
  GEMINI_MODEL: 'disabled-in-e2e',
  RESEND_API_KEY: '',
  SENTRY_DSN: '',
  SENTRY_ENVIRONMENT: 'e2e',
  SENTRY_RELEASE: 'e2e',
  FRONTEND_URL: 'http://127.0.0.1:5174',
  CLIENT_URL: 'http://127.0.0.1:5174',
  CORS_ORIGINS: 'http://127.0.0.1:5174,http://localhost:5174',
};

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.js',
  fullyParallel: false,
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm.cmd run start',
      cwd: './backend',
      url: 'http://127.0.0.1:5500/health',
      reuseExistingServer: false,
      timeout: 120_000,
      env: backendEnv,
    },
    {
      command: 'npm.cmd run dev -- --host 127.0.0.1 --port 5174',
      url: 'http://127.0.0.1:5174',
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        VITE_API_BASE_URL: 'http://127.0.0.1:5500/api',
        VITE_SENTRY_DSN: '',
        VITE_SENTRY_ENVIRONMENT: 'e2e',
        VITE_SENTRY_RELEASE: 'e2e',
      },
    },
  ],
});
