/**
 * Browser tests for the card suite: the committed bundle, loaded the way Home Assistant
 * serves it, against a fixture captured from a live HA 2026.10 instance (town renamed).
 * Screenshots of every card in light and dark mode are written to test-results/.
 */
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/hass.json", import.meta.url), "utf8"));
const DEVICE: string = fixture.device_id;

const CARDS: { tag: string; text: string }[] = [
  { tag: "bom-australia-now-card", text: "Feels like" },
  { tag: "bom-australia-forecast-card", text: "Today" },
  { tag: "bom-australia-warnings-card", text: "No warnings for Brisbane" },
  { tag: "bom-australia-observations-card", text: "Pressure" },
  { tag: "bom-australia-card", text: "Feels like" },
];

/** A real BoM flood warning (Condamine River, 2026-10-27), as the warnings sensor exposes it. */
const WARNING = {
  id: "QLD_RC170_IDQ20829",
  type: "flood_warning",
  title: "Flood Warning for Condamine River downstream of Oakey Creek to Cotswold",
  short_title: "Flood Warning",
  phase: "new",
  group_type: "major",
  issued: "2026-10-27T04:29:27+00:00",
  expires: "2026-10-30T07:29:27+00:00",
  message: "Initial Minor Flood Warning for the Lower Condamine River\n\nMinor flooding is possible at Cotswold from Wednesday.",
};

async function setup(page: Page, { dark = false } = {}) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  await page.emulateMedia({ colorScheme: dark ? "dark" : "light" });
  await page.goto("/");
  await page.evaluate(
    async ({ dark, fixture }) => {
      if (dark) document.documentElement.dataset.theme = "dark";
      (window as unknown as { fixture: unknown }).fixture = fixture;
      // Served by tests/browser/server.mjs, as Home Assistant serves it.
      const bundle = "/bom_australia/bom-australia-cards.js";
      await import(/* @vite-ignore */ bundle);
    },
    { dark, fixture },
  );
  return errors;
}

async function mount(
  page: Page,
  tag: string,
  config: Record<string, unknown> = { device: DEVICE },
  opts: { dark?: boolean; states?: object; forecast?: unknown; fixture?: unknown } = {},
) {
  await page.evaluate(
    async ({ tag, config, opts }) => {
      const w = window as unknown as {
        fixture: unknown;
        makeHass: (f: unknown, o: unknown) => unknown;
        mountCard: (t: string, c: unknown, h: unknown) => Promise<HTMLElement>;
      };
      const hassOptions: Record<string, unknown> = { darkMode: !!opts.dark, states: opts.states ?? {} };
      if (opts.forecast !== undefined) hassOptions.forecast = opts.forecast;
      await w.mountCard(tag, config, w.makeHass(opts.fixture ?? w.fixture, hassOptions));
    },
    { tag, config, opts },
  );
  return page.locator(tag);
}

for (const dark of [false, true]) {
  for (const { tag, text } of CARDS) {
    test(`${tag} renders (${dark ? "dark" : "light"})`, async ({ page }) => {
      const errors = await setup(page, { dark });
      const card = await mount(page, tag, { device: DEVICE }, { dark });
      await expect(card).toContainText(text);
      await card.screenshot({ path: `test-results/screenshots/${tag}-${dark ? "dark" : "light"}.png` });
      expect(errors).toEqual([]);
    });
  }
}

test("now card shows today's forecast, rain, UV and fire danger", async ({ page }) => {
  await setup(page);
  const card = await mount(page, "bom-australia-now-card");
  await expect(card).toContainText("Shower or two.");
  await expect(card).toContainText("Fire danger: Moderate");
  await expect(card).toContainText("UV");
  await expect(card).toContainText("Max");
  await expect(card).toContainText("Brisbane");
});

test("warnings card lists a warning and expands its text", async ({ page }) => {
  await setup(page);
  const sensor = fixture.states["sensor.brisbane_warnings"];
  const card = await mount(page, "bom-australia-warnings-card", { device: DEVICE }, {
    states: { "sensor.brisbane_warnings": { ...sensor, state: "1", attributes: { ...sensor.attributes, warnings: [WARNING] } } },
  });
  await expect(card).toContainText(WARNING.title);
  await expect(card).toContainText("1 current");
  await expect(card).toContainText("New");
  const message = card.locator("details .message");
  await expect(message).toBeHidden();
  await card.locator("details summary").click();
  await expect(message).toBeVisible();
  await expect(message).toContainText("Minor flooding is possible");
  await card.screenshot({ path: "test-results/screenshots/warnings-active-light.png" });
});

