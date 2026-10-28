/**
 * Entity resolution through the entity and device registries.
 *
 * Cards never match entity IDs by name: entities are found by integration platform,
 * device and translation key, so renamed entities and other integrations' look-alikes
 * cannot leak in. Each card is scoped to one device, which is one forecast town.
 */
import { DOMAIN, type EntityKey } from "../const";
import type { HassEntity, HomeAssistant } from "../types";

interface RegistryIndex {
  /** Integration devices, in `hass.devices` order. */
  devices: string[];
  /** device_id -> translation_key -> entity_ids (forecast keys have one per day) */
  byKey: Map<string, Map<string, string[]>>;
  /** device_id -> weather entity_id */
  weather: Map<string, string>;
}

const registryCache = new WeakMap<object, RegistryIndex>();

function registryIndex(hass: HomeAssistant): RegistryIndex {
  const cacheKey = hass.entities;
  const cached = registryCache.get(cacheKey);
  if (cached) return cached;

  const byKey = new Map<string, Map<string, string[]>>();
  const weather = new Map<string, string>();
  for (const entry of Object.values(hass.entities ?? {})) {
    if (entry.platform !== DOMAIN || !entry.device_id) continue;
    if (entry.entity_id.startsWith("weather.")) {
      weather.set(entry.device_id, entry.entity_id);
      continue;
    }
    if (!entry.translation_key) continue;
    let keys = byKey.get(entry.device_id);
    if (!keys) byKey.set(entry.device_id, (keys = new Map()));
    const ids = keys.get(entry.translation_key) ?? [];
    ids.push(entry.entity_id);
    keys.set(entry.translation_key, ids);
  }
  const owners = new Set([...byKey.keys(), ...weather.keys()]);
  const ordered = Object.keys(hass.devices ?? {}).filter((id) => owners.has(id));
  for (const id of owners) if (!ordered.includes(id)) ordered.push(id);

  const index = { devices: ordered, byKey, weather };
  registryCache.set(cacheKey, index);
  return index;
}

/** Devices that belong to this integration (one per forecast town). */
export function integrationDevices(hass: HomeAssistant): string[] {
  return registryIndex(hass).devices;
}

/** The configured device, or the first integration device when none is configured. */
export function resolveDevice(hass: HomeAssistant, configured?: string): string | undefined {
  if (configured) return configured;
  return integrationDevices(hass)[0];
}

export function isIntegrationDevice(hass: HomeAssistant, deviceId: string | undefined): boolean {
  return !!deviceId && integrationDevices(hass).includes(deviceId);
}

export function deviceName(hass: HomeAssistant, deviceId: string | undefined): string | undefined {
  if (!deviceId) return undefined;
  const device = hass.devices?.[deviceId];
  return device?.name_by_user || device?.name || undefined;
}

/** The town's weather entity. */
export function weatherEntityId(hass: HomeAssistant, deviceId: string | undefined): string | undefined {
  return deviceId ? registryIndex(hass).weather.get(deviceId) : undefined;
}

/** All entity IDs of the device with this translation key. */
export function entityIdsFor(hass: HomeAssistant, deviceId: string | undefined, key: EntityKey): string[] {
  if (!deviceId) return [];
  return registryIndex(hass).byKey.get(deviceId)?.get(key) ?? [];
}

/** The device's single entity with this translation key. */
export function entityIdFor(hass: HomeAssistant, deviceId: string | undefined, key: EntityKey): string | undefined {
  return entityIdsFor(hass, deviceId, key)[0];
}

export function stateFor(hass: HomeAssistant, deviceId: string | undefined, key: EntityKey): HassEntity | undefined {
  const id = entityIdFor(hass, deviceId, key);
  return id ? hass.states[id] : undefined;
}

/**
 * Forecast sensor states for one key, keyed by their `date` attribute (YYYY-MM-DD).
 * Disabled day sensors have no state and are skipped.
 */
export function forecastStatesByDate(
  hass: HomeAssistant,
  deviceId: string | undefined,
  key: EntityKey,
): Map<string, HassEntity> {
  const byDate = new Map<string, HassEntity>();
  for (const id of entityIdsFor(hass, deviceId, key)) {
    const stateObj = hass.states[id];
    const date = stateObj?.attributes.date;
    if (stateObj && typeof date === "string") byDate.set(date, stateObj);
  }
  return byDate;
}

/** Today's forecast sensor for a key: the one with the earliest date. */
export function todayState(hass: HomeAssistant, deviceId: string | undefined, key: EntityKey): HassEntity | undefined {
  const byDate = forecastStatesByDate(hass, deviceId, key);
  const first = [...byDate.keys()].sort()[0];
  return first ? byDate.get(first) : undefined;
}
