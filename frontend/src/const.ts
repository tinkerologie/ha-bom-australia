export const DOMAIN = "bom_australia";

export const DOCUMENTATION_URL = "https://github.com/tinkerologie/ha-bom-australia#dashboard-cards";

/** Focused cards, in the order the all-in-one card stacks them. */
export const SECTIONS = ["now", "forecast", "warnings", "observations"] as const;
export type SectionKey = (typeof SECTIONS)[number];

export const ALL_IN_ONE_TAG = "bom-australia-card";

export const CARD_TAGS: Record<SectionKey, string> = {
  now: "bom-australia-now-card",
  forecast: "bom-australia-forecast-card",
  warnings: "bom-australia-warnings-card",
  observations: "bom-australia-observations-card",
};

/**
 * Entity translation keys (the integration's `sensor.py`). Forecast sensors exist once
 * per forecast day with the same key; they are told apart by their `date` attribute.
 */
export const KEY = {
  // Observations
  windDirection: "wind_direction",
  windGust: "wind_gust",
  windGustMax: "wind_gust_max",
  rainSince9am: "rain_since_9am",
  rain24h: "rain_24h",
  observedTempMax: "observed_temp_max",
  observedTempMin: "observed_temp_min",
  deltaT: "delta_t",
  observedAt: "observed_at",
  // Daily forecast (one entity per day)
  tempMax: "temp_max",
  tempMin: "temp_min",
  shortText: "short_text",
  extendedText: "extended_text",
  rainChance: "rain_chance",
  rainAmountRange: "rain_amount_range",
  uvIndex: "uv_index",
  uvCategory: "uv_category",
  uvStart: "uv_start",
  uvEnd: "uv_end",
  fireDanger: "fire_danger",
  // Today
  nowLabel: "now_label",
  nowTemp: "now_temp",
  laterLabel: "later_label",
  laterTemp: "later_temp",
  warnings: "warnings",
} as const;

export type EntityKey = (typeof KEY)[keyof typeof KEY];
