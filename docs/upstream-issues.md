# Upstream issues addressed

How this rewrite handles the open issues and unmerged pull requests in
[bremor/bureau_of_meteorology](https://github.com/bremor/bureau_of_meteorology),
reviewed on 2026-10-28.

## Bugs

| Upstream | Problem | Resolution |
|---|---|---|
| #259, #284, #289, #305, #283, PR #324, PR #329 | Null BoM fields (day-0 icon/short text late evening, day-0 `temp_min`, UV times, station, wind/gust) crash parsing or break all entities | Every model field is optional and parsing never indexes directly (`bom_weather_api.parsers`). A missing value makes only that entity `unknown`. The current condition uses the current hour's forecast and falls back to today's icon, with no made-up "sunny" fallback. |
| #277 | Hundreds of `state_changed` events every poll (`response_timestamp` attributes, duplicate listeners) | No changing timestamps in attributes. Issue times are diagnostic sensors. Entities use `CoordinatorEntity` only. Per-day sensors default to 2 days and many are disabled by default. Warning messages are excluded from the recorder. |
| #238 | Disabled entities re-enabled; registry entries deleted by matching rebuilt entity IDs | Registry entries are never deleted by entity ID. Only forecast sensors for days beyond the configured count are removed, matched by unique ID. |
| #282, #113 | Setup fails offline and never retries; errors swallowed; stale cache served for 24 h | `async_config_entry_first_refresh` raises `ConfigEntryNotReady`. All library errors become translated `UpdateFailed`, so entities go unavailable and recover automatically. HA's shared session is used. |
| #262 | Text over 255 characters becomes `unknown` | Long text is truncated in the state; the full text is in the `text` attribute. |
| #287 | Names like "Rain Since 9Am" | `has_entity_name` with translated names. |
| #269, #274, #267, #241, #246, PR #313 | Wrong condition and icon mapping | One mapping table (`const.CONDITION_MAP`): `mostly_sunny` → partly cloudy, heavy showers → pouring, cyclone → exceptional, sunny/clear switch with day and night. |
| #290, PR #291 | Forecast location differs from the BoM app (geohash rounding) | You choose an official BoM forecast town and the observation station explicitly. |
| #272 | Rain since 9am shown as whole numbers | `suggested_display_precision=1`. |
| #309, #281 | Manifest version and release tag mismatch breaks HACS updates | The release workflow creates the tag from `manifest.json`. |

## Feature requests

| Upstream | Request | Status |
|---|---|---|
| #264, PR #265 | One weather entity with daily and hourly forecasts | Done |
| #302, #263 | Warning message text | Done: full plain-text message per warning in the `warnings` attribute |
| #276 | Short text / précis | Done: "Summary" sensors |
| #237 | Barometric pressure | Done (mean sea level pressure) |
| #280 | Dew point | Done, observed, not calculated |
| #247 | Wind direction in degrees | Done: "Wind bearing" sensor with the wind direction device class |
| #278 | Fire behaviour index | Not available in the data sources used; fire danger rating is provided |
| #279, #261 | Rain amounts for irrigation | Done: rain range plus min/max sensors |
| #327 | Rainfall for the calendar day | Partly: rain since 9am and rain to 9am. Rain since midnight is not in the FTP feed |
| #292, #288 | Cloud cover in hourly forecast | Not in the hourly data source used. Observed cloud cover (oktas) is available |
| #320, #270 | Daily wind | Not available. The hourly forecast includes wind |
| #285, #240 | Hourly values as entities | Use `weather.get_forecasts` |
| #286, #273, #258, #235 | Nowcast, evapotranspiration, tides, space weather | Out of scope |

## Data source change

Upstream relies only on the undocumented app API (`api.weather.bom.gov.au`),
and PR #291 moves to the bom.gov.au website API (`api.bom.gov.au/apikey/v1`).
On 2026-10-28 that website API rejected automated clients ("Your access is
blocked due to the detection of a potential automated access request") unless
they impersonated a browser.

This integration bases current conditions and daily forecasts on BoM's
official anonymous FTP products. The app API is only used for hourly
forecasts, warnings and daily extras, so the core keeps working if that API
goes away.
