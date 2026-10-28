/**
 * `custom:bom-australia-forecast-card`: the 7-day and hourly forecast.
 *
 * Forecast values come live from the weather entity (`weather/subscribe_forecast`).
 * Days are enriched with the BoM summary, rain range and forecast text from the
 * per-day forecast sensors, matched on their `date` attribute.
 */
import { css, html, nothing, type TemplateResult } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import { KEY, type EntityKey } from "../const";
import { forecastStatesByDate } from "../ha/entities";
import { ForecastController, type ForecastType } from "../ha/forecast";
import { formatAttribute, formatDateTime, isUnavailable, language, numberAttr, timeZone } from "../ha/format";
import { t, type TranslationKey } from "../localize/localize";
import { alert, header } from "../components/render";
import { conditionIcon, rangeBar } from "../model/weather";
import { cardStyles } from "../styles";
import type { BaseCardConfig, ForecastEntry, HassEntity, HomeAssistant, LovelaceConfigForm } from "../types";
import {
  BomCard,
  assertBoolean,
  assertChoice,
  assertPositiveInt,
  baseSchema,
  computeHelper,
  computeLabel,
  stubConfig,
} from "./base";

export interface ForecastCardConfig extends BaseCardConfig {
  forecast_type?: ForecastType;
  days?: number;
  hours?: number;
  show_text?: boolean;
}

const FORECAST_TYPES = ["daily", "hourly"] as const;
const DEFAULT_DAYS = 7;
const DEFAULT_HOURS = 24;

export class ForecastCard extends BomCard<ForecastCardConfig> {
  static override properties = { ...BomCard.properties, _type: { state: true } };

  static override styles = [
    cardStyles,
    css`
      .toggle {
        display: flex;
        gap: var(--ha-space-2);
        padding: 0 var(--ha-space-4);
      }
      .days {
        display: flex;
        flex-direction: column;
      }
      .day {
        display: grid;
        grid-template-columns: minmax(4.5rem, auto) var(--ha-space-8) minmax(0, 1fr) auto;
        align-items: center;
        gap: var(--ha-space-1) var(--ha-space-3);
        padding: var(--ha-space-2) 0;
        border-top: var(--ha-border-width-sm) solid var(--divider-color);
      }
      .day:first-child {
        border-top: none;
      }
      .day .name {
        font-weight: var(--ha-font-weight-medium);
      }
      .day ha-icon {
        color: var(--state-icon-color);
      }
      .day .middle {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .day .rain {
        display: inline-flex;
        align-items: center;
        gap: var(--ha-space-1);
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s);
      }
      .day .rain ha-icon {
        --mdc-icon-size: var(--ha-space-4);
        color: var(--blue-color);
      }
      .temps {
        display: grid;
        grid-template-columns: 2.5rem 5rem 2.5rem;
        align-items: center;
        gap: var(--ha-space-2);
        font-variant-numeric: tabular-nums;
      }
      .temps .low {
        color: var(--secondary-text-color);
        text-align: end;
      }
      .temps .high {
        font-weight: var(--ha-font-weight-medium);
      }
      .bar {
        position: relative;
        height: var(--ha-space-1);
        border-radius: var(--ha-border-radius-pill);
        background: var(--divider-color);
      }
      .bar span {
        position: absolute;
        top: 0;
        bottom: 0;
        border-radius: var(--ha-border-radius-pill);
        background: linear-gradient(to right, var(--blue-color), var(--amber-color), var(--red-color));
      }
      details.text {
        grid-column: 1 / -1;
        font-size: var(--ha-font-size-s);
        color: var(--secondary-text-color);
      }
      details.text summary {
        cursor: pointer;
        width: fit-content;
      }
      details.text summary:focus-visible {
        outline: var(--ha-border-width-md) solid var(--ha-color-focus, var(--primary-color));
      }
      details.text p {
        margin: var(--ha-space-1) 0 0;
        color: var(--primary-text-color);
        line-height: var(--ha-line-height-normal);
      }
      .hours {
        display: flex;
        gap: var(--ha-space-2);
        overflow-x: auto;
        padding-bottom: var(--ha-space-2);
        scroll-snap-type: x proximity;
      }
      .hour {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--ha-space-1);
        min-width: 3.5rem;
        scroll-snap-align: start;
        font-variant-numeric: tabular-nums;
      }
      .hour .time {
        color: var(--secondary-text-color);
        font-size: var(--ha-font-size-s);
      }
      .hour ha-icon {
        color: var(--state-icon-color);
      }
      .hour .rain {
        color: var(--blue-color);
        font-size: var(--ha-font-size-s);
      }
      @container (max-width: 360px) {
        .day {
          grid-template-columns: minmax(3.5rem, auto) var(--ha-space-8) minmax(0, 1fr);
        }
        .temps {
          grid-column: 2 / -1;
          grid-template-columns: 2.5rem 1fr 2.5rem;
        }
      }
    `,
  ];

