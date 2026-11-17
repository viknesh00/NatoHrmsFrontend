import { expect, test } from '@playwright/test';
import dayjs from 'dayjs';

test('calendar day, agenda, and dashboard event colors stay event-specific', async ({ page }) => {
  const start = dayjs().startOf('month');
  const events = [
    { holidayId: 1, eventName: 'Team outing', eventType: 'Event', eventDate: start.date(8).format('YYYY-MM-DD'), workLocation: 'All' },
    { holidayId: 2, eventName: 'Company town hall', eventType: 'Event', eventDate: start.date(18).format('YYYY-MM-DD'), workLocation: 'All' },
    { holidayId: 3, eventName: 'Founders Day', eventType: 'Holiday', eventDate: start.date(24).format('YYYY-MM-DD'), workLocation: 'All' },
  ];

  await page.context().addCookies(Object.entries({ token: 'calendar-test-token', isLoggedIn: 'true', role: 'Admin', department: 'Engineering', isDefaultPasswordChanged: 'true' }).map(([name, value]) => ({ name, value, url: 'http://127.0.0.1:4173' })));
  await page.route('**/*', async route => {
    if (!['xhr', 'fetch'].includes(route.request().resourceType())) return route.continue();
    const url = route.request().url();
    return route.fulfill({ json: url.includes('Holiday/GetHolidays') ? events : [] });
  });

  await page.goto('/calendar');
  const pills = page.locator('.company-calendar-event-pill');
  await expect(pills).toHaveCount(3);
  const eventColors = await pills.evaluateAll(elements => elements.slice(0, 2).map(element => getComputedStyle(element).backgroundColor));
  expect(eventColors[0]).not.toBe(eventColors[1]);
  const dayColors = await pills.evaluateAll(elements => elements.slice(0, 2).map(element => getComputedStyle(element.closest('td')).backgroundColor));
  expect(dayColors[0]).not.toBe(dayColors[1]);

  await page.getByRole('tab', { name: 'Agenda' }).click();
  const agendaBadges = page.locator('.calendar-agenda-row [data-slot="badge"]');
  const agendaColors = await agendaBadges.evaluateAll(elements => elements.slice(0, 2).map(element => getComputedStyle(element).backgroundColor));
  expect(agendaColors[0]).not.toBe(agendaColors[1]);

  await page.goto('/dashboard');
  const openAssistant = page.getByRole('button', { name: 'Open HR assistant' });
  await expect(openAssistant).toBeVisible();
  await expect(page.getByRole('link', { name: 'HR Assistant' })).toHaveCount(0);
  await openAssistant.click();
  await expect(page.getByRole('heading', { name: 'HR assistant' })).toBeVisible();
});
