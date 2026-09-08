import { test, expect } from "@playwright/test";
const localeCases = [
  ["en", "Insurance incident", "Zoom in", "What is known about Opole cameras"],
  [
    "pl",
    "Zdarzenie ubezpieczeniowe",
    "Przybliż",
    "Co wiadomo o kamerach w Opolu",
  ],
  ["uk", "Страховий випадок", "Наблизити", "Що відомо про камери Ополя"],
  ["ru", "Страховой случай", "Приблизить", "Что известно о камерах Opole"],
] as const;
for (const [locale, insurance, zoom, sources] of localeCases) {
  test(`${locale}: insurance, map controls and sources follow selected language`, async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await expect(page.locator(".shell")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.locator(".experience-tools select").selectOption(locale);
    await expect(page.locator(".map")).toHaveAttribute("data-ready", "true", {
      timeout: 30000,
    });
    await expect(page.locator(".insurance-panel summary")).toContainText(
      insurance,
    );
    await expect(page.locator(".maplibregl-ctrl-zoom-in")).toHaveAttribute(
      "aria-label",
      zoom,
    );
    await page.locator(".insurance-panel summary").click();
    await page.screenshot({
      path: testInfo.outputPath(`${locale}-insurance.png`),
    });
    await page.locator(".sources-button").click();
    await expect(page.locator("#sources-title")).toHaveText(sources);
    await page.screenshot({
      path: testInfo.outputPath(`${locale}-sources.png`),
    });
  });
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("opole-camera-map:locale", "en"),
  );
});
test("map loads and can switch to 3D", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".shell")).toHaveCount(1);
  await expect(page.locator(".map")).toHaveAttribute("data-ready", "true", {
    timeout: 30000,
  });
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(page.locator(".map")).toHaveAttribute("data-mode", "3d");
});
test("search Ratusz limits catalogue to matching entries", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".shell")).toHaveCount(1);
  await page.locator("#camera-search").fill("Ratusz");
  await expect(page.locator(".camera-row")).toHaveCount(4);
});
test("ITS filter shows ITS records", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".shell")).toHaveCount(1);
  await page.locator("#camera-category").selectOption("its");
  await expect(page.locator(".map")).toHaveAttribute(
    "data-camera-count",
    "159",
  );
  await expect(page.locator(".camera-row").first()).toContainText("S01_CCTV1");
});
test("direct link opens the requested camera", async ({ page }) => {
  await page.goto("/?camera=its%3A1");
  await expect(page.locator(".details-card")).toContainText("S01_CCTV1");
});
test("language and theme can be changed", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".shell")).toHaveCount(1);
  await page.locator(".experience-tools select").selectOption("pl");
  await expect(page.locator("html")).toHaveAttribute("lang", "pl");
  await page.locator(".experience-tools > div > button").nth(1).click();
  await expect(page.locator(".map")).toHaveAttribute("data-theme", "dark");
});
test("mobile catalogue opens and search works without horizontal overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".shell")).toHaveCount(1);
  await page.locator(".mobile-list-button").click();
  await expect(page.locator("#camera-search")).toBeVisible();
  await page.locator("#camera-search").fill("Ratusz");
  await expect(page.locator(".camera-row")).toHaveCount(4);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("map recovers from WebGL context loss", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator(".shell")).toHaveCount(1);
  await expect(page.locator(".map")).toHaveAttribute("data-ready", "true", {
    timeout: 30000,
  });
  await page
    .locator(".map canvas")
    .evaluate((canvas) =>
      canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })),
    );
  await expect(page.locator(".map-error")).toContainText("graphics context");
  await page.getByRole("button", { name: "Reload map", exact: true }).click();
  await expect(page.locator(".map")).toHaveAttribute("data-ready", "true", {
    timeout: 30000,
  });
});

test("offline navigation shows standalone fallback", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await context.setOffline(true);
  await page.goto("/?camera=its%3A1");
  await expect(
    page.getByText("You are offline.", { exact: false }),
  ).toBeVisible();
});

test("security headers and machine-readable street errors", async ({
  request,
}) => {
  const response = await request.get("/");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["content-security-policy-report-only"]).toContain(
    "object-src 'none'",
  );
  const invalid = await request.get("/api/streets?q=x");
  expect(invalid.status()).toBe(400);
  expect(await invalid.json()).toEqual({ code: "STREET_INVALID_QUERY" });
});
