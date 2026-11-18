import { colorToken } from "./color-token";
import { expect, test, type Page } from '@playwright/test';

const employee = { employeeId: 'E001', firstName: 'Asha', lastName: 'Rao', email: 'asha@example.test', userName: 'asha@example.test', department: 'Engineering', accessRole: 'Employee', isActive: true, projectAssigned: '', isDefaultPasswordChanged: true };
async function workspace(page: Page, records = false, profile = employee) {
  await page.context().addCookies(Object.entries({ token: 'ui-test-token', isLoggedIn: 'true', role: 'Admin', department: 'Engineering', isDefaultPasswordChanged: 'true' }).map(([name, value]) => ({ name, value, url: 'http://127.0.0.1:4173' })));
  await page.route('**/*', async route => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.continue();
    const url = route.request().url();
    const data = url.includes('Permissions/Mine') ? { role: 'Admin', isAdminOrManager: true, onboarding: { read: true, write: true, edit: true }, workStatus: { read: true, write: true, edit: true } }
      : url.includes('GetEmployeeLeave') || url.includes('Leave?') ? { leaves: [], holidays: [] }
      : url.includes('GetUser/') ? [profile]
      : url.includes('WorkStatus/GetAll') ? [{ workStatusId: 3, submissionId: 7, salCode: 'FFM GG', pmName: 'Abitha Krishnan', pmEmail: null, startDate: '2026-11-11T00:00:00', endDate: '2026-11-13T00:00:00', workStatus: 'Active', asset: 'ipad; Mac', comments: 'FE is working good in activity with no issue\\nTest FE is working good in activity with no issue', activity: 'Build; Cutover', firstName: 'suvasish', lastName: 'paul', passportNo: 'B00136032', city: 'Offenach', country: 'Germany', employeeStatus: 'Active', hasSiemensIdCard: 'Yes' }]
      : url.includes('WorkStatus/Report') ? [{ ...employee, passportNo: 'P-100', city: 'Chennai', country: 'India', employeeStatus: 'Active', salCode: 'SAL-1', pmName: 'Manager One', startDate: '2026-01-01', endDate: null, workStatus: 'Active', asset: 'Laptop; Badge', comments: 'Laptop handover completed', activity: 'Orientation; Setup' }]
      : url.includes('EmployeeOnboarding/Get/') ? { ...employee, submissionId: 1, submittedAt: '2026-11-01T09:00:00' }
      : records && url.endsWith('/User/All') ? Array.from({ length: 23 }, (_, i) => ({ ...employee, employeeId: `E${String(i + 1).padStart(3, '0')}`, firstName: i === 0 ? 'Asha' : `Employee ${i + 1}`, email: `employee${i + 1}@example.test` }))
      : [];
    return route.fulfill({ json: data });
  });
}

const screens = [
  '/dashboard', '/employees', '/employees/add-employee', '/employees/edit-employee/asha@example.test', '/view-employee',
  '/attendance', '/employees/working-hours', '/employees/add-working-hours', '/employees/edit-working-hours',
  '/employees/projects', '/employees/projects/create', '/leave', '/leave/apply-leave', '/timesheet', '/timesheet/timesheet-view',
  '/calendar', '/calendar/create-event', '/calendar/edit-event', '/announcement', '/announcement/announcement-form',
  '/company-documents', '/company-documents/upload', '/company-documents/edit', '/payslip',
  '/onboarding', '/onboarding/edit/1', '/work-status', '/work-status-report',
  '/job-management', '/job-management/add-profile', '/job-management/create-job', '/job-management/update-job',
  '/employee-details', '/chat',
];
for (const path of screens) {
  test(`renders ${path} with contained mobile layout`, async ({ page }, testInfo) => {
    await workspace(page);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(path);
    await expect(page.locator('.loading-overlay')).toHaveCount(0);
    await expect(page.locator('.page-wrap .page-title, .page-wrap .form-card-title, .gf-card, .page-title, .greeting-title, .chat-layout').first()).toBeVisible();
    await expect(page.getByText('The workspace could not load', { exact: true })).toHaveCount(0);
    expect(errors).toEqual([]);
    const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
    expect(dimensions.scroll, `Page overflow on ${path}`).toBeLessThanOrEqual(dimensions.width + 1);
    if (path === '/dashboard') {
      const labels = page.locator('.stat-label');
      expect(await labels.evaluateAll(els => els.every(el => el.scrollWidth <= el.clientWidth))).toBe(true);
    }
    if (['/dashboard', '/employees/add-employee', '/calendar', '/employee-details', '/job-management'].includes(path)) {
      await page.screenshot({ path: testInfo.outputPath('screen.png'), fullPage: true, animations: 'disabled', scale: 'css' });
    }
  });
}

