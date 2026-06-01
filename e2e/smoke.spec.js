import { expect, test } from '@playwright/test';

const member = {
  email: 'e2e.user@zyra.test',
  password: 'Password123!',
};

const admin = {
  email: 'e2e.admin@zyra.test',
  password: 'Admin123!',
};

async function login(page, user = member) {
  await page.goto('/');
  await page.getByTestId('login-email').fill(user.email);
  await page.getByTestId('login-password').fill(user.password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('app-shell-main')).toBeVisible();
}

test.describe('Zyra smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('boots to the login screen', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('auth-screen')).toBeVisible();
    await expect(page.getByTestId('login-form')).toBeVisible();
    await expect(page.getByText('Zyra')).toBeVisible();
  });

  test('handles invalid login and forgot-password form', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('login-email').fill('missing@zyra.test');
    await page.getByTestId('login-password').fill('wrong-password');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toBeVisible();
    await expect(page.getByTestId('login-error')).not.toHaveText(/^\s*(true|\[object Object\])\s*$/);

    await page.getByTestId('forgot-password-toggle').click();
    await expect(page.getByTestId('forgot-password-form')).toBeVisible();
    await page.getByTestId('forgot-email-input').fill(member.email);
    await page.getByTestId('forgot-password-submit').click();
    await expect(page.getByTestId('forgot-password-notice')).toBeVisible();
  });

  test('loads the personal dashboard shell and navigation', async ({ page }) => {
    await login(page);
    await expect(page.getByTestId('personal-dashboard')).toBeVisible();
    await expect(page.getByTestId('app-sidebar')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });

  test('creates a room, enters it, and adds an expense', async ({ page }) => {
    await login(page);
    const roomName = `E2E Room ${Date.now()}`;
    const expenseTitle = `E2E Coffee ${Date.now()}`;

    await page.goto('/rooms');
    await expect(page.getByTestId('rooms-page')).toBeVisible();
    await page.getByTestId('room-name-input').fill(roomName);
    await page.getByTestId('room-create-submit').click();
    await expect(page.getByText(roomName)).toBeVisible();

    await page.getByTestId('room-card').filter({ hasText: roomName }).click();
    await expect(page).toHaveURL(/\/rooms\/.+\/dashboard/);
    await page.getByTestId('room-add-expense').click();
    await expect(page.getByTestId('expense-form')).toBeVisible();
    await page.getByTestId('expense-title-input').fill(expenseTitle);
    await page.getByTestId('expense-amount-input').fill('25000');
    await page.getByTestId('expense-submit').click();
    await expect(page.getByTestId('expense-form')).toBeHidden();
    await expect(page.getByText(expenseTitle)).toBeVisible();
  });

  test('opens the dedicated forecasts page', async ({ page }) => {
    await login(page);
    await page.goto('/forecasts');
    await expect(page.getByTestId('forecasts-page')).toBeVisible();
    await expect(page.getByTestId('forecasts-page')).toContainText(/D.+b.+o/i);
  });

  test('uses settings profile, password validation, and export shell', async ({ page }) => {
    await login(page);
    await page.goto('/settings');
    await expect(page.getByTestId('settings-page')).toBeVisible();
    await expect(page.getByTestId('settings-export-section')).toBeVisible();

    await page.getByTestId('settings-name-input').fill(`E2E User ${Date.now()}`);
    await page.getByTestId('settings-save-profile').click();
    await expect(page.getByTestId('settings-name-input')).toHaveValue(/E2E User/);

    await page.getByTestId('settings-password-submit').click();
    await expect(page.getByTestId('settings-password-error')).toBeVisible();
  });

  test('blocks non-admin admin route and allows admin workspace', async ({ page }) => {
    await login(page, member);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('admin-workspace')).toHaveCount(0);

    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await login(page, admin);
    await page.goto('/admin');
    await expect(page.getByTestId('admin-workspace')).toBeVisible();
    await expect(page.getByTestId('admin-tab-overview')).toBeVisible();
  });
});
