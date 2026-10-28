/**
 * Minimal Home Assistant frontend types the cards rely on (HA 2026.9+).
 * Only the fields used here are declared; see home-assistant/frontend `src/types.ts`.
 */

export interface HassEntityAttributes {
  friendly_name?: string;
  icon?: string;
  unit_of_measurement?: string;
  entity_picture?: string;
  [key: string]: unknown;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: HassEntityAttributes;
  last_changed: string;
  last_updated: string;
}

/** `hass.entities`: entity registry display entries. */
export interface EntityRegistryDisplayEntry {
  entity_id: string;
  name?: string | null;
  device_id?: string | null;
  platform?: string;
  translation_key?: string | null;
  hidden?: boolean;
  entity_category?: string | null;
}

/** `hass.devices`: device registry entries. */
export interface DeviceRegistryEntry {
  id: string;
  name?: string | null;
  name_by_user?: string | null;
  config_entries: string[];
  identifiers?: [string, string][];
}

export interface FrontendLocaleData {
  language: string;
  number_format?: string;
  time_format?: string;
  /** "local" (browser) or "server" (HA's configured zone). */
  time_zone?: string;
}

export interface MessageBase {
  type: string;
  [key: string]: unknown;
}

export interface HassConnection {
  sendMessagePromise<T>(message: MessageBase): Promise<T>;
  /** Resolves to an unsubscribe function. */
  subscribeMessage<T>(callback: (message: T) => void, message: MessageBase): Promise<() => Promise<void>>;
  addEventListener?(event: "ready" | "disconnected", listener: () => void): void;
  removeEventListener?(event: "ready" | "disconnected", listener: () => void): void;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  entities: Record<string, EntityRegistryDisplayEntry>;
  devices: Record<string, DeviceRegistryEntry>;
  locale: FrontendLocaleData;
  language?: string;
  config: {
    latitude: number;
    longitude: number;
    time_zone: string;
    location_name?: string;
  };
  themes?: { darkMode?: boolean };
  connection: HassConnection;
  formatEntityState?(stateObj: HassEntity, state?: string): string;
  formatEntityAttributeValue?(stateObj: HassEntity, attribute: string, value?: unknown): string;
  formatEntityAttributeName?(stateObj: HassEntity, attribute: string): string;
}

/** Options shared by every card. */
export interface BaseCardConfig {
  type: string;
  /** Device of the integration's config entry (one forecast town); scopes the card. */
  device?: string;
  title?: string;
}

/** One entry of a `weather/subscribe_forecast` event. */
export interface ForecastEntry {
  datetime: string;
  condition?: string | null;
  temperature?: number | null;
  templow?: number | null;
  apparent_temperature?: number | null;
  precipitation?: number | null;
  precipitation_probability?: number | null;
  humidity?: number | null;
  uv_index?: number | null;
  wind_speed?: number | null;
  wind_gust_speed?: number | null;
  wind_bearing?: number | string | null;
  is_daytime?: boolean | null;
}

export interface ForecastEvent {
  type: "daily" | "hourly" | "twice_daily";
  forecast: ForecastEntry[] | null;
}

export interface LovelaceGridOptions {
  columns?: number | "full";
  rows?: number | "auto";
  min_columns?: number;
  max_columns?: number;
  min_rows?: number;
  max_rows?: number;
}

export interface HaFormSchema {
  name: string;
  required?: boolean;
  default?: unknown;
  selector?: Record<string, unknown>;
  type?: string;
  schema?: HaFormSchema[];
}

export interface LovelaceConfigForm {
  schema: HaFormSchema[];
  assertConfig?: (config: BaseCardConfig) => void;
  computeLabel?: (schema: HaFormSchema) => string | undefined;
  computeHelper?: (schema: HaFormSchema) => string | undefined;
}

export interface CustomCardEntry {
  type: string;
  name: string;
  description: string;
  preview?: boolean;
  documentationURL?: string;
  getEntitySuggestion?(hass: HomeAssistant, entityId: string): { config: Record<string, unknown> } | null;
}

declare global {
  interface Window {
    customCards?: CustomCardEntry[];
    loadCardHelpers?: () => Promise<unknown>;
  }
}
