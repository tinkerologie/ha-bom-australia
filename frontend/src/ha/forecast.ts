/**
 * Live weather forecasts over `weather/subscribe_forecast`, as a Lit reactive
 * controller. The subscription follows the host's connection and the requested entity
 * and forecast type, and is always released when the card leaves the page.
 */
import type { ReactiveController, ReactiveControllerHost } from "lit";
import type { ForecastEntry, ForecastEvent, HomeAssistant } from "../types";

export type ForecastType = "daily" | "hourly";

const RETRY_MS = 30_000;

export class ForecastController implements ReactiveController {
  /** Latest forecast, or undefined until the first event arrives. */
  forecast?: ForecastEntry[];
  /** True when the subscription failed (entity missing, or forecast type unsupported). */
  failed = false;

  private key?: string;
  private unsubscribe?: Promise<(() => Promise<void>) | undefined>;
  private retry?: ReturnType<typeof setTimeout>;
  private connected = false;

  constructor(private readonly host: ReactiveControllerHost) {
    host.addController(this);
  }

  hostConnected(): void {
    this.connected = true;
  }

  hostDisconnected(): void {
    this.connected = false;
    this.release();
  }

  /** Subscribe to `type` forecasts of `entityId` (no-op when already subscribed). */
  update(hass: HomeAssistant | undefined, entityId: string | undefined, type: ForecastType): void {
    if (!this.connected || !hass?.connection || !entityId) return;
    const key = `${entityId}|${type}`;
    if (key === this.key) return;
    this.release();
    this.key = key;
    this.forecast = undefined;
    this.failed = false;
    this.unsubscribe = hass.connection
      .subscribeMessage<ForecastEvent>(
        (event) => {
          if (this.key !== key) return;
          this.forecast = event.forecast ?? [];
          this.host.requestUpdate();
        },
        { type: "weather/subscribe_forecast", entity_id: entityId, forecast_type: type },
      )
      .catch(() => {
        // Usually a weather entity that is not loaded yet: try again later.
        if (this.key === key) {
          this.failed = true;
          this.host.requestUpdate();
          this.retry = setTimeout(() => {
            this.key = undefined;
            this.update(hass, entityId, type);
          }, RETRY_MS);
        }
        return undefined;
      });
  }

  private release(): void {
    if (this.retry) clearTimeout(this.retry);
    this.retry = undefined;
    const pending = this.unsubscribe;
    this.unsubscribe = undefined;
    this.key = undefined;
    void pending?.then((unsubscribe) => unsubscribe?.()).catch(() => undefined);
  }
}
