import { expect, test, type Page } from '@playwright/test';
import dayjs from 'dayjs';

async function attendanceWorkspace(page: Page, failFirstLoad = false) {
  const requests: { endpoint: string; payload: Record<string, string> }[] = [];
  let clockedOut = false;
  let shouldFail = failFirstLoad;
  await page.context().addCookies(Object.entries({ token: 'attendance-test-token', isLoggedIn: 'true', role: 'Admin', department: 'Engineering', isDefaultPasswordChanged: 'true' }).map(([name, value]) => ({ name, value, url: 'http://127.0.0.1:4173' })));
  await page.route('**/*', async route => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.continue();
    const url = route.request().url();
    if (url.includes('Attendance/GetDailyAttendance') || url.includes('Attendance/GetMonthlyAttendance')) {
      const payload = route.request().postDataJSON();
      requests.push({ endpoint: url.includes('Monthly') ? 'monthly' : 'daily', payload });
      if (shouldFail) {
        shouldFail = false;
        return route.fulfill({ status: 503, json: { message: 'Attendance service unavailable' } });
      }
      const rows = url.includes('Monthly')
        ? [{ attendanceDate: payload.fromDate, userEmail: 'asha@example.test', status: 'Present', firstClockIn: `${payload.fromDate}T09:00:00`, latestClockOut: `${payload.fromDate}T18:00:00`, department: 'Engineering', totalWorkDuration: '08:00:00', breakCount: 1, breakDuration: '01:00:00' }]
        : [{ slNo: 1, userName: 'Asha Rao', type: clockedOut ? 'Clock Out' : 'Clock In', time: clockedOut ? '06:00 PM' : '09:00 AM', department: 'Engineering', ipAddress: '192.0.2.1', location: 'Test office' }];
      return route.fulfill({ json: rows });
    }
    return route.fulfill({ json: [] });
  });
  return { requests, clockOut: () => { clockedOut = true; } };
}

async function selectDay(page: Page, label: string, day: number) {
  await page.getByRole('button', { name: label, exact: true }).click();
  const dateLabel = await page.evaluate(day => {
    const date = new Date();
    date.setDate(day);
    return date.toLocaleDateString();
  }, day);
  await page.getByRole('dialog').locator(`button[data-day="${dateLabel}"]`).click();
}

test('keeps attendance filters aligned with each view and refreshes after clock-out', async ({ page }, testInfo) => {
  const api = await attendanceWorkspace(page);
  await page.goto('/attendance');
  await expect(page.getByRole('cell', { name: 'Asha Rao', exact: true })).toBeVisible();
  const selectedDay = dayjs().date() === 3 ? 4 : 3;
  const dailyDate = dayjs().date(selectedDay).format('YYYY-MM-DD');
  await page.getByRole('button', { name: /^Filters/ }).click();
  await selectDay(page, 'Select Date', selectedDay);
  await page.getByLabel('Type', { exact: true }).selectOption('Clock In');
  await page.getByRole('button', { name: 'Apply Filters' }).click();
  await expect.poll(() => api.requests.at(-1)).toEqual({ endpoint: 'daily', payload: { date: dailyDate } });
  await page.getByRole('button', { name: 'Monthly Log' }).click();
  await expect(page.getByRole('cell', { name: 'asha@example.test', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove Type filter' })).toHaveCount(0);
  await page.getByRole('button', { name: /^Filters/ }).click();
  await selectDay(page, 'From Date', 1);
  await selectDay(page, 'To Date', 2);
  await page.getByRole('button', { name: 'Apply Filters' }).click();
  const range = { fromDate: dayjs().date(1).format('YYYY-MM-DD'), toDate: dayjs().date(2).format('YYYY-MM-DD') };
  await expect.poll(() => api.requests.at(-1)).toEqual({ endpoint: 'monthly', payload: range });
  await page.getByRole('button', { name: 'Daily Log' }).click();
  await expect.poll(() => api.requests.at(-1)).toEqual({ endpoint: 'daily', payload: { date: dailyDate } });
  await expect(page.getByRole('cell', { name: 'Asha Rao', exact: true })).toBeVisible();
  api.clockOut();
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('attendance:updated')));
  await expect(page.getByRole('cell', { name: 'Clock Out', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '06:00 PM', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Monthly Log' }).click();
  await expect.poll(() => api.requests.at(-1)).toEqual({ endpoint: 'monthly', payload: range });
  await expect(page.getByRole('cell', { name: 'asha@example.test', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('attendance-monthly.png'), fullPage: true, animations: 'disabled', scale: 'css' });
});

test('shows attendance failures and retries the same request', async ({ page }) => {
  const api = await attendanceWorkspace(page, true);
  await page.goto('/attendance');
  await expect(page.getByRole('alert')).toContainText('Attendance service unavailable');
  const failed = api.requests.at(-1);
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('cell', { name: 'Asha Rao', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(api.requests.at(-1)).toEqual(failed);
});
