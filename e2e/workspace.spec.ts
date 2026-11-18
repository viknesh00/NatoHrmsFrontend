import { colorToken } from "./color-token";
import { expect, test, type Page } from '@playwright/test';

async function mockApi(page: Page, department = 'Engineering') {
  await page.route('**/*', async route => {
    const request = route.request();
    if (request.resourceType() !== 'xhr' && request.resourceType() !== 'fetch') return route.continue();
    const url = request.url();
    const payload = url.includes('Permissions/Mine') ? { role: 'Employee', isAdminOrManager: false, onboarding: { read: false, write: false, edit: false }, workStatus: { read: false, write: false, edit: false } }
      : url.includes('Leave?') ? { leaves: [], holidays: [] }
      : url.includes('GetUser/') ? [{ firstName: 'Test', lastName: 'Employee', email: 'test@example.test', accessRole: 'Employee', department, designation: 'Engineer', employeeId: 'E-001' }]
      : [];
    return route.fulfill({ json: payload });
  });
}
async function session(page: Page, role = 'Employee', department = 'Engineering') {
  await page.context().addCookies(Object.entries({ token: 'e2e-test-token', isLoggedIn: 'true', role, department, email: 'test@example.test', isDefaultPasswordChanged: 'true' }).map(([name, value]) => ({ name, value, url: 'http://127.0.0.1:4173' })));
  await mockApi(page, department);
}

test('protects deep links and renders sign in without horizontal overflow', async ({ page }) => {
  await page.goto('/employees');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toHaveCSS('background-color', await colorToken(page.getByRole('button', { name: 'Sign in', exact: true }), '--primary'));
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toHaveCSS('border-radius', '4px');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
  await page.getByLabel('Password', { exact: true }).fill('test-password');
  await page.getByRole('button', { name: 'Show password' }).click();
  await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
});

test('switches calendar views and opens the assistant widget', async ({ page }) => {
  await session(page);
  await page.goto('/timesheet');
  await expect(page.getByRole('heading', { name: 'My Timesheet' })).toBeVisible();
  await page.getByRole('tab', { name: 'Week', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Week', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Agenda', exact: true }).click();
  await expect(page.getByRole('table')).toHaveCount(0);
  await page.getByRole('button', { name: 'Open HR assistant' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'HR assistant', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('header avatar opens the profile directly without a dropdown', async ({ page }) => {
  await session(page);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'View profile' }).click();
  await expect(page).toHaveURL(/\/view-employee$/);
  await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible();
  await expect(page.getByRole('menu')).toHaveCount(0);
});

test('retains department-based landing and navigation rules', async ({ page, isMobile }) => {
  await session(page, 'Employee', 'Onboarding');
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/onboarding$/);
  if (isMobile) await page.getByRole('button', { name: /navigation|menu/i }).first().click();
  await expect(page.getByRole('link', { name: 'Onboarding', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Employees', exact: true })).toHaveCount(0);
});
