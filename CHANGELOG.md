# Changelog

All notable changes to this project are documented in this file. The format
is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
project uses Home Assistant style versions (`YYYY.M.PATCH`).

## [Unreleased]

### Fixed

- Setup now defaults to the nearest station with complete observations.
  Previously it chose the nearest station, which can be a beacon or portable
  unit that reports no wind or pressure (for example near Redcliffe, QLD).
  Partial stations are still offered, listed last and labelled with what they
  do not report.
- Daily forecasts start at local midnight; today's forecast previously used
  the issue time.

### Changed

- Requires `bom-weather-api` 0.2.0.

## [2026.10.0] - 2026-10-28

### Added

- First release: a rewrite of the Bureau of Meteorology integration for Home
  Assistant 2026.9 and later, built on the `bom-weather-api` library.
- Config flow that finds the nearest BoM forecast towns and observation
  stations, with a reconfigure flow to change station and an option for the
  number of forecast days.
- Weather entity with current conditions, a 7-day daily forecast and an hourly
  forecast.
- Observation, daily forecast, "now and later" and warnings sensors with
  translated names, icons and device classes.
- Diagnostics and a repair issue when the observation station stops reporting.

See [docs/upstream-issues.md](docs/upstream-issues.md) for the upstream issues
this release addresses.
