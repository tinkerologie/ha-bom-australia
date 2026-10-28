/**
 * Weather presentation model: condition icons, and the tones of the official BoM
 * scales. Every tone is shown together with an icon and a text label.
 */
import type { Tone } from "./tone";

/** Home Assistant weather condition -> mdi icon (HA's own mapping). */
const CONDITION_ICONS: Record<string, string> = {
  "clear-night": "mdi:weather-night",
  cloudy: "mdi:weather-cloudy",
  exceptional: "mdi:alert-circle-outline",
  fog: "mdi:weather-fog",
  hail: "mdi:weather-hail",
  lightning: "mdi:weather-lightning",
  "lightning-rainy": "mdi:weather-lightning-rainy",
  partlycloudy: "mdi:weather-partly-cloudy",
  pouring: "mdi:weather-pouring",
  rainy: "mdi:weather-rainy",
  snowy: "mdi:weather-snowy",
  "snowy-rainy": "mdi:weather-snowy-rainy",
  sunny: "mdi:weather-sunny",
  windy: "mdi:weather-windy",
  "windy-variant": "mdi:weather-windy-variant",
};

/** Night variants of daytime icons, for hourly forecasts after dark. */
const NIGHT_ICONS: Record<string, string> = {
  partlycloudy: "mdi:weather-night-partly-cloudy",
  sunny: "mdi:weather-night",
};

export const KNOWN_CONDITIONS = Object.keys(CONDITION_ICONS);

export function conditionIcon(condition: string | null | undefined, isDaytime?: boolean | null): string {
  if (!condition) return "mdi:weather-cloudy-clock";
  if (isDaytime === false && NIGHT_ICONS[condition]) return NIGHT_ICONS[condition]!;
  return CONDITION_ICONS[condition] ?? "mdi:weather-cloudy-clock";
}

/** Tone of a weather condition's icon bubble. */
export function conditionTone(condition: string | null | undefined): Tone {
  switch (condition) {
    case "sunny":
      return "amber";
    case "clear-night":
      return "purple";
    case "rainy":
    case "pouring":
    case "hail":
      return "blue";
    case "lightning":
    case "lightning-rainy":
    case "exceptional":
      return "orange";
    default:
      return "grey";
  }
}

export const UV_CATEGORIES = ["low", "moderate", "high", "very_high", "extreme"] as const;
export type UvCategory = (typeof UV_CATEGORIES)[number];

/** WHO UV index categories (as used by the BoM). */
export function uvCategory(index: number | undefined): UvCategory | undefined {
  if (index === undefined || !Number.isFinite(index)) return undefined;
  if (index >= 11) return "extreme";
  if (index >= 8) return "very_high";
  if (index >= 6) return "high";
  if (index >= 3) return "moderate";
  return "low";
}

/** WHO UV colours: green, yellow, orange, red, purple. */
export function uvTone(category: UvCategory | undefined): Tone {
  switch (category) {
    case "low":
      return "green";
    case "moderate":
      return "yellow";
    case "high":
      return "orange";
    case "very_high":
      return "red";
    case "extreme":
      return "purple";
    default:
      return "grey";
  }
}

/** Australian Fire Danger Rating System colours. */
export function fireDangerTone(rating: string | undefined): Tone {
  switch (rating?.trim().toLowerCase()) {
    case "moderate":
      return "green";
    case "high":
      return "yellow";
    case "extreme":
      return "orange";
    case "catastrophic":
      return "red";
    default:
      return "grey";
  }
}

/** Warning icon by BoM warning type (e.g. `flood_warning`, `severe_thunderstorm_warning`). */
export function warningIcon(type: string | undefined): string {
  const value = type ?? "";
  if (value.includes("flood")) return "mdi:home-flood";
  if (value.includes("thunderstorm")) return "mdi:weather-lightning-rainy";
  if (value.includes("fire")) return "mdi:fire-alert";
  if (value.includes("heat")) return "mdi:thermometer-alert";
  if (value.includes("cyclone")) return "mdi:weather-hurricane";
  if (value.includes("wind") || value.includes("gale")) return "mdi:weather-windy";
  if (value.includes("marine") || value.includes("surf") || value.includes("tsunami")) return "mdi:waves";
  if (value.includes("frost") || value.includes("sheep")) return "mdi:snowflake-alert";
  if (value.includes("dust") || value.includes("smoke")) return "mdi:weather-hazy";
  return "mdi:alert-outline";
}

/** BoM groups warnings as major (red) or minor (amber). */
export function warningTone(groupType: string | undefined): Tone {
  return groupType === "major" ? "red" : "amber";
}

/**
 * Position of a day's temperature range on a shared scale, as start and width
 * percentages, for the forecast range bars.
 */
export function rangeBar(
  low: number | undefined,
  high: number | undefined,
  scaleMin: number,
  scaleMax: number,
): { start: number; width: number } | undefined {
  if (high === undefined || !Number.isFinite(scaleMin) || !Number.isFinite(scaleMax)) return undefined;
  const span = Math.max(scaleMax - scaleMin, 1);
  const from = low ?? high;
  const start = ((Math.min(from, high) - scaleMin) / span) * 100;
  const width = (Math.abs(high - from) / span) * 100;
  return { start: clamp(start, 0, 100), width: clamp(width, 2, 100 - clamp(start, 0, 100)) };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
