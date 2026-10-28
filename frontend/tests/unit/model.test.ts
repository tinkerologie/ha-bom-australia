import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { KEY } from "../../src/const";
import {
  entityIdFor,
  forecastStatesByDate,
  integrationDevices,
  isIntegrationDevice,
  resolveDevice,
  todayState,
  weatherEntityId,
} from "../../src/ha/entities";
import {
  conditionIcon,
  fireDangerTone,
  rangeBar,
  uvCategory,
  uvTone,
  warningIcon,
  warningTone,
} from "../../src/model/weather";
import type { HomeAssistant } from "../../src/types";

const fixture = JSON.parse(readFileSync(new URL("../browser/fixtures/hass.json", import.meta.url), "utf8"));
const DEVICE: string = fixture.device_id;

function hass(overrides: Partial<HomeAssistant> = {}): HomeAssistant {
  return {
    states: fixture.states,
    entities: fixture.entities,
    devices: fixture.devices,
    locale: { language: "en" },
    config: { latitude: 0, longitude: 0, time_zone: "Australia/Brisbane" },
    connection: {} as HomeAssistant["connection"],
    ...overrides,
  } as HomeAssistant;
}

describe("entity resolution", () => {
  it("finds the integration's device and weather entity", () => {
    expect(integrationDevices(hass())).toEqual([DEVICE]);
    expect(resolveDevice(hass())).toBe(DEVICE);
    expect(resolveDevice(hass(), "other")).toBe("other");
    expect(isIntegrationDevice(hass(), DEVICE)).toBe(true);
    expect(isIntegrationDevice(hass(), "other")).toBe(false);
    expect(weatherEntityId(hass(), DEVICE)).toBe("weather.brisbane");
  });

  it("finds sensors by translation key, never by entity ID", () => {
    expect(entityIdFor(hass(), DEVICE, KEY.warnings)).toBe("sensor.brisbane_warnings");
    expect(entityIdFor(hass(), undefined, KEY.warnings)).toBeUndefined();
  });

  it("ignores other integrations' look-alike entities", () => {
    const entities = {
      ...fixture.entities,
      "sensor.lookalike_warnings": {
        entity_id: "sensor.lookalike_warnings",
        platform: "bureau_of_meteorology",
        device_id: DEVICE,
        translation_key: "warnings",
      },
    };
    expect(entityIdFor(hass({ entities }), DEVICE, KEY.warnings)).toBe("sensor.brisbane_warnings");
  });

  it("tells forecast days apart by their date attribute", () => {
    const byDate = forecastStatesByDate(hass(), DEVICE, KEY.tempMax);
    expect([...byDate.keys()].sort()).toEqual(["2026-10-28", "2026-10-29", "2026-10-30"]);
    expect(todayState(hass(), DEVICE, KEY.tempMax)?.entity_id).toBe("sensor.brisbane_max_temperature_day_0");
    expect(todayState(hass(), DEVICE, KEY.nowLabel)).toBeUndefined();
  });
});

describe("weather model", () => {
  it.each([
    [undefined, undefined],
    [0, "low"],
    [2.9, "low"],
    [3, "moderate"],
    [6, "high"],
    [8, "very_high"],
    [11, "extreme"],
  ] as const)("UV index %s is %s", (index, category) => {
    expect(uvCategory(index)).toBe(category);
  });

  it("uses the WHO UV and AFDRS fire danger colours", () => {
    expect(uvTone("low")).toBe("green");
    expect(uvTone("extreme")).toBe("purple");
    expect(uvTone(undefined)).toBe("grey");
    expect(fireDangerTone("Moderate")).toBe("green");
    expect(fireDangerTone("High")).toBe("yellow");
    expect(fireDangerTone("Extreme")).toBe("orange");
    expect(fireDangerTone("Catastrophic")).toBe("red");
    expect(fireDangerTone("No rating")).toBe("grey");
  });

  it("chooses warning icons and tones", () => {
    expect(warningIcon("flood_warning")).toBe("mdi:home-flood");
    expect(warningIcon("severe_thunderstorm_warning")).toBe("mdi:weather-lightning-rainy");
    expect(warningIcon("something_new")).toBe("mdi:alert-outline");
    expect(warningTone("major")).toBe("red");
    expect(warningTone("minor")).toBe("amber");
  });

  it("chooses condition icons, with night variants", () => {
    expect(conditionIcon("rainy")).toBe("mdi:weather-rainy");
    expect(conditionIcon("sunny", false)).toBe("mdi:weather-night");
    expect(conditionIcon("partlycloudy", false)).toBe("mdi:weather-night-partly-cloudy");
    expect(conditionIcon(undefined)).toBe("mdi:weather-cloudy-clock");
  });

  it("places temperature ranges on a shared scale", () => {
    expect(rangeBar(10, 20, 10, 30)).toEqual({ start: 0, width: 50 });
    expect(rangeBar(20, 30, 10, 30)).toEqual({ start: 50, width: 50 });
    expect(rangeBar(15, 15, 10, 30)?.width).toBe(2);
    expect(rangeBar(10, undefined, 10, 30)).toBeUndefined();
  });
});