  declare private _type?: ForecastType;
  protected readonly titleKey = "title.forecast";
  protected override readonly usesWeather = true;
  private readonly forecasts = new ForecastController(this);

  protected override entityKeys(): readonly EntityKey[] {
    return [KEY.shortText, KEY.extendedText, KEY.rainAmountRange];
  }

  static override validateConfig(config: ForecastCardConfig): void {
    super.validateConfig(config);
    const raw = config as unknown as Record<string, unknown>;
    assertChoice(raw, "forecast_type", FORECAST_TYPES);
    assertPositiveInt(raw, "days", 1, 7);
    assertPositiveInt(raw, "hours", 1, 72);
    assertBoolean(raw, "show_text");
  }

  static getConfigForm(): LovelaceConfigForm {
    return {
      schema: [
        ...baseSchema(),
        {
          name: "forecast_type",
          default: "daily",
          selector: {
            select: {
              mode: "dropdown",
              options: FORECAST_TYPES.map((value) => ({
                value,
                label: t(undefined, `editor.forecast_type.${value}` as TranslationKey),
              })),
            },
          },
        },
        { name: "days", default: DEFAULT_DAYS, selector: { number: { min: 1, max: 7, mode: "box" } } },
        { name: "hours", default: DEFAULT_HOURS, selector: { number: { min: 1, max: 72, mode: "box" } } },
        { name: "show_text", default: true, selector: { boolean: {} } },
      ],
      computeLabel,
      computeHelper,
      assertConfig: (c) => this.validateConfig(c as ForecastCardConfig),
    };
  }

  static getStubConfig(hass?: HomeAssistant): Record<string, unknown> {
    return stubConfig(hass);
  }

  override getCardSize(): number {
    return this.type === "hourly" ? 3 : 7;
  }

  private get type(): ForecastType {
    return this._type ?? this._config?.forecast_type ?? "daily";
  }

  protected override updated(): void {
    this.forecasts.update(this.hass, this.weatherId, this.type);
  }

  private select(type: ForecastType): void {
    this._type = type;
  }

  protected renderBody(hass: HomeAssistant, config: ForecastCardConfig): TemplateResult {
    const weather = this.weather;
    const forecast = this.forecasts.forecast;
    let body: TemplateResult;
    if (isUnavailable(weather) || (this.forecasts.failed && !forecast)) {
      body = alert("warning", t(hass, "state.forecast_unavailable"));
    } else if (!forecast) {
      body = html`<span class="secondary" aria-busy="true">…</span>`;
    } else if (this.type === "hourly") {
      body = this.renderHours(hass, weather!, forecast.slice(0, config.hours ?? DEFAULT_HOURS));
    } else {
      body = this.renderDays(hass, weather!, forecast.slice(0, config.days ?? DEFAULT_DAYS), config);
    }
    return html`
      ${header({ title: this.cardTitle(), icon: "mdi:calendar-week", subtitle: this.townName })}
      <div class="toggle" role="group" aria-label=${this.cardTitle()}>
        <ha-chip-set>
          ${FORECAST_TYPES.map(
            (type) => html`<ha-filter-chip
              .label=${t(hass, `forecast.${type}` as TranslationKey)}
              .selected=${this.type === type}
              @click=${() => this.select(type)}
            ></ha-filter-chip>`,
          )}
        </ha-chip-set>
      </div>
      <div class="content">${body}</div>
    `;
  }

