import { expect, test, type Page } from "@playwright/test";

async function openContactCard(page: Page) {
  await page.route("**/*", async route => {
    if (!["xhr", "fetch"].includes(route.request().resourceType())) return route.continue();
    const json = route.request().url().includes("User/GetUser/") ? [{
      firstName: "Asha",
      lastName: "Rao",
      designation: "Staff Engineer",
      department: "Engineering",
      accessRole: "Employee",
      email: "asha@example.test",
      contactNumber: "+919555123456",
      isDefaultPasswordChanged: true,
    }] : [];
    return route.fulfill({ json });
  });
  await page.context().addCookies(Object.entries({
    token: "e2e-test-token",
    isLoggedIn: "true",
    role: "Employee",
    email: "asha@example.test",
    isDefaultPasswordChanged: "true",
  }).map(([name, value]) => ({ name, value, url: "http://127.0.0.1:4173" })));
  await page.goto("/vcard");
  await expect(page.getByRole("heading", { name: "Asha Rao" })).toBeVisible();
}

test("renders and drags the personalized 3D card", async ({ page, isMobile }, testInfo) => {
  const errors: Error[] = [];
  page.on("pageerror", error => errors.push(error));
  await openContactCard(page);
  const badge = page.locator(".event-badge-canvas[data-ready=true] canvas");
  await expect(badge).toBeVisible();
  await badge.screenshot({ path: testInfo.outputPath("3d-badge.png") });
  const geometry = await badge.boundingBox();
  if (!geometry) throw new Error("The 3D badge had no visible viewport");
  const { x, y, width, height } = geometry;
  const scene = page.locator(".event-badge-canvas");
  const start = { x: Math.round(x + width * 0.51), y: Math.round(y + height * 0.64) };
  const end = { x: x + width * 0.67, y: start.y };
  if (isMobile) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [start] });
    await expect(scene).toHaveAttribute("data-dragging", "true");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [end] });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await cdp.detach();
  } else {
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await expect(scene).toHaveAttribute("data-dragging", "true");
    await page.mouse.move(end.x, end.y, { steps: 10 });
    await page.mouse.up();
  }
  await expect(scene).toHaveAttribute("data-dragging", "false");
  expect(errors).toEqual([]);
  await expect(page.getByRole("link", { name: "asha@example.test" })).toHaveAttribute("href", "mailto:asha@example.test");
});

test("keeps contact actions usable with the static badge", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openContactCard(page);
  await expect(page.locator(".vcard-static-badge")).toBeVisible();
  await expect(page.locator(".event-badge-canvas")).toHaveCount(0);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save contact" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("Asha-Rao.vcf");
  await expect(page.getByRole("status")).toHaveText("Contact card downloaded");
});
