import { colorToken } from "./color-token";
import { expect, test, type Page } from '@playwright/test';

async function mockApi(page: Page, role: string, department: string) {
  await page.route('**/*', async route => {
    const request = route.request();
    if (request.resourceType() !== 'xhr' && request.resourceType() !== 'fetch') return route.continue();
    const url = request.url();
    const payload = url.includes('Permissions/Mine') ? { role: 'Employee', isAdminOrManager: false, onboarding: { read: false, write: false, edit: false }, workStatus: { read: false, write: false, edit: false } }
      : url.includes('Leave?') ? { leaves: [], holidays: [] }
      : url.includes('GetUser/') ? [{ firstName: 'Test', lastName: 'Employee', email: 'test@example.test', accessRole: role, department, designation: 'Engineer', employeeId: 'E-001' }]
      : [];
    return route.fulfill({ json: payload });
  });
}
async function session(page: Page, role = 'Employee', department = 'Engineering') {
  await page.context().addCookies(Object.entries({ token: 'e2e-test-token', isLoggedIn: 'true', role, department, email: 'test@example.test', isDefaultPasswordChanged: 'true' }).map(([name, value]) => ({ name, value, url: 'http://127.0.0.1:4173' })));
  await mockApi(page, role, department);
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
  await expect(page.getByRole('heading', { name: 'HR Assistant', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close HR assistant', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('opens separate Profile and Settings pages and keeps the old profile address working', async ({ page, isMobile }) => {
  await session(page);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'View profile' }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Employment Details' })).toBeVisible();
  if (isMobile) await page.getByRole('button', { name: 'Toggle navigation' }).click();
  const sidebar = page.getByRole('complementary', { name: 'Primary navigation' });
  await expect(sidebar.getByRole('link', { name: 'My Profile' })).toHaveAttribute('aria-current', 'page');
  await sidebar.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Profile', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Change password', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Change Password' })).toBeVisible();
  await page.goto('/view-employee');
  await expect(page).toHaveURL(/\/profile$/);
});

test('answers a common HR question without downloading the model', async ({ page }) => {
  const workers: string[] = [];
  page.on('worker', worker => workers.push(worker.url()));
  await session(page);
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Open HR assistant' }).click();
  await page.getByRole('button', { name: 'How do I request leave?' }).click();
  await expect(page.getByText(/enter your dates and reason/)).toBeVisible();
  await page.getByRole('textbox', { name: 'Ask the HRMS assistant' }).fill('Which HRMS page shows clock-in and clock-out records?');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText(/for clock-in and clock-out entries/)).toBeVisible();
  expect(workers.filter(url => url.includes('hrmsChat.worker'))).toHaveLength(0);
});

