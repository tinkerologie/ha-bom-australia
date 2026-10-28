/**
 * `custom:bom-australia-now-card`: current conditions with today's forecast.
 *
 * Current values come from the weather entity (the station observation), today's
 * summary, rain, UV and fire danger from the day-0 forecast sensors, and today's
 * max/min from the daily forecast, so the card works with any forecast-days option.
 */
import { css, html, nothing, type TemplateResult } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import { KEY, type EntityKey } from "../const";
import { stateFor, todayState } from "../ha/entities";
import { ForecastController } from "../ha/forecast";
import { formatAttribute, formatState, isUnavailable, numberAttr, relativeTime, stringAttr } from "../ha/format";
import { t, tCount, type TranslationKey } from "../localize/localize";
import { alert, badge, bubble } from "../components/render";
import { toneColor, type Tone } from "../model/tone";
import { conditionIcon, conditionTone, fireDangerTone, uvCategory, uvTone } from "../model/weather";
import { cardStyles } from "../styles";
import type { BaseCardConfig, HassEntity, HomeAssistant, LovelaceConfigForm } from "../types";
import { BomCard, baseSchema, computeHelper, computeLabel, stubConfig } from "./base";

interface Stat {
  icon: string;
  label: string;
  value: string;
  tone: Tone;
  entityId?: string;
}

export class NowCard extends BomCard<BaseCardConfig> {
  static override styles = [
    cardStyles,
    css`
      .hero {
        display: flex;
        align-items: center;
        gap: var(--ha-space-4);
        padding: var(--ha-space-4) var(--ha-space-4) var(--ha-space-2);
        background: none;
        border: none;
        color: inherit;
        font: inherit;
        text-align: start;
        cursor: pointer;
        border-radius: var(--ha-border-radius-lg);
      }
      .hero:focus-visible {
        outline: var(--ha-border-width-md) solid var(--ha-color-focus, var(--primary-color));
      }
      .hero .bubble.large {
        --mdc-icon-size: var(--ha-space-10);
        width: var(--ha-space-16);
        height: var(--ha-space-16);
      }
      .hero-text {
        display: flex;
        flex-direction: column;
        min-width: 0;
        gap: var(--ha-space-1);
      }
      .temperature {
        font-size: var(--ha-font-size-4xl);
        font-weight: var(--ha-font-weight-normal);
        line-height: var(--ha-line-height-condensed);
        font-variant-numeric: tabular-nums;
      }
      .condition {
        font-size: var(--ha-font-size-l);
        font-weight: var(--ha-font-weight-medium);
      }
      .today {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--ha-space-1) var(--ha-space-3);
      }
      .summary {
        font-size: var(--ha-font-size-m);
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--ha-space-2);
      }
      .stat {
        display: flex;
        align-items: center;
        gap: var(--ha-space-2);
        min-width: 0;
        padding: var(--ha-space-2);
        border: var(--ha-border-width-sm) solid var(--divider-color);
        border-radius: var(--ha-border-radius-md);
        background: none;
        color: inherit;
        font: inherit;
        text-align: start;
      }
      button.stat {
        cursor: pointer;
      }
      button.stat:focus-visible {
        outline: var(--ha-border-width-md) solid var(--ha-color-focus, var(--primary-color));
      }
      .stat ha-icon {
        color: var(--tone);
        flex: none;
      }
      .stat .text {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .stat .label {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s);
      }
      .stat .value {
        font-weight: var(--ha-font-weight-medium);
        overflow-wrap: anywhere;
      }
      .badges {
        display: flex;
        flex-wrap: wrap;
        gap: var(--ha-space-2);
      }
      .badges button {
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        color: inherit;
        cursor: pointer;
        border-radius: var(--ha-border-radius-pill);
      }
      .badges button:focus-visible {
        outline: var(--ha-border-width-md) solid var(--ha-color-focus, var(--primary-color));
      }
      @container (min-width: 600px) {
        .stats {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
      @container (max-width: 320px) {
        .temperature {
          font-size: var(--ha-font-size-3xl);
        }
      }
    `,
  ];

  protected readonly titleKey = "title.now";
  protected override readonly usesWeather = true;
  private readonly daily = new ForecastController(this);

