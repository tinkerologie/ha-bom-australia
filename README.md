# Bureau of Meteorology (Australia) for Home Assistant

[![HACS Custom](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://hacs.xyz/docs/faq/custom_repositories)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2026.9%2B-41BDF5?style=for-the-badge)
![Quality scale](https://img.shields.io/badge/quality%20scale-gold-FFD700?style=for-the-badge)

Weather observations, forecasts and warnings for Australian locations from the
[Bureau of Meteorology](https://www.bom.gov.au/) (BoM).

**This integration only supports locations in Australia.**

## What you get

For each forecast town you add:

- A **weather entity** (`weather.<town>`) with:
  - current conditions from the nearest BoM weather station
  - a 7-day daily forecast and a 72-hour hourly forecast, for the default weather card and `weather.get_forecasts`
- **Observation sensors**: temperature, feels like, dew point, humidity,
  pressure, wind speed, gust and direction, and rain since 9am. Max gust, the
  day's observed max/min temperature, rain to 9am, delta-T, visibility and
  cloud cover are also available, but disabled by default.
- **Daily forecast sensors** for today, tomorrow and up to 7 days:
  - enabled by default: max/min temperature, summary, extended forecast, chance of rain, rain amount, UV index and fire danger
  - disabled by default: UV category and sun-protection times, sunrise/sunset, icon descriptor, and min/max rain amounts
- **Now and later** sensors, the "Max 29 / Overnight min 17" values from the BoM app (disabled by default).
- A **warnings** sensor: the number of current BoM warnings for the location,
  with each warning's title, type, phase, issue/expiry times and full message
  in its `warnings` attribute.

## Data sources

The integration uses the [`bom-weather-api`](https://github.com/tinkerologie/bom-weather-api)
library, which combines:

| Data | Source |
|---|---|
| Forecast towns, daily town forecast, station observations | BoM's official [anonymous FTP data feeds](https://www.bom.gov.au/catalogue/data-feeds.shtml) (`ftp.bom.gov.au`) |
| Hourly forecast, warnings, and the extended text, UV, fire danger and sun times in the daily forecast | The JSON API behind the BoM app (`api.weather.bom.gov.au`) |

The anonymous FTP products are published by BoM as free to access for
non-commercial use. The app API is undocumented and not intended for public
use. If it changes or becomes unavailable, hourly forecasts, warnings and the
daily extras become unavailable, but current conditions and the core daily
forecast keep working.

The integration identifies itself honestly to BoM and polls conservatively
(see [Data updates](#data-updates)). It does not use the bom.gov.au website
API, which blocks automated clients.

## Installation

### HACS

1. In HACS, open the menu and choose **Custom repositories**.
2. Add `https://github.com/tinkerologie/ha-bom-australia` with type **Integration**.
3. Install **Bureau of Meteorology (Australia)** and restart Home Assistant.

### Manual

Copy `custom_components/bom_australia` into your Home Assistant
`config/custom_components` folder and restart Home Assistant.

## Configuration

1. Go to **Settings > Devices & services > Add integration** and search for
   **Bureau of Meteorology (Australia)**.
2. **Location**: pick a point on the map (defaults to your home location).
3. **Forecast town**: choose one of the nearest BoM forecast towns. BoM issues
   town forecasts for about 680 places.
4. **Observation station**: choose the weather station that supplies current
   conditions. Stations are listed nearest first, and the integration checks
   that the station you pick is reporting.

Add the integration again to set up more towns.

### Options

| Option | Description | Default |
|---|---|---|
| Forecast days | Number of days to create daily forecast sensors for. 0 creates none, 1 is today only. The weather entity always has the full forecast. | 2 |

Reducing the number of days removes the sensors for the days you no longer use.

### Changing the observation station

Open the entry's menu under **Settings > Devices & services** and choose
**Reconfigure**. To use a different forecast town, add a new entry.

## Data updates

| Data | Interval |
|---|---|
| Observations | 10 minutes (BoM updates stations every 10 minutes) |
| Daily and hourly forecasts | 30 minutes (BoM issues town forecasts a few times a day) |
| Warnings | 5 minutes; each warning's full text is fetched once per issue |

Each data set updates independently, so a problem with one source only makes
its own entities unavailable. If BoM asks the integration to slow down, it
waits for the time BoM requests.

## Examples

Notify when a new warning is issued:

```yaml
automation:
  - alias: BoM warning issued
    triggers:
      - trigger: state
        entity_id: sensor.brisbane_warnings
    conditions:
      - condition: template
        value_template: "{{ trigger.to_state.state | int(0) > trigger.from_state.state | int(0) }}"
    actions:
      - action: notify.mobile_app_phone
        data:
          title: "{{ state_attr('sensor.brisbane_warnings', 'warnings')[0].title }}"
          message: "{{ state_attr('sensor.brisbane_warnings', 'warnings')[0].short_title }}"
```

Skip the irrigation when rain is likely:

```yaml
conditions:
  - condition: numeric_state
    entity_id: sensor.brisbane_chance_of_rain_day_0
    below: 60
```

Get tomorrow's forecast in a template:

```yaml
actions:
  - action: weather.get_forecasts
    target:
      entity_id: weather.brisbane
    data:
      type: daily
    response_variable: forecast
  - action: notify.mobile_app_phone
    data:
      message: >
        Tomorrow: {{ forecast['weather.brisbane'].forecast[1].condition }},
        max {{ forecast['weather.brisbane'].forecast[1].temperature }}°C
```

## Use cases

- Show BoM forecasts on the default weather card or a custom card.
- Automate irrigation, blinds or pool covers from rain chance, wind and UV.
- Get notifications for severe weather, flood, fire and heatwave warnings.
- Record local station observations in long-term statistics.

## Known limitations

- **FTP access is required.** Current conditions and daily forecasts are
  downloaded from `ftp.bom.gov.au` on port 21. Networks that block outbound FTP
  stop the integration from setting up.
- Forecasts are only available for BoM forecast towns, not for any
  coordinate. Pick the nearest town.
- Hourly forecasts, warnings and the daily extras (extended text, UV, fire
  danger, sunrise and sunset) depend on the unofficial BoM app API.
- BoM sometimes omits values, for example today's minimum temperature after
  the morning or today's icon late in the evening. Those entities then show as
  unknown rather than a made-up value.
- Rain radar is not included.
- Entries from the older `bureau_of_meteorology` custom integration are not
  migrated. It uses a different domain, and both can be installed side by side
  while you move across.

## Troubleshooting

- **"Unable to reach the Bureau of Meteorology"** during setup: check that
  Home Assistant can reach `ftp.bom.gov.au` on port 21.
- **A "weather station is not reporting" repair** appears: the station has
  stopped reporting. Use **Reconfigure** to pick another one.
- **Hourly forecast or warnings unavailable**: the BoM app API is down or has
  changed. Check the logs and open an issue if it persists.

Enable debug logging:

```yaml
logger:
  logs:
    custom_components.bom_australia: debug
    bom_weather_api: debug
```

Diagnostics can be downloaded from the integration's device page. Coordinates
are redacted.

## Removal

1. Go to **Settings > Devices & services > Bureau of Meteorology (Australia)**.
2. For each entry, open the menu and choose **Delete**.
3. Remove the integration from HACS, or delete `custom_components/bom_australia`, and restart.

## Credits

Inspired by [bremor/bureau_of_meteorology](https://github.com/bremor/bureau_of_meteorology),
whose open issues and pull requests shaped this rewrite.

Data © Commonwealth of Australia, Bureau of Meteorology. This project is not
affiliated with or endorsed by the Bureau of Meteorology.