test('retains employee search, pagination, selection, sorting and pending status payload', async ({ page }, testInfo) => {
  await workspace(page, true);
  await page.goto('/employees');
  await expect(page.getByText('Showing 1–10 of 23')).toBeVisible();
  await page.getByRole('button', { name: 'Next page' }).click();
  await expect(page.getByText('Showing 11–20 of 23')).toBeVisible();
  await page.getByRole('button', { name: 'First page' }).click();
  const search = page.getByRole('textbox', { name: /search/i });
  await search.fill('Asha');
  await expect(page.getByText('Showing 1–1 of 1')).toBeVisible();
  await page.getByRole('checkbox', { name: 'Select row 1' }).focus();
  await page.keyboard.press('Space');
  await expect(page.getByText('1 of 1 selected')).toBeVisible();
  await page.getByRole('columnheader', { name: 'First Name' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('columnheader', { name: 'First Name' })).toHaveAttribute('aria-sort', 'ascending');
  await page.getByRole('button', { name: 'Change status for employee1@example.test' }).click();
  const dialog = page.getByRole('dialog', { name: 'Change Status' });
  await expect(dialog).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('status-dialog.png'), animations: 'disabled', scale: 'css' });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.getByText('Active', { exact: true }).click();
  let release: () => void = () => {};
  const pending = new Promise<void>(resolve => { release = resolve; });
  let payload: unknown;
  await page.route('**/User/UpdateUserStaus', async route => {
    payload = route.request().postDataJSON();
    await pending;
    await route.fulfill({ json: { message: 'Updated' } });
  });
  await page.getByRole('radio', { name: 'Inactive' }).check();
  await dialog.getByRole('button', { name: /save/i }).click();
  await expect(dialog).toHaveAttribute('aria-busy', 'true');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeVisible();
  expect(payload).toEqual({ userName: 'employee1@example.test', isActive: false });
  release();
  await expect(dialog).toHaveCount(0);
});

test('keeps payslip document scrollable without changing its values', async ({ page }, testInfo) => {
  await workspace(page);
  await page.addInitScript(({ employee }) => {
    history.replaceState({ usr: { employee, monthYear: '2026-11-01' }, idx: 0, key: 'ui-test' }, '');
  }, { employee });
  await page.goto('/payslip/payslip-preview');
  await expect(page.locator('#payslip-doc')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('payslip.png'), fullPage: true, animations: 'disabled', scale: 'css' });
});

test('uses approved tokens and accessible action text', async ({ page }, testInfo) => {
  await page.goto('/login');
  const button = page.getByRole('button', { name: 'Sign in', exact: true });
  await expect(button).toHaveCSS('background-color', await colorToken(button, '--primary'));
  await expect(button).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(button).toHaveCSS('border-radius', '4px');
  await expect(page.getByLabel('Email address')).toHaveCSS('height', '44px');
  const microsoft = page.getByRole('button', { name: 'Sign in with Microsoft', exact: true });
  await expect(microsoft).toBeDisabled();
  await expect(microsoft).toHaveAccessibleDescription('Coming soon');
  await page.screenshot({ path: testInfo.outputPath('login.png'), fullPage: true, animations: 'disabled', scale: 'css' });
});

