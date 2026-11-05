# Agent instructions

Home Assistant custom integration `bom_australia` for Australian Bureau of
Meteorology data. Targets Home Assistant 2026.9+ and Python 3.14.

## Layout

- `custom_components/bom_australia/`: the integration
  - `coordinator.py`: four `TimestampDataUpdateCoordinator`s (observation, daily, hourly, warnings), runtime data, the `BomConfigEntry` alias
  - `config_flow.py`: user → town → station flow, reconfigure (station), `OptionsFlowWithReload` (forecast days)
  - `weather.py`, `sensor.py`, `entity.py`, `diagnostics.py`
  - `translations/en.json`: the only strings file (custom integrations cannot use `[%key:…]` references)
- `tests/`: pytest-homeassistant-custom-component tests with syrupy snapshots in `tests/snapshots/`. Fixtures are real BoM responses captured on 2026-10-28.
- The client library is [`bom-weather-api`](https://pypi.org/project/bom-weather-api/) (`tinkerologie/bom-weather-api`). Keep the pin in `manifest.json` and the `test` dependency group in `pyproject.toml` identical. To test against a local checkout: `BOM_API_PATH=../bom-api script/test`.

## Rules

- **Never do I/O in the integration.** All BoM access goes through `bom_weather_api.BomClient`. ruff bans `aiohttp` and `aioftp` imports here. Missing data or endpoints are changes to the library.
- Do not access `api.bom.gov.au` (the bom.gov.au website API). It blocks automated clients, and the project does not impersonate browsers.
- `import probatio as vol` (HA 2026.9+). No `hass.data[DOMAIN]`; use `entry.runtime_data`.
- Pass `step_id` to every `async_show_form`. Do not combine an update listener with `OptionsFlowWithReload` or `async_update_reload_and_abort`.
- Entities use `has_entity_name`, a `translation_key` and unique IDs `"{aac}_{key}"`. Never change existing unique IDs.
- BoM values can be missing at any time: a missing value means `None` (unknown), never a guessed value.
- No changing timestamps in state attributes (upstream #277). Large attributes go in `_unrecorded_attributes`.

## Commands

Dependencies are managed with uv: `pyproject.toml` dependency groups and the committed `uv.lock`. Never add `requirements*.txt` files; use `uv add --group dev <pkg>`.

```bash
script/setup                 # uv sync --locked into .venv
script/lint                  # ruff format + ruff check --fix + mypy
script/test --cov            # tests with coverage (keep ≥ 95%)
script/test --snapshot-update
BOM_LIVE=1 script/test tests/test_live.py   # end-to-end against live BoM
script/develop               # run HA on :8123 with this integration
```

## Home Assistant deprecations

Home Assistant logs deprecated use by integrations instead of raising, so CI checks
for it explicitly:

- **Current release (blocking):** pytest turns every warning into an error, and an
  autouse fixture (`tests/fixtures/deprecations.py`, installed from
  `tests/__init__.py`) fails a test when Home Assistant logs "Detected that custom
  integration 'bom_australia' …", "The deprecated … was used from bom_australia" or
  "custom_components.bom_australia.<module>::<Class> provides the deprecated …".
- **Next release (early warning):** the weekly `HA Next` workflow tests the newest
  `homeassistant` on PyPI (betas included) and Core `dev`: it imports every module
  (`script/import_smoke.py`), runs the tests when a matching
  `pytest-homeassistant-custom-component` exists, and runs Hassfest. Failures open
  one issue per channel labelled `ha-next` and `bug`.
- **Developer blog:** the weekly `HA Dev Blog` workflow (`script/ha_dev_blog.py`)
  opens an issue labelled `ha-dev-blog` and `enhancement` for each post that
  deprecates or removes code the integration uses.

When one of these fires: read the linked run or post, replace the deprecated API
with its successor, and keep the integration working on the minimum Home Assistant
version in `hacs.json`.

Run the checks locally:

```bash
script/test                                       # current release, blocking
.venv/bin/python script/import_smoke.py           # import smoke on the installed HA
HA_VERSION=2026.11.0 ./script/hassfest --skip-plugins ""   # Hassfest for a release
```

## Releases

Bump `version` in `manifest.json` (CalVer `YYYY.M.PATCH`) and add a matching
`## [VERSION]` section to `CHANGELOG.md`. Merging to `main` tags and publishes
the release.
