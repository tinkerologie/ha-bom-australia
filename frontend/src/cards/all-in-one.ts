/**
 * `custom:bom-australia-card`: the focused cards stacked in one card, sharing one
 * `ha-card` frame. `sections` picks which ones and in what order.
 */
import { css, html, type TemplateResult } from "lit";
import { CARD_TAGS, SECTIONS, type SectionKey } from "../const";
import { t, type TranslationKey } from "../localize/localize";
import { cardStyles } from "../styles";
import type { BaseCardConfig, HomeAssistant, LovelaceConfigForm } from "../types";
import { BomCard, assertList, baseSchema, computeHelper, computeLabel, stubConfig } from "./base";

export interface AllInOneCardConfig extends BaseCardConfig {
  sections?: SectionKey[];
}

export class AllInOneCard extends BomCard<AllInOneCardConfig> {
  static override styles = [
    cardStyles,
    css`
      .sections > * + * {
        border-top: var(--ha-border-width-sm) solid var(--divider-color);
      }
    `,
  ];

  protected readonly titleKey = "card.all.name";

  static override validateConfig(config: AllInOneCardConfig): void {
    super.validateConfig(config);
    assertList(config as unknown as Record<string, unknown>, "sections", SECTIONS);
  }

  static getConfigForm(): LovelaceConfigForm {
    return {
      schema: [
        ...baseSchema(),
        {
          name: "sections",
          default: [...SECTIONS],
          selector: {
            select: {
              multiple: true,
              reorder: true,
              options: SECTIONS.map((value) => ({
                value,
                label: t(undefined, `editor.section.${value}` as TranslationKey),
              })),
            },
          },
        },
      ],
      computeLabel,
      computeHelper,
      assertConfig: (c) => this.validateConfig(c as AllInOneCardConfig),
    };
  }

  static getStubConfig(hass?: HomeAssistant): Record<string, unknown> {
    return stubConfig(hass);
  }

  override getCardSize(): number {
    return 12;
  }

  /** Re-render on every hass change: the embedded cards decide for themselves. */
  protected override shouldUpdate(): boolean {
    return true;
  }

  protected renderBody(hass: HomeAssistant, config: AllInOneCardConfig): TemplateResult {
    const sections = config.sections ?? [...SECTIONS];
    return html`<div class="sections">
      ${sections.map((key) => this.embeddedCard(CARD_TAGS[key], { device: config.device }, hass))}
    </div>`;
  }

  private readonly cards = new Map<string, EmbeddedCard>();

  /** One element per section, reused so embedded cards keep their state and subscriptions. */
  private embeddedCard(tag: string, config: { device?: string }, hass: HomeAssistant): EmbeddedCard {
    let element = this.cards.get(tag);
    if (!element) {
      element = document.createElement(tag) as EmbeddedCard;
      element.setAttribute("embedded", "");
      this.cards.set(tag, element);
    }
    const key = JSON.stringify(config);
    if (element.dataset.config !== key) {
      element.setConfig?.({ type: `custom:${tag}`, ...config });
      element.dataset.config = key;
    }
    element.hass = hass;
    return element;
  }
}

type EmbeddedCard = HTMLElement & { hass?: HomeAssistant; setConfig?(config: unknown): void };