test('shows work status report comments, assets and activity columns', async ({ page }) => {
  await workspace(page, false, { ...employee, accessRole: 'Admin' });
  await page.goto('/work-status-report');
  await expect(page.getByRole('columnheader', { name: 'Comments' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Laptop handover completed' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Laptop, Badge' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Orientation, Setup' })).toBeVisible();
});

test('shows and filters all Work Status fields from the API response', async ({ page }) => {
  await workspace(page, false, { ...employee, accessRole: 'Admin' });
  await page.goto('/work-status');
  for (const column of ['Record ID', 'Submission ID', 'Employee', 'Passport No.', 'SAL Code', 'PM Name', 'PM Email', 'Start Date', 'End Date', 'Work Status', 'Assets', 'Comments', 'Activities', 'City', 'Country', 'Employee Status', 'Siemens ID Card']) {
    await expect(page.getByRole('columnheader', { name: column, exact: true })).toBeVisible();
  }
  const row = page.getByRole('row').filter({ hasText: 'FFM GG' });
  await expect(row).toContainText('ipad, Mac');
  await expect(row).toContainText('Build, Cutover');
  await expect(row).toContainText('Test FE is working good in activity with no issue');

  await page.getByRole('button', { name: /^Filters/ }).click();
  await page.getByRole('button', { name: 'Work Status', exact: true }).click();
  await page.locator('.fc-dd-menu').getByText('Active', { exact: true }).click();
  await page.getByRole('button', { name: 'Apply Filters' }).click();
  await expect(row).toBeVisible();
  await page.getByLabel('Search records').fill('Build; Cutover');
  await expect(row).toBeVisible();
  await page.getByLabel('Search records').fill('not in this response');
  await expect(page.getByText('No records found')).toBeVisible();
});


test('retains timesheet duration selection inside the keyboard dialog', async ({ page }, testInfo) => {
  await workspace(page);
  await page.goto('/timesheet');
  await page.getByRole('button', { name: 'My Timesheet', exact: true }).click();
  await page.getByRole('tab', { name: 'Agenda', exact: true }).click();
  const day = page.getByRole('button', { name: /^Log hours for/ }).last();
  await day.click();
  const dialog = page.getByRole('dialog', { name: 'Log Hours', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Regular task 1').fill('UI regression check');
  await dialog.getByRole('combobox', { name: 'Hours', exact: true }).first().click();
  await page.getByRole('option', { name: '2h', exact: true }).click();
  await dialog.getByRole('combobox', { name: 'Minutes', exact: true }).first().click();
  await page.getByRole('option', { name: '30m', exact: true }).click();
  await expect(dialog.getByText('2h 30m', { exact: true }).first()).toBeVisible();
  expect(await dialog.locator('.duration-trigger [data-slot=select-value]').evaluateAll(els => els.every(el => el.scrollWidth <= el.clientWidth))).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('timesheet-dialog.png'), animations: 'disabled', scale: 'css' });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(day).toBeFocused();
});

test('keeps month limits and restores focus after the month picker', async ({ page }) => {
  await workspace(page);
  await page.goto('/timesheet');
  await page.getByRole('button', { name: /filters/i }).click();
  const picker = page.getByRole('button', { name: 'Month', exact: true });
  await picker.click();
  await expect(page.locator('.month-picker-popup')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.month-picker-popup')).toHaveCount(0);
  await expect(picker).toBeFocused();
});

for (const path of ['/sign-in', '/forgot-password']) {
  test(`keeps authentication route ${path} responsive`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  });
}

test('keeps the public landing route responsive', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Bring your people operations into focus/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test.describe('live dashboard colors', () => {
  test.use({ timezoneId: 'Asia/Kolkata', colorScheme: 'light' });

  test('keeps the attendance canvas on the default accent palette', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-11-18T11:58:30+05:30') });
    await workspace(page, true);
    await page.goto('/dashboard');
    const overview = page.locator('.dashboard-kpi-overview');
    const chart = page.locator('.dashboard-chart-canvas canvas').first();
    await expect(chart).toBeVisible();
    const accent = await colorToken(overview, '--accent');
    expect(await overview.evaluate(element => getComputedStyle(element).backgroundImage)).toContain('linear-gradient');

    const paintsErrorColor = () => chart.evaluate((canvas: HTMLCanvasElement) => {
      const probe = document.createElement('span');
      probe.hidden = true;
      probe.style.color = 'var(--error)';
      document.body.append(probe);
      const sample = document.createElement('canvas').getContext('2d')!;
      sample.fillStyle = getComputedStyle(probe).color;
      sample.fillRect(0, 0, 1, 1);
      const [r, g, b] = sample.getImageData(0, 0, 1, 1).data;
      probe.remove();
      const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] === r && pixels[i + 1] === g && pixels[i + 2] === b && pixels[i + 3] === 255) return true;
      }
      return false;
    });

    await expect.poll(paintsErrorColor).toBe(true);
    await page.clock.setSystemTime(new Date('2026-11-18T11:59:10+05:30'));
    await page.clock.fastForward(60_000);
    await expect(page.locator('html')).not.toHaveAttribute('data-day-period');
    expect(await colorToken(overview, '--accent')).toBe(accent);
    await expect.poll(paintsErrorColor).toBe(true);
  });
});
