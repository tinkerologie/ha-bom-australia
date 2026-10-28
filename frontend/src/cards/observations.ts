/**
 * `custom:bom-australia-observations-card`: the latest station observation.
 *
 * Core readings come from the weather entity; the rest from the observation sensors,
 * several of which are disabled by default and are simply left out until enabled.
 */
import { css, html, type TemplateResult } from "lit";
import { KEY, type EntityKey } from "../const";
import { stateFor } from "../ha/entities";
import { formatAttribute, formatState, isUnavailable, relativeTime, stringAttr } from "../ha/format";
import { t, type TranslationKey } from "../localize/localize";
import { alert, header } from "../components/render";
import { cardStyles } from "../styles";
import type { BaseCardConfig, HassEntity, HomeAssistant, LovelaceConfigForm } from "../types";
import { BomCard, baseSchema, computeHelper, computeLabel, stubConfig } from "./base";

interface Reading {
  label: TranslationKey;
  icon: string;
  value: string;
  entityId?: string;
}

const WEATHER_READINGS: [TranslationKey, string, string][] = [
  ["observations.temperature", "mdi:thermometer", "temperature"],
  ["observations.feels_like", "mdi:thermometer-lines", "apparent_temperature"],
  ["observations.humidity", "mdi:water-percent", "humidity"],
  ["observations.dew_point", "mdi:thermometer-water", "dew_point"],
  ["observations.pressure", "mdi:gauge", "pressure"],
];

const SENSOR_READINGS: [TranslationKey, string, EntityKey][] = [
  ["observations.gust", "mdi:weather-windy-variant", KEY.windGust],
  ["observations.gust_max", "mdi:weather-windy-variant", KEY.windGustMax],
  ["observations.rain_since_9am", "mdi:weather-pouring", KEY.rainSince9am],
  ["observations.rain_24h", "mdi:weather-pouring", KEY.rain24h],
  ["observations.temp_max", "mdi:thermometer-chevron-up", KEY.observedTempMax],
  ["observations.temp_min", "mdi:thermometer-chevron-down", KEY.observedTempMin],
  ["observations.delta_t", "mdi:thermometer-water", KEY.deltaT],
];

export class ObservationsCard extends BomCard<BaseCardConfig> {
  static override styles = [
    cardStyles,
    css`
      .readings {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(8rem, 1fr));
        gap: var(--ha-space-2);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .reading {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2);
        width: 100%;
        min-width: 0;
        padding: var(--ha-space-2);
        border: var(--ha-border-width-sm) solid var(--divider-color);
        border-radius: var(--ha-border-radius-md);
        background: none;
        color: inherit;
        font: inherit;
        text-align: start;
        cursor: pointer;
      }
      .reading:focus-visible {
        outline: var(--ha-border-width-md) solid var(--ha-color-focus, var(--primary-color));
      }
      .reading ha-icon {
        color: var(--state-icon-color);
        flex: none;
      }
      .reading .text {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .reading .label {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s);
      }
      .reading .value {
        font-weight: var(--ha-font-weight-medium);
        font-variant-numeric: tabular-nums;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `,
  ];

  protected readonly titleKey = "title.observations";
  protected override readonly usesWeather = true;

  protected override entityKeys(): readonly EntityKey[] {
    return [KEY.observedAt, KEY.windDirection, ...SENSOR_READINGS.map(([, , key]) => key)];
  }

  static getConfigForm(): LovelaceConfigForm {
    return { schema: baseSchema(), computeLabel, computeHelper, assertConfig: (c) => this.validateConfig(c) };
  }

  static getStubConfig(hass?: HomeAssistant): Record<string, unknown> {
    return stubConfig(hass);
  }

  override getCardSize(): number {
    return 4;
  }

  protected renderBody(hass: HomeAssistant): TemplateResult {
    const weather = this.weather;
    const observed = stateFor(hass, this.deviceId, KEY.observedAt);
    const station = stringAttr(observed?.attributes.station_name);
    const time = observed && !isUnavailable(observed) ? relativeTime(hass, observed.state) : undefined;
    const subtitle = station ? (time ? t(hass, "observations.station", { station, time }) : station) : this.townName;

    const content = isUnavailable(weather)
      ? alert("warning", t(hass, "state.unavailable"))
      : html`<ul class="readings">
          ${this.readings(hass, weather!).map(
            (reading) => html`<li>
              <button class="reading" @click=${() => this.moreInfo(reading.entityId ?? this.weatherId)}>
                <ha-icon .icon=${reading.icon} aria-hidden="true"></ha-icon>
                <span class="text">
                  <span class="label">${t(hass, reading.label)}</span>
                  <span class="value">${reading.value}</span>
                </span>
              </button>
            </li>`,
          )}
        </ul>`;

    return html`
      ${header({ title: this.cardTitle(), icon: "mdi:weather-cloudy-clock", subtitle })}
      <div class="content">${content}</div>
    `;
  }

  private readings(hass: HomeAssistant, weather: HassEntity): Reading[] {
    const readings: Reading[] = [];
    for (const [label, icon, attribute] of WEATHER_READINGS) {
      const value = weather.attributes[attribute];
      if (value !== undefined && value !== null) {
        readings.push({ label, icon, value: formatAttribute(hass, weather, attribute) });
      }
    }
    const speed = weather.attributes.wind_speed;
    if (speed !== undefined && speed !== null) {
      const direction = stateFor(hass, this.deviceId, KEY.windDirection);
      const prefix = direction && !isUnavailable(direction) ? `${direction.state} ` : "";
      readings.push({
        label: "observations.wind",
        icon: "mdi:weather-windy",
        value: prefix + formatAttribute(hass, weather, "wind_speed"),
        entityId: direction?.entity_id,
      });
    }
    for (const [label, icon, key] of SENSOR_READINGS) {
      const stateObj = stateFor(hass, this.deviceId, key);
      if (stateObj && !isUnavailable(stateObj)) {
        readings.push({ label, icon, value: formatState(hass, stateObj), entityId: stateObj.entity_id });
      }
    }
    return readings;
  }
}
