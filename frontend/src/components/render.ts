/**
 * Shared templates built from native Home Assistant elements (`ha-icon`,
 * `ha-icon-button`, `ha-button`, `ha-alert`). Colour always comes with an icon
 * and text, so meaning is never carried by colour alone.
 */
import { html, nothing, type TemplateResult } from "lit";
import { styleMap } from "lit/directives/style-map.js";
import { t } from "../localize/localize";
import { toneColor, type Tone } from "../model/tone";
import type { HomeAssistant } from "../types";

const toneStyle = (tone: Tone) => styleMap({ "--tone": toneColor(tone) });

/** Tinted circle with an icon, like the tile card's icon. */
export function bubble(icon: string, tone: Tone, large = false): TemplateResult {
  return html`<span class="bubble ${large ? "large" : ""}" style=${toneStyle(tone)} aria-hidden="true">
    <ha-icon .icon=${icon}></ha-icon>
  </span>`;
}

/** Text badge with a tone-coloured icon. */
export function badge(label: string, tone: Tone, icon?: string): TemplateResult {
  return html`<span class="badge" style=${toneStyle(tone)}>
    ${icon ? html`<ha-icon .icon=${icon} aria-hidden="true"></ha-icon>` : nothing}<span>${label}</span>
  </span>`;
}

export function empty(icon: string, text: string): TemplateResult {
  return html`<div class="empty"><ha-icon .icon=${icon} aria-hidden="true"></ha-icon><span>${text}</span></div>`;
}

export function alert(type: "info" | "warning" | "error" | "success", text: string): TemplateResult {
  return html`<ha-alert alert-type=${type}>${text}</ha-alert>`;
}

export interface HeaderOptions {
  title: string;
  icon: string;
  count?: string;
  /** Second line under the title, e.g. the council the card is filtered to (#94). */
  subtitle?: string;
  /** Label for the details button; shown when `onDetails` is set. */
  detailsLabel?: string;
  onDetails?: () => void;
}

export function header(options: HeaderOptions): TemplateResult {
  return html`<div class="header">
    <ha-icon .icon=${options.icon} aria-hidden="true"></ha-icon>
    <div class="heading">
      <h2 class="title">${options.title}${
        options.count ? html` <span class="count">${options.count}</span>` : nothing
      }</h2>
      ${options.subtitle ? html`<span class="subtitle">${options.subtitle}</span>` : nothing}
    </div>
    ${
      options.onDetails
        ? html`<div class="actions">
            <ha-icon-button .label=${options.detailsLabel ?? ""} @click=${options.onDetails}>
              <ha-icon icon="mdi:information-outline"></ha-icon>
            </ha-icon-button>
          </div>`
        : nothing
    }
  </div>`;
}

/** "Show all N" / "Show less" toggle for capped lists. */
export function showAll(hass: HomeAssistant, expanded: boolean, total: number, toggle: () => void): TemplateResult {
  return html`<ha-button
    class="more"
    appearance="plain"
    size="s"
    aria-expanded=${expanded ? "true" : "false"}
    @click=${toggle}
    >${expanded ? t(hass, "action.show_less") : t(hass, "action.show_all", { count: total })}</ha-button
  >`;
}
