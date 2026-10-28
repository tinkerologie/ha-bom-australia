"""Constants for the Bureau of Meteorology integration."""

from __future__ import annotations

from datetime import timedelta
from typing import Final

from homeassistant.components.weather import (
    ATTR_CONDITION_CLEAR_NIGHT,
    ATTR_CONDITION_CLOUDY,
    ATTR_CONDITION_EXCEPTIONAL,
    ATTR_CONDITION_FOG,
    ATTR_CONDITION_LIGHTNING_RAINY,
    ATTR_CONDITION_PARTLYCLOUDY,
    ATTR_CONDITION_POURING,
    ATTR_CONDITION_RAINY,
    ATTR_CONDITION_SNOWY,
    ATTR_CONDITION_SUNNY,
    ATTR_CONDITION_WINDY,
)

DOMAIN: Final = "bom_australia"

ATTRIBUTION: Final = "Data provided by the Australian Bureau of Meteorology"
MANUFACTURER: Final = "Bureau of Meteorology"
CONFIGURATION_URL: Final = "https://www.bom.gov.au/"

CONF_LOCATION: Final = "location"
CONF_LOCATION_AAC: Final = "location_aac"
CONF_LOCATION_NAME: Final = "location_name"
CONF_LOCATION_STATE: Final = "location_state"
CONF_TIMEZONE: Final = "timezone"
CONF_STATION_ID: Final = "station_id"
CONF_STATION_NAME: Final = "station_name"
CONF_FORECAST_DAYS: Final = "forecast_days"

DEFAULT_FORECAST_DAYS: Final = 2
MAX_FORECAST_DAYS: Final = 7
LOCATION_CHOICES: Final = 15
STATION_CHOICES: Final = 10

# BoM refreshes station observations every 10 minutes, town forecasts a few
# times a day and warnings as they are issued.
OBSERVATION_INTERVAL: Final = timedelta(minutes=10)
FORECAST_INTERVAL: Final = timedelta(minutes=30)
WARNINGS_INTERVAL: Final = timedelta(minutes=5)

# Hourly conditions older than this are not used for the current condition.
CURRENT_HOUR_TOLERANCE: Final = timedelta(minutes=90)

# Home Assistant state values are limited to 255 characters.
MAX_STATE_LENGTH: Final = 255
MAX_WARNING_MESSAGE_LENGTH: Final = 4000

ISSUE_STATION_UNAVAILABLE: Final = "station_unavailable"

# BoM icon descriptors (both the FTP icon codes and the BoM app API, which
# sometimes uses plural forms) mapped to Home Assistant weather conditions.
# HA has no haze, dust, frost or cyclone condition.
CONDITION_MAP: Final[dict[str, str]] = {
    "sunny": ATTR_CONDITION_SUNNY,
    "clear": ATTR_CONDITION_CLEAR_NIGHT,
    "mostly_sunny": ATTR_CONDITION_PARTLYCLOUDY,
    "partly_cloudy": ATTR_CONDITION_PARTLYCLOUDY,
    "cloudy": ATTR_CONDITION_CLOUDY,
    "hazy": ATTR_CONDITION_FOG,
    "haze": ATTR_CONDITION_FOG,
    "dusty": ATTR_CONDITION_FOG,
    "dust": ATTR_CONDITION_FOG,
    "fog": ATTR_CONDITION_FOG,
    "frost": ATTR_CONDITION_SNOWY,
    "snow": ATTR_CONDITION_SNOWY,
    "light_rain": ATTR_CONDITION_RAINY,
    "light_shower": ATTR_CONDITION_RAINY,
    "light_showers": ATTR_CONDITION_RAINY,
    "shower": ATTR_CONDITION_RAINY,
    "showers": ATTR_CONDITION_RAINY,
    "rain": ATTR_CONDITION_RAINY,
    "heavy_shower": ATTR_CONDITION_POURING,
    "heavy_showers": ATTR_CONDITION_POURING,
    "storm": ATTR_CONDITION_LIGHTNING_RAINY,
    "storms": ATTR_CONDITION_LIGHTNING_RAINY,
    "wind": ATTR_CONDITION_WINDY,
    "windy": ATTR_CONDITION_WINDY,
    "cyclone": ATTR_CONDITION_EXCEPTIONAL,
    "tropical_cyclone": ATTR_CONDITION_EXCEPTIONAL,
}
