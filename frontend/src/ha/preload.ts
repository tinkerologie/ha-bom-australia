/**
 * Native Home Assistant elements the cards render.
 *
 * Verified on Home Assistant 2026.11.0: every tag here is defined on a dashboard
 * before any custom card loads (`ha-md-list-item` was removed in 2026.11 and is not
 * used). `loadCardHelpers()` is still awaited once, as the custom card docs
 * recommend, so a card rendered outside a dashboard (card picker, editor preview)
 * gets the same set.
 */
export const HA_ELEMENTS = [
  "ha-card",
  "ha-icon",
  "ha-icon-button",
  "ha-button",
  "ha-alert",
  "ha-assist-chip",
  "ha-filter-chip",
  "ha-chip-set",
  "ha-tooltip",
] as const;

let preload: Promise<void> | undefined;

export function preloadHaElements(timeoutMs = 5000): Promise<void> {
  preload ??= (async () => {
    try {
      await window.loadCardHelpers?.();
    } catch {
      // Not on a dashboard; elements upgrade whenever HA defines them.
    }
    await Promise.race([
      Promise.all(HA_ELEMENTS.map((tag) => customElements.whenDefined(tag))),
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  })();
  return preload;
}
