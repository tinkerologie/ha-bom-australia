# Changelog

All notable changes to this project are documented in this file. The format
is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project uses Home Assistant style versions (`YYYY.M.PATCH`).

## [Unreleased]

## [2026.10.0] - 2026-10-28

First release: a rewrite of the Bureau of Meteorology integration for Home
Assistant 2026.9 and later, built on the
[`bom-weather-api`](https://pypi.org/project/bom-weather-api/) library.

### Added

- Data from BoM's official anonymous FTP feeds (town forecasts and station
  observations), with hourly forecasts, warnings and forecast extras from the
  BoM app API. If the app API is unavailable, current conditions and the daily
  forecast keep working.
- Config flow that finds the nearest BoM forecast towns and observation
  stations. Stations with complete observations are offered first; partial
  ones (beacons, portable units) are listed last with what they do not report.
- Reconfigure flow to change the observation station, and an option for the
  number of days of forecast sensors.
- Weather entity with current conditions, a 7-day daily forecast and an hourly
  forecast.
- Observation, daily forecast, "now and later" and warnings sensors with
  translated names, icons and device classes; less common sensors are disabled
  by default.
- Dashboard cards, registered automatically: BoM weather (all-in-one), BoM now,
  BoM forecast, BoM warnings and BoM observations, each with a visual editor,
  sections view sizing and light and dark themes. The card picker suggests the
  BoM weather card for the integration's weather entity.
- Diagnostics, and a repair issue when the observation station stops
  reporting.

See [docs/upstream-issues.md](docs/upstream-issues.md) for the upstream issues
this release addresses.
