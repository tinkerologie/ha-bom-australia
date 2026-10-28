/**
 * `custom:bom-australia-warnings-card`: current BoM warnings for the town.
 *
 * The count is the warnings sensor's state; the items come from its `warnings`
 * attribute, each with its full text in an expandable section.
 */
import { css, html, nothing, type TemplateResult } from "lit";
import { KEY, type EntityKey } from "../const";
import { stateFor } from "../ha/entities";
import { formatDateTime, isUnavailable, listAttr, numberAttr, relativeTime, stringAttr } from "../ha/format";
import { t, tCount, type TranslationKey } from "../localize/localize";
import { alert, badge, bubble, empty, header, showAll } from "../components/render";
import { warningIcon, warningTone } from "../model/weather";
import { cardStyles } from "../styles";
import type { BaseCardConfig, HomeAssistant, LovelaceConfigForm } from "../types";
import { BomCard, assertPositiveInt, baseSchema, computeHelper, computeLabel, stubConfig } from "./base";

export interface WarningsCardConfig extends BaseCardConfig {
  max_items?: number;
}

interface Warning {
  id?: string;
  type?: string;
  title?: string;
  short_title?: string;
  phase?: string;
  group_type?: string;
  issued?: string;
  expires?: string;
  message?: string;
}

const DEFAULT_MAX_ITEMS = 5;
const PHASES = new Set(["new", "update", "renewal", "upgrade", "downgrade", "final"]);

export class WarningsCard extends BomCard<WarningsCardConfig> {
  static override properties = { ...BomCard.properties, _expanded: { state: true } };

  static override styles = [
    cardStyles,
    css`
      .warnings {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-3);
      }
      .warning {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: var(--ha-space-1) var(--ha-space-3);
        padding-top: var(--ha-space-3);
        border-top: var(--ha-border-width-sm) solid var(--divider-color);
      }
      .warning:first-child {
        padding-top: 0;
        border-top: none;
      }
      .warning .body {
        display: flex;
        flex-direction: column;
        gap: var(--ha-space-1);
        min-width: 0;
      }
      .warning .title {
        margin: 0;
        font-size: var(--ha-font-size-m);
        font-weight: var(--ha-font-weight-medium);
        line-height: var(--ha-line-height-normal);
      }
      .warning .badges {
        display: flex;
        flex-wrap: wrap;
        gap: var(--ha-space-1);
      }
      details summary {
        cursor: pointer;
        width: fit-content;
        color: var(--primary-color);
        font-size: var(--ha-font-size-s);
      }
      details summary:focus-visible {
        outline: var(--ha-border-width-md) solid var(--ha-color-focus, var(--primary-color));
      }
      details .message {
        margin: var(--ha-space-2) 0 0;
        white-space: pre-line;
        font-size: var(--ha-font-size-s);
        line-height: var(--ha-line-height-normal);
        max-height: 24rem;
        overflow-y: auto;
      }
    `,
  ];

  declare private _expanded: boolean;
  protected readonly titleKey = "title.warnings";

  constructor() {
    super();
    this._expanded = false;
  }

  protected override entityKeys(): readonly EntityKey[] {
    return [KEY.warnings];
  }

  static override validateConfig(config: WarningsCardConfig): void {
    super.validateConfig(config);
    assertPositiveInt(config as unknown as Record<string, unknown>, "max_items", 1, 50);
  }

  static getConfigForm(): LovelaceConfigForm {
    return {
      schema: [
        ...baseSchema(),
        { name: "max_items", default: DEFAULT_MAX_ITEMS, selector: { number: { min: 1, max: 50, mode: "box" } } },
      ],
      computeLabel,
      computeHelper,
      assertConfig: (c) => this.validateConfig(c as WarningsCardConfig),
    };
  }

  static getStubConfig(hass?: HomeAssistant): Record<string, unknown> {
    return stubConfig(hass);
  }

  override getCardSize(): number {
    return 4;
  }

  protected renderBody(hass: HomeAssistant, config: WarningsCardConfig): TemplateResult {
    const sensor = stateFor(hass, this.deviceId, KEY.warnings);
    const count = numberAttr(sensor?.state) ?? 0;
    const warnings = listAttr<Warning>(sensor?.attributes.warnings);
    const max = config.max_items ?? DEFAULT_MAX_ITEMS;
    const shown = this._expanded ? warnings : warnings.slice(0, max);

    let body: TemplateResult;
    if (isUnavailable(sensor)) {
      body = alert("warning", t(hass, "state.unavailable"));
    } else if (warnings.length === 0) {
      body = empty("mdi:check-circle-outline", t(hass, "warnings.none", { location: this.townName ?? "" }));
    } else {
      body = html`<div class="warnings" role="list">${shown.map((warning) => this.renderWarning(hass, warning))}</div>
        ${warnings.length > max ? showAll(hass, this._expanded, warnings.length, () => (this._expanded = !this._expanded)) : nothing}`;
    }

    return html`
      ${header({
        title: this.cardTitle(),
        icon: count ? "mdi:alert" : "mdi:alert-outline",
        count: count ? tCount(hass, "warnings.count", count) : undefined,
        subtitle: this.townName,
        detailsLabel: this.cardTitle(),
        onDetails: sensor ? () => this.moreInfo(sensor.entity_id) : undefined,
      })}
      <div class="content">${body}</div>
    `;
  }

  private renderWarning(hass: HomeAssistant, warning: Warning): TemplateResult {
    const title = stringAttr(warning.title) ?? stringAttr(warning.short_title) ?? "";
    const tone = warningTone(warning.group_type);
    const phase = stringAttr(warning.phase);
    const times = [
      warning.issued ? t(hass, "warnings.issued", { time: relativeTime(hass, warning.issued) ?? "" }) : undefined,
      warning.expires ? t(hass, "warnings.expires", { time: formatDateTime(hass, warning.expires) ?? "" }) : undefined,
    ].filter(Boolean);
    const message = stringAttr(warning.message);
    return html`<div class="warning" role="listitem">
      ${bubble(warningIcon(warning.type), tone)}
      <div class="body">
        <h3 class="title">${title}</h3>
        <div class="badges">
          ${warning.short_title && warning.short_title !== title ? badge(warning.short_title, tone, "mdi:alert") : nothing}
          ${phase && PHASES.has(phase) ? badge(t(hass, `warnings.phase.${phase}` as TranslationKey), "grey") : nothing}
        </div>
        ${times.length ? html`<span class="secondary">${times.join(" · ")}</span>` : nothing}
        ${
          message
            ? html`<details>
                <summary>${t(hass, "warnings.show_message")}</summary>
                <p class="message">${message}</p>
              </details>`
            : nothing
        }
      </div>
    </div>`;
  }
}