test('shows model download progress and retries a failed reply', async ({ page }) => {
  await session(page);
  await page.route('**/hrmsChat.worker-*.js', route => route.fulfill({
    contentType: 'text/javascript',
    body: `
      let attempts = 0;
      onmessage = ({ data }) => {
        if (data.type === 'prepare') postMessage({ type: 'progress', progress: 35 });
        if (data.type !== 'generate') return;
        const { requestId } = data;
        if (++attempts === 1) {
          postMessage({ type: 'error', requestId, loadingFailed: true });
          return;
        }
        postMessage({ type: 'ready' });
        postMessage({ type: 'generating', requestId });
        postMessage({ type: 'token', requestId, token: 'Review your attendance ' });
        postMessage({ type: 'token', requestId, token: 'for each day.' });
        postMessage({ type: 'done', requestId, response: '' });
      };
    `,
  }));
  await page.goto('/chat');
  await page.getByRole('textbox', { name: 'Ask the HRMS assistant' }).fill('What should I check on my first day?');
  await expect(page.getByText('Downloading model 35%', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('The AI model couldn’t load. Check your connection and retry.')).toBeVisible();
  await page.getByRole('button', { name: 'Retry response' }).click();
  await expect(page.getByText('Review your attendance for each day.', { exact: true })).toBeVisible();
});

test('opens the onboarding dashboard and applies department navigation rules', async ({ page, isMobile }) => {
  await session(page, 'Employee', 'Onboarding');
  await page.goto('/forgot-password');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText('Onboarding overview', { exact: true })).toBeVisible();
  if (isMobile) await page.getByRole('button', { name: 'Toggle navigation' }).click();
  const sidebar = page.getByRole('complementary', { name: 'Primary navigation' });
  await expect(sidebar.getByRole('link', { name: 'Dashboard', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(sidebar.getByRole('link', { name: 'Onboarding', exact: true })).toBeVisible();
  await expect(sidebar.getByRole('link', { name: 'Attendance', exact: true })).toHaveCount(0);
  await expect(sidebar.getByRole('link', { name: 'Employees', exact: true })).toHaveCount(0);
});

const employeeCards = [
  ['My Leaves', '1', '/leave'],
  ['Present Today', 'No', '/attendance'],
  ['Announcements', '7', '/announcement'],
];
const onboardingCards = [
  ['Onboarding records', '2', '/onboarding'],
  ['Active employees', '1', '/onboarding'],
  ['Assigned work', '1', '/work-status'],
  ['Submitted this month', '1', '/onboarding'],
];
const managementCards = [
  ['Present Today', '1', '/attendance'],
  ['Pending Leaves', '1', '/leave'],
  ['Announcements', '7', '/announcement'],
];

for (const { role, department, cards, attendanceUnavailable = false } of [
  { role: 'Admin', department: 'Engineering', cards: [['Total Employees', '3', '/employees'], ...managementCards] },
  { role: 'Manager', department: 'Engineering', cards: [['Department Staff', '2', '/employees'], ...managementCards] },
  { role: 'TeamLead', department: 'Engineering', cards: [['Team Members', '1', '/employees'], ...managementCards] },
  { role: 'Employee', department: 'Engineering', cards: employeeCards },
  { role: 'Employee', department: 'Engineering', cards: [employeeCards[0], ['Present Today', 'N/A', '/attendance'], employeeCards[2]], attendanceUnavailable: true },
  { role: 'Employee', department: 'Deizeisau', cards: [employeeCards[2]] },
  { role: 'Onboarding', department: 'Onboarding', cards: onboardingCards },
  { role: 'Admin', department: 'Onboarding', cards: onboardingCards.map(([label, value, link]) => [label, value, link === '/work-status' ? undefined : link]) },
]) {
  test(`maps dashboard metrics for ${role} in ${department}${attendanceUnavailable ? ' when attendance is unavailable' : ''}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-18T12:00:00Z'));
    await session(page, role, department);
    const employeeCount = role === 'Admin' ? 3 : role === 'Manager' ? 2 : 1;
    const requests = new Set<string>();
    const fixtures = new Map<string, unknown>([
      ['User/All', Array.from({ length: employeeCount }, (_, index) => ({ employeeId: `E-${index}`, department, isActive: true }))],
      ['Attendance/GetDailyAttendance', [
        { type: 'Clock In', userEmail: 'other@example.test' },
        { type: 'Clock-In', userEmail: 'other@example.test' },
        { type: 'Clock Out', userEmail: 'test@example.test' },
      ]],
      ['User/GetEmployeeLeave', { leaves: [
        { userName: 'test@example.test', approvedBy: 'manager@example.test', isApproved: true },
        { userName: 'other@example.test', approvedBy: null },
      ] }],
      ['Announcement/GetAnnouncement', [...Array.from({ length: 7 }, () => ({ isActive: true })), { isActive: false }]],
      ['EmployeeOnboarding/GetAll', [
        { submissionId: 1, employeeStatus: 'Active', workStatus: 'Active', submittedAt: '2026-11-15' },
        { submissionId: 2, employeeStatus: 'Inactive', workStatus: 'Not assigned', submittedAt: '2026-10-15' },
      ]],
      ['WorkStatus/GetAll', []],
    ]);
    await page.route('**/*', route => {
      const endpoint = [...fixtures.keys()].find(key => new URL(route.request().url()).pathname.endsWith(`/${key}`));
      if (!endpoint) return route.fallback();
      requests.add(endpoint);
      if (attendanceUnavailable && endpoint === 'Attendance/GetDailyAttendance') return route.fulfill({ status: 503 });
      return route.fulfill({ json: fixtures.get(endpoint) });
    });
    await page.goto('/dashboard');
    const grid = page.locator('.dashboard-stats-grid');
    await expect(grid.locator('.stat-label')).toHaveText(cards.map(([label]) => label));
    await expect(grid.locator('.stat-value')).toHaveText(cards.map(([, value]) => value));
    await expect(page.getByRole('img', { name: `Dashboard key performance indicators. ${cards.map(([label, value]) => `${label}: ${value}`).join(', ')}` })).toBeVisible();
    for (const [label, value, link] of cards) {
      if (link) await expect(grid.getByRole('link', { name: `${label}: ${value}`, exact: true })).toHaveAttribute('href', link);
      else await expect(grid.getByRole('link', { name: `${label}: ${value}`, exact: true })).toHaveCount(0);
    }
    if (role === 'Employee' && department === 'Engineering') {
      await expect(grid.getByText(attendanceUnavailable ? 'Attendance unavailable' : 'No clock-in recorded')).toBeVisible();
    }
    if (department === 'Deizeisau' || department === 'Onboarding') {
      await expect(page.getByRole('tab', { name: 'Attendance', exact: true })).toHaveCount(0);
      expect(requests.has('Attendance/GetDailyAttendance')).toBe(false);
    }
    if (role === 'Admin' && department === 'Onboarding') {
      await expect(page.getByRole('tab', { name: 'Work Status', exact: true })).toHaveCount(0);
      expect(requests.has('WorkStatus/GetAll')).toBe(false);
    }
  });
}