  private renderDays(
    hass: HomeAssistant,
    weather: HassEntity,
    days: ForecastEntry[],
    config: ForecastCardConfig,
  ): TemplateResult {
    const summaries = forecastStatesByDate(hass, this.deviceId, KEY.shortText);
    const texts = forecastStatesByDate(hass, this.deviceId, KEY.extendedText);
    const amounts = forecastStatesByDate(hass, this.deviceId, KEY.rainAmountRange);
    const temps = days.flatMap((day) => [numberAttr(day.templow), numberAttr(day.temperature)]);
    const known = temps.filter((value): value is number => value !== undefined);
    const scaleMin = Math.min(...known);
    const scaleMax = Math.max(...known);

    return html`<div class="days" role="list">
      ${days.map((day, index) => {
        const date = day.datetime.slice(0, 10);
        const summary = usable(summaries.get(date));
        const text = usable(texts.get(date));
        const rangeState = usable(amounts.get(date));
        // "0 mm" adds nothing next to the chance of rain.
        const amount = rangeState?.state !== "0 mm" ? rangeState : undefined;
        const high = numberAttr(day.temperature);
        const low = numberAttr(day.templow);
        const chance = numberAttr(day.precipitation_probability);
        // Today's minimum is dropped by BoM after the morning: show the maximum only.
        const bar = low !== undefined ? rangeBar(low, high, scaleMin, scaleMax) : undefined;
        const name = index === 0 ? t(hass, "forecast.today") : this.weekday(hass, day.datetime);
        const conditionLabel = day.condition ? t(hass, `condition.${day.condition}` as TranslationKey) : "";
        const fullText = text ? String(text.attributes.text ?? text.state) : undefined;
        return html`<div class="day" role="listitem">
          <span class="name">${name}</span>
          <ha-icon .icon=${conditionIcon(day.condition)} .label=${conditionLabel} aria-hidden="true"></ha-icon>
          <span class="middle">
            <span>${summary?.state ?? conditionLabel}</span>
            ${
              chance !== undefined
                ? html`<span class="rain"
                    ><ha-icon icon="mdi:umbrella-outline" aria-hidden="true"></ha-icon
                    >${t(hass, "forecast.rain_chance", { value: `${chance}%` })}${amount ? html`, ${amount.state}` : nothing}</span
                  >`
                : nothing
            }
          </span>
          <span
            class="temps"
            aria-label=${t(hass, "forecast.range", {
              low: low !== undefined ? formatAttribute(hass, weather, "temperature", low) : "–",
              high: high !== undefined ? formatAttribute(hass, weather, "temperature", high) : "–",
            })}
          >
            <span class="low" aria-hidden="true">${low !== undefined ? `${Math.round(low)}°` : ""}</span>
            ${
              bar
                ? html`<span class="bar" aria-hidden="true"
                    ><span style=${styleMap({ insetInlineStart: `${bar.start}%`, width: `${bar.width}%` })}></span
                  ></span>`
                : html`<span aria-hidden="true"></span>`
            }
            <span class="high" aria-hidden="true">${high !== undefined ? `${Math.round(high)}°` : ""}</span>
          </span>
          ${
            config.show_text !== false && fullText
              ? html`<details class="text">
                  <summary>${t(hass, "forecast.details")}</summary>
                  <p>${fullText}</p>
                </details>`
              : nothing
          }
        </div>`;
      })}
    </div>`;
  }

  private renderHours(hass: HomeAssistant, weather: HassEntity, hours: ForecastEntry[]): TemplateResult {
    return html`<div class="hours" role="list" tabindex="0" aria-label=${t(hass, "forecast.hourly")}>
      ${hours.map((hour) => {
        const temperature = numberAttr(hour.temperature);
        const chance = numberAttr(hour.precipitation_probability);
        const conditionLabel = hour.condition ? t(hass, `condition.${hour.condition}` as TranslationKey) : "";
        const time = formatDateTime(hass, hour.datetime, { hour: "numeric" }) ?? "";
        return html`<div
          class="hour"
          role="listitem"
          aria-label=${[time, conditionLabel, temperature !== undefined ? formatAttribute(hass, weather, "temperature", temperature) : ""]
            .filter(Boolean)
            .join(", ")}
        >
          <span class="time" aria-hidden="true">${time}</span>
          <ha-icon .icon=${conditionIcon(hour.condition, hour.is_daytime)} aria-hidden="true"></ha-icon>
          <span aria-hidden="true">${temperature !== undefined ? `${Math.round(temperature)}°` : "–"}</span>
          <span class="rain" aria-hidden="true">${chance ? `${chance}%` : ""}</span>
        </div>`;
      })}
    </div>`;
  }

  private weekday(hass: HomeAssistant, datetime: string): string {
    try {
      return new Intl.DateTimeFormat(language(hass), {
        weekday: "short",
        day: "numeric",
        timeZone: timeZone(hass) ?? hass.config?.time_zone,
      }).format(new Date(datetime));
    } catch {
      return datetime.slice(0, 10);
    }
  }
}

function usable(stateObj: HassEntity | undefined): HassEntity | undefined {
  return stateObj && !isUnavailable(stateObj) ? stateObj : undefined;
}