  protected override entityKeys(): readonly EntityKey[] {
    return [
      KEY.shortText,
      KEY.rainChance,
      KEY.rainAmountRange,
      KEY.uvIndex,
      KEY.uvCategory,
      KEY.fireDanger,
      KEY.windDirection,
      KEY.windGust,
      KEY.observedAt,
      KEY.warnings,
    ];
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

  protected override updated(): void {
    this.daily.update(this.hass, this.weatherId, "daily");
  }

  protected renderBody(hass: HomeAssistant): TemplateResult {
    const weather = this.weather;
    if (isUnavailable(weather)) {
      return html`<div class="content">${alert("warning", t(hass, "state.unavailable"))}</div>`;
    }
    return html`
      ${this.renderHero(hass, weather!)}
      <div class="content">
        ${this.renderToday(hass)} ${this.renderStats(hass, weather!)} ${this.renderBadges(hass)}
      </div>
    `;
  }

  private renderHero(hass: HomeAssistant, weather: HassEntity): TemplateResult {
    const condition = weather.state;
    const label = t(hass, `condition.${condition}` as TranslationKey);
    const temperature = formatAttribute(hass, weather, "temperature");
    const apparent = weather.attributes.apparent_temperature;
    const observed = stateFor(hass, this.deviceId, KEY.observedAt);
    const station = stringAttr(observed?.attributes.station_name);
    const time = observed && !isUnavailable(observed) ? relativeTime(hass, observed.state) : undefined;
    return html`<button
      class="hero"
      aria-label=${`${this.townName ?? ""} ${temperature} ${label}`}
      @click=${() => this.moreInfo(this.weatherId)}
    >
      ${bubble(conditionIcon(condition), conditionTone(condition), true)}
      <span class="hero-text">
        <span class="temperature">${temperature}</span>
        <span class="condition">${label}</span>
        ${
          apparent !== undefined && apparent !== null
            ? html`<span class="secondary"
                >${t(hass, "now.feels_like", { value: formatAttribute(hass, weather, "apparent_temperature") })}</span
              >`
            : nothing
        }
        ${
          station
            ? html`<span class="secondary">${time ? t(hass, "now.station", { station, time }) : station}</span>`
            : nothing
        }
      </span>
    </button>`;
  }

  private renderToday(hass: HomeAssistant): TemplateResult | typeof nothing {
    const summary = todayState(hass, this.deviceId, KEY.shortText);
    const today = this.daily.forecast?.[0];
    const weather = this.weather!;
    const max = numberAttr(today?.temperature);
    const min = numberAttr(today?.templow);
    const parts = [
      max !== undefined ? t(hass, "now.max", { value: formatAttribute(hass, weather, "temperature", max) }) : undefined,
      min !== undefined ? t(hass, "now.min", { value: formatAttribute(hass, weather, "temperature", min) }) : undefined,
    ].filter(Boolean);
    const text = summary && !isUnavailable(summary) ? summary.state : undefined;
    if (!text && parts.length === 0) return nothing;
    return html`<div class="today">
      ${text ? html`<span class="summary">${text}</span>` : nothing}
      ${parts.length ? html`<span class="secondary">${parts.join(" · ")}</span>` : nothing}
    </div>`;
  }

  private renderStats(hass: HomeAssistant, weather: HassEntity): TemplateResult {
    const stats: Stat[] = [];
    const device = this.deviceId;

    const chance = todayState(hass, device, KEY.rainChance);
    const amount = todayState(hass, device, KEY.rainAmountRange);
    if (chance && !isUnavailable(chance)) {
      const value = [t(hass, "now.rain_value", { chance: formatState(hass, chance) })];
      if (amount && !isUnavailable(amount) && amount.state !== "0 mm") value.unshift(amount.state);
      stats.push({ icon: "mdi:umbrella-outline", label: t(hass, "now.rain"), value: value.join(", "), tone: "blue", entityId: chance.entity_id });
    }

    const uv = todayState(hass, device, KEY.uvIndex);
    const uvIndex = uv && !isUnavailable(uv) ? numberAttr(uv.state) : numberAttr(weather.attributes.uv_index);
    if (uvIndex !== undefined) {
      const category = uvCategory(uvIndex);
      const categoryLabel = category ? t(hass, `uv.${category}` as TranslationKey) : "";
      stats.push({
        icon: "mdi:sun-wireless-outline",
        label: t(hass, "now.uv"),
        value: `${Math.round(uvIndex)} ${categoryLabel}`.trim(),
        tone: uvTone(category),
        entityId: uv?.entity_id,
      });
    }

    const speed = weather.attributes.wind_speed;
    if (speed !== undefined && speed !== null) {
      const direction = stateFor(hass, device, KEY.windDirection);
      const gust = weather.attributes.wind_gust_speed;
      const value = [
        direction && !isUnavailable(direction) ? direction.state : undefined,
        formatAttribute(hass, weather, "wind_speed"),
      ]
        .filter(Boolean)
        .join(" ");
      const gustText =
        gust !== undefined && gust !== null
          ? `, ${t(hass, "now.gusting", { value: formatAttribute(hass, weather, "wind_gust_speed") })}`
          : "";
      stats.push({ icon: "mdi:weather-windy", label: t(hass, "now.wind"), value: value + gustText, tone: "grey", entityId: direction?.entity_id });
    }

    if (weather.attributes.humidity !== undefined && weather.attributes.humidity !== null) {
      stats.push({ icon: "mdi:water-percent", label: t(hass, "now.humidity"), value: formatAttribute(hass, weather, "humidity"), tone: "blue" });
    }

    return html`<div class="stats">${stats.map((stat) => this.renderStat(stat))}</div>`;
  }

  private renderStat(stat: Stat): TemplateResult {
    const body = html`<ha-icon .icon=${stat.icon} aria-hidden="true"></ha-icon>
      <span class="text"><span class="label">${stat.label}</span><span class="value">${stat.value}</span></span>`;
    const style = styleMap({ "--tone": toneColor(stat.tone) });
    return stat.entityId
      ? html`<button class="stat" style=${style} @click=${() => this.moreInfo(stat.entityId)}>${body}</button>`
      : html`<div class="stat" style=${style}>${body}</div>`;
  }

  private renderBadges(hass: HomeAssistant): TemplateResult | typeof nothing {
    const items: TemplateResult[] = [];
    const fire = todayState(hass, this.deviceId, KEY.fireDanger);
    if (fire && !isUnavailable(fire)) {
      items.push(
        html`<button @click=${() => this.moreInfo(fire.entity_id)}>
          ${badge(`${t(hass, "now.fire_danger")}: ${fire.state}`, fireDangerTone(fire.state), "mdi:fire")}
        </button>`,
      );
    }
    const warnings = stateFor(hass, this.deviceId, KEY.warnings);
    const count = warnings ? numberAttr(warnings.state) : undefined;
    if (warnings && count) {
      items.push(
        html`<button @click=${() => this.moreInfo(warnings.entity_id)}>
          ${badge(tCount(hass, "now.warnings", count), "red", "mdi:alert")}
        </button>`,
      );
    }
    return items.length ? html`<div class="badges">${items}</div>` : nothing;
  }
}
