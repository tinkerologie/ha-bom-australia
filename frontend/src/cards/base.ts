/**
 * Base class for every BoM card.
 *
 * - One forecast town per card: the `device` option (device selector filtered to the
 *   integration) picks it, defaulting to the first one.
 * - `shouldUpdate` re-renders only when the card's own entities change.
 * - Sections view sizing (`getGridOptions`), masonry sizing (`getCardSize`) and an
 *   `embedded` mode used by the all-in-one card (no `ha-card` frame).
 */
import { html, LitElement, nothing, type PropertyValues, type TemplateResult } from "lit";
import { DOMAIN, type EntityKey } from "../const";
import { openMoreInfo } from "../ha/actions";
import {
  deviceName,
  entityIdsFor,
  integrationDevices,
  isIntegrationDevice,
  resolveDevice,
  weatherEntityId,
} from "../ha/entities";
import { preloadHaElements } from "../ha/preload";
import { t, type TranslationKey } from "../localize/localize";
import { alert } from "../components/render";
import { cardStyles } from "../styles";
import type { BaseCardConfig, HaFormSchema, HassEntity, HomeAssistant, LovelaceGridOptions } from "../types";

export abstract class BomCard<C extends BaseCardConfig = BaseCardConfig> extends LitElement {
  static override properties = {
    hass: { attribute: false },
    embedded: { type: Boolean, reflect: true },
    _config: { state: true },
  };

  static override styles = [cardStyles];

  declare hass?: HomeAssistant;
  declare embedded: boolean;
  protected declare _config?: C;

  constructor() {
    super();
    this.embedded = false;
  }

  /** Translation key of the default card title. */
  protected abstract readonly titleKey: TranslationKey;

  /** Registry entities (by translation key) this card renders from. */
  protected entityKeys(): readonly EntityKey[] {
    return [];
  }

  /** Whether the card renders the town's weather entity. */
  protected readonly usesWeather: boolean = false;

  /** Card body (inside `ha-card`, or a section in embedded mode). */
  protected abstract renderBody(hass: HomeAssistant, config: C): TemplateResult;

  /** Validate a card configuration; throw to make HA show its error card / YAML editor. */
  static validateConfig(config: BaseCardConfig): void {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    if (config.device !== undefined && typeof config.device !== "string") {
      throw new Error("'device' must be a device ID");
    }
    if (config.title !== undefined && typeof config.title !== "string") {
      throw new Error("'title' must be text");
    }
  }

  setConfig(config: C): void {
    (this.constructor as typeof BomCard).validateConfig(config);
    this._config = { ...config };
  }

  get config(): C | undefined {
    return this._config;
  }

  protected get deviceId(): string | undefined {
    return this.hass ? resolveDevice(this.hass, this._config?.device) : undefined;
  }

  /** The forecast town's name, as the user named the device. */
  protected get townName(): string | undefined {
    return this.hass ? deviceName(this.hass, this.deviceId) : undefined;
  }

  protected get weatherId(): string | undefined {
    return this.hass ? weatherEntityId(this.hass, this.deviceId) : undefined;
  }

  protected get weather(): HassEntity | undefined {
    const id = this.weatherId;
    return id ? this.hass?.states[id] : undefined;
  }

  protected cardTitle(): string {
    return this._config?.title || t(this.hass, this.titleKey);
  }

  protected moreInfo(entityId: string | undefined): void {
    openMoreInfo(this, entityId);
  }

  /** Entity IDs whose state changes must re-render this card. */
  trackedEntityIds(hass: HomeAssistant): string[] {
    const device = resolveDevice(hass, this._config?.device);
    const ids = this.entityKeys().flatMap((key) => entityIdsFor(hass, device, key));
    if (this.usesWeather) {
      const weather = weatherEntityId(hass, device);
      if (weather) ids.push(weather);
    }
    return ids;
  }

