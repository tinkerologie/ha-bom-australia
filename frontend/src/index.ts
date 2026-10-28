/**
 * Bureau of Meteorology (Australia) card suite.
 *
 * One bundle, registered by the integration as a Lovelace resource, defines four
 * focused cards and the all-in-one `custom:bom-australia-card`, and lists each in the
 * card picker. Every definition is guarded so the bundle can load twice safely.
 */
import { ALL_IN_ONE_TAG, CARD_TAGS, DOCUMENTATION_URL, DOMAIN, type SectionKey } from "./const";
import { t, type TranslationKey } from "./localize/localize";
import { AllInOneCard } from "./cards/all-in-one";
import { ForecastCard } from "./cards/forecast";
import { NowCard } from "./cards/now";
import { ObservationsCard } from "./cards/observations";
import { WarningsCard } from "./cards/warnings";
import type { HomeAssistant } from "./types";

const FOCUSED: Record<SectionKey, CustomElementConstructor> = {
  now: NowCard,
  forecast: ForecastCard,
  warnings: WarningsCard,
  observations: ObservationsCard,
};

const cards: { tag: string; ctor: CustomElementConstructor; key: string }[] = [
  { tag: ALL_IN_ONE_TAG, ctor: AllInOneCard, key: "all" },
  ...(Object.keys(FOCUSED) as SectionKey[]).map((key) => ({ tag: CARD_TAGS[key], ctor: FOCUSED[key], key })),
];

/** Suggest the all-in-one card for this integration's weather entities. */
function getEntitySuggestion(hass: HomeAssistant, entityId: string): { config: Record<string, unknown> } | null {
  const entry = hass.entities?.[entityId];
  if (!entityId.startsWith("weather.") || entry?.platform !== DOMAIN || !entry.device_id) return null;
  return { config: { type: `custom:${ALL_IN_ONE_TAG}`, device: entry.device_id } };
}

window.customCards = window.customCards || [];
for (const { tag, ctor, key } of cards) {
  if (!customElements.get(tag)) customElements.define(tag, ctor);
  if (!window.customCards.some((card) => card.type === tag)) {
    window.customCards.push({
      type: tag,
      name: t(undefined, `card.${key}.name` as TranslationKey),
      description: t(undefined, `card.${key}.description` as TranslationKey),
      preview: true,
      documentationURL: DOCUMENTATION_URL,
      ...(tag === ALL_IN_ONE_TAG ? { getEntitySuggestion } : {}),
    });
  }
}
