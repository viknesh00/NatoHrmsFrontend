import { colorToken } from "./color-token";
import { expect, test } from "@playwright/test";

test.use({ timezoneId: "Asia/Kolkata", reducedMotion: "reduce", colorScheme: "light" });

test("celebrates the signed-in employee birthday and keeps a stable default accent", async ({ page }) => {
  const start = new Date("2026-11-18T11:59:05+05:30");
  await page.clock.install({ time: start });
  await page.context().addCookies(Object.entries({
    token: "e2e-test-token",
    isLoggedIn: "true",
    role: "Manager",
    email: "person@example.test",
    employeeId: "E-01",
    isDefaultPasswordChanged: "true",
  }).map(([name, value]) => ({ name, value, url: "http://127.0.0.1:4173" })));
  await page.route("**/*", async route => {
    if (!["xhr", "fetch"].includes(route.request().resourceType())) return route.continue();
    const url = route.request().url();
    const json = url.includes("User/GetUser/") ? [{
      firstName: "Asha",
      email: "person@example.test",
      accessRole: "Manager",
      isDefaultPasswordChanged: true,
      dob: "1990-11-18T23:30:00.000Z",
    }] : [];
    return route.fulfill({ json });
  });
  await page.addInitScript(() => {
    const start = AudioScheduledSourceNode.prototype.start;
    AudioScheduledSourceNode.prototype.start = function (when) {
      const root = document.documentElement;
      root.dataset.chimeNotes = String(Number(root.dataset.chimeNotes ?? "0") + 1);
      return start.call(this, when);
    };
  });

  await page.goto("/help-center");
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-role", "manager");
  await expect(root).not.toHaveAttribute("data-day-period");
  const content = page.locator(".main-content");
  const morningAccent = await colorToken(content, "--accent");
  await expect(page.getByRole("heading", { name: "Happy birthday, Asha!" })).toBeVisible();
  await expect(page.locator(".birthday-confetti")).toBeHidden();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("body > .birthday-confetti")).toBeVisible();
  await expect(page.locator(".birthday-confetti")).toHaveCSS("position", "fixed");
  await page.getByRole("heading", { name: "Help Center", exact: true }).click();
  await expect(root).toHaveAttribute("data-chime-notes", "4");
  await page.getByRole("button", { name: "Play birthday chime" }).click();
  await expect(root).toHaveAttribute("data-chime-notes", "8");
  await expect.poll(() => page.locator("canvas.birthday-confetti").evaluate((canvas: HTMLCanvasElement) => {
    const pixels = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels?.some((channel, index) => index % 4 === 3 && channel > 0);
  })).toBe(true);
  await page.getByRole("button", { name: "Dismiss birthday celebration" }).click();
  await expect(page.getByRole("heading", { name: /happy birthday/i })).toHaveCount(0);

  for (const localTime of ["11:59:05", "16:59:05", "20:59:05"]) {
    await page.clock.setSystemTime(new Date(`2026-11-18T${localTime}+05:30`));
    await page.clock.fastForward(60_000);
    await expect(root).not.toHaveAttribute("data-day-period");
    expect(await colorToken(content, "--accent")).toBe(morningAccent);
  }
  await expect(root).toHaveAttribute("data-role", "manager");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Happy birthday, Asha!" })).toBeVisible();
  await expect(page.locator(".birthday-confetti")).toHaveCount(0);
  await page.getByRole("heading", { name: "Help Center", exact: true }).click();
  await expect(root).not.toHaveAttribute("data-chime-notes", /.+/);

  await page.clock.setSystemTime(new Date("2026-11-19T08:00:00+05:30"));
  await page.reload();
  await expect(page.getByRole("heading", { name: /help center/i }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /happy birthday/i })).toHaveCount(0);
});

test("themes the public sign-in controls in light and dark mode", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-11-18T22:30:00+05:30") });
  await page.goto("/login");
  const root = page.locator("html");
  const button = page.getByRole("button", { name: "Sign in", exact: true });
  await expect(root).not.toHaveAttribute("data-day-period");
  const lightPrimary = await colorToken(button, "--primary");
  await expect(button).toHaveCSS("background-color", lightPrimary);

  const field = page.getByLabel("Email address");
  const lightField = await colorToken(field, "--card");
  await expect(field).toHaveCSS("background-color", lightField);
  await field.fill("person@example.test");

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(root).toHaveAttribute("data-theme", "dark");
  const darkPrimary = await colorToken(button, "--primary");
  expect(darkPrimary).not.toBe(lightPrimary);
  await expect(button).toHaveCSS("background-color", darkPrimary);
  const darkField = await colorToken(field, "--card");
  expect(darkField).not.toBe(lightField);
  await expect(field).toHaveCSS("background-color", darkField);
  await expect(field).toHaveValue("person@example.test");
});