test("now card links to the warnings when there are any", async ({ page }) => {
  await setup(page);
  const sensor = fixture.states["sensor.brisbane_warnings"];
  const card = await mount(page, "bom-australia-now-card", { device: DEVICE }, {
    states: { "sensor.brisbane_warnings": { ...sensor, state: "2", attributes: { ...sensor.attributes, warnings: [WARNING, WARNING] } } },
  });
  await expect(card).toContainText("2 warnings");
});

test("forecast card switches to the hourly forecast", async ({ page }) => {
  await setup(page);
  const card = await mount(page, "bom-australia-forecast-card");
  await expect(card.locator(".day")).toHaveCount(7);
  await card.locator("ha-filter-chip", { hasText: "Hourly" }).click();
  await expect(card.locator(".hour")).toHaveCount(24);
  await card.screenshot({ path: "test-results/screenshots/forecast-hourly-light.png" });
});

test("forecast card honours days and hours options", async ({ page }) => {
  await setup(page);
  const card = await mount(page, "bom-australia-forecast-card", { device: DEVICE, days: 3, show_text: false });
  await expect(card.locator(".day")).toHaveCount(3);
  await expect(card.locator("details")).toHaveCount(0);
  const hourly = await mount(page, "bom-australia-forecast-card", { device: DEVICE, forecast_type: "hourly", hours: 6 });
  await expect(hourly.locator(".hour")).toHaveCount(6);
});

test("forecast card explains an unavailable forecast", async ({ page }) => {
  await setup(page);
  const card = await mount(page, "bom-australia-forecast-card", { device: DEVICE }, { forecast: {} });
  await expect(card).toContainText("The forecast is unavailable at the moment.");
});

test("tapping the current conditions opens more-info", async ({ page }) => {
  await setup(page);
  const card = await mount(page, "bom-australia-now-card");
  const opened = page.evaluate(
    () =>
      new Promise<string>((resolve) =>
        window.addEventListener("hass-more-info", (e) => resolve((e as CustomEvent).detail.entityId), { once: true }),
      ),
  );
  await card.locator(".hero").focus();
  await page.keyboard.press("Enter");
  expect(await opened).toBe("weather.brisbane");
});

test("cards explain missing setup and unavailable data", async ({ page }) => {
  await setup(page);
  const empty = { ...fixture, entities: {}, devices: {} };
  const notSetUp = await mount(page, "bom-australia-now-card", {}, { fixture: empty });
  await expect(notSetUp).toContainText("Add the Bureau of Meteorology integration");

  const missing = await mount(page, "bom-australia-forecast-card", { device: "gone" });
  await expect(missing).toContainText("no longer exists");

  const weather = fixture.states["weather.brisbane"];
  const unavailable = await mount(page, "bom-australia-observations-card", { device: DEVICE }, {
    states: { "weather.brisbane": { ...weather, state: "unavailable" } },
  });
  await expect(unavailable).toContainText("unavailable at the moment");
});

test("cards are listed in the card picker and suggested for the weather entity", async ({ page }) => {
  await setup(page);
  const result = await page.evaluate((fixture) => {
    const cards = (window as unknown as { customCards: { type: string; getEntitySuggestion?: Function }[] }).customCards;
    const all = cards.find((c) => c.type === "bom-australia-card")!;
    const hass = { entities: fixture.entities };
    return {
      types: cards.map((c) => c.type).sort(),
      weather: all.getEntitySuggestion!(hass, "weather.brisbane"),
      sensor: all.getEntitySuggestion!(hass, "sensor.brisbane_temperature"),
    };
  }, fixture);
  expect(result.types).toEqual([
    "bom-australia-card",
    "bom-australia-forecast-card",
    "bom-australia-now-card",
    "bom-australia-observations-card",
    "bom-australia-warnings-card",
  ]);
  expect(result.weather).toEqual({ config: { type: "custom:bom-australia-card", device: DEVICE } });
  expect(result.sensor).toBeNull();
});

test("bundle can load twice", async ({ page }) => {
  const errors = await setup(page);
  await page.evaluate(() => {
    const bundle = "/bom_australia/bom-australia-cards.js?again";
    return import(/* @vite-ignore */ bundle);
  });
  const count = await page.evaluate(
    () => (window as unknown as { customCards: unknown[] }).customCards.length,
  );
  expect(count).toBe(5);
  expect(errors).toEqual([]);
});

test("cards fit a phone-width column", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await setup(page);
  await page.evaluate(() => {
    document.getElementById("grid")!.style.width = "328px";
  });
  for (const { tag } of CARDS) {
    const card = await mount(page, tag);
    const overflow = await card.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(overflow, tag).toBeLessThanOrEqual(0);
  }
  await page.screenshot({ path: "test-results/screenshots/phone-light.png", fullPage: true });
});