  protected override shouldUpdate(changed: PropertyValues<this>): boolean {
    if (!changed.has("hass") || changed.size > 1) return true;
    const oldHass = changed.get("hass") as HomeAssistant | undefined;
    const hass = this.hass;
    if (!oldHass || !hass) return true;
    if (
      oldHass.entities !== hass.entities ||
      oldHass.devices !== hass.devices ||
      oldHass.locale !== hass.locale ||
      oldHass.themes?.darkMode !== hass.themes?.darkMode
    ) {
      return true;
    }
    const ids = new Set([...this.trackedEntityIds(oldHass), ...this.trackedEntityIds(hass)]);
    for (const id of ids) {
      if (oldHass.states[id] !== hass.states[id]) return true;
    }
    return false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    void preloadHaElements();
  }

  getCardSize(): number {
    return 3;
  }

  getGridOptions(): LovelaceGridOptions {
    return { columns: 12, rows: "auto", min_columns: 6 };
  }

  /** Notice shown instead of the body when there is no town to show. */
  private renderSetupState(hass: HomeAssistant): TemplateResult | undefined {
    if (integrationDevices(hass).length === 0) {
      return html`<div class="content">${alert("info", t(hass, "state.not_set_up"))}</div>`;
    }
    if (this._config?.device && !isIntegrationDevice(hass, this._config.device)) {
      return html`<div class="content">${alert("warning", t(hass, "state.device_missing"))}</div>`;
    }
    return undefined;
  }

  protected override render(): TemplateResult | typeof nothing {
    if (!this._config || !this.hass) return nothing;
    const body = this.renderSetupState(this.hass) ?? this.renderBody(this.hass, this._config);
    if (this.embedded) {
      return html`<section class="embedded" aria-label=${this.cardTitle()}>${body}</section>`;
    }
    return html`<ha-card>${body}</ha-card>`;
  }
}

/** First integration device, for `getStubConfig` (card picker preview). */
export function stubConfig(hass: HomeAssistant | undefined): { device?: string } {
  const device = hass ? integrationDevices(hass)[0] : undefined;
  return device ? { device } : {};
}

/** Editor fields every card has. */
export function baseSchema(): HaFormSchema[] {
  return [
    { name: "device", selector: { device: { filter: { integration: DOMAIN } } } },
    { name: "title", selector: { text: {} } },
  ];
}

const LABELS: Record<string, TranslationKey> = {
  device: "editor.device",
  title: "editor.title",
  forecast_type: "editor.forecast_type",
  days: "editor.days",
  hours: "editor.hours",
  show_text: "editor.show_text",
  max_items: "editor.max_items",
  sections: "editor.sections",
};

const HELPERS: Record<string, TranslationKey> = {
  device: "editor.device_helper",
  title: "editor.title_helper",
  forecast_type: "editor.forecast_type_helper",
  days: "editor.days_helper",
  hours: "editor.hours_helper",
  show_text: "editor.show_text_helper",
  max_items: "editor.max_items_helper",
  sections: "editor.sections_helper",
};

export const computeLabel = (schema: HaFormSchema): string | undefined => {
  const key = LABELS[schema.name];
  return key ? t(undefined, key) : undefined;
};

export const computeHelper = (schema: HaFormSchema): string | undefined => {
  const key = HELPERS[schema.name];
  return key ? t(undefined, key) : undefined;
};

export function assertPositiveInt(config: Record<string, unknown>, name: string, min = 1, max = 1000): void {
  const value = config[name];
  if (value === undefined || value === null) return;
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`'${name}' must be a whole number from ${min} to ${max}`);
  }
}

export function assertBoolean(config: Record<string, unknown>, name: string): void {
  const value = config[name];
  if (value !== undefined && typeof value !== "boolean") throw new Error(`'${name}' must be true or false`);
}

export function assertChoice(config: Record<string, unknown>, name: string, allowed: readonly string[]): void {
  const value = config[name];
  if (value === undefined || value === null) return;
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new Error(`'${name}' must be one of: ${allowed.join(", ")}`);
  }
}

export function assertList(config: Record<string, unknown>, name: string, allowed: readonly string[]): void {
  const value = config[name];
  if (value === undefined || value === null) return;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !allowed.includes(item))) {
    throw new Error(`'${name}' must be a list of: ${allowed.join(", ")}`);
  }
}
