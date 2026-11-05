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
# Open-Meteo data is CC BY 4.0, which requires this credit.
ATTRIBUTION_OPEN_METEO: Final = (
    "Data provided by the Australian Bureau of Meteorology; extended and "
    "fallback forecasts by Open-Meteo.com (ECMWF IFS, CC BY 4.0)"
)
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
CONF_OPEN_METEO: Final = "open_meteo"

DEFAULT_FORECAST_DAYS: Final = 2
MAX_FORECAST_DAYS: Final = 7
LOCATION_CHOICES: Final = 15
STATION_CHOICES: Final = 10

# A station must report these to be offered first; REPORTED_MEASUREMENTS are
# listed in station labels when missing.
CORE_MEASUREMENTS: Final = frozenset({"temperature", "humidity", "wind"})
REPORTED_MEASUREMENTS: Final = ("temperature", "humidity", "wind", "pressure")

# BoM refreshes station observations every 10 minutes, town forecasts a few
# times a day and warnings as they are issued.
OBSERVATION_INTERVAL: Final = timedelta(minutes=10)
FORECAST_INTERVAL: Final = timedelta(minutes=30)
WARNINGS_INTERVAL: Final = timedelta(minutes=5)

# Open-Meteo (optional secondary source). ECMWF IFS is the best free global model
# for Australia and runs every 6 hours, so an hourly poll is plenty. It is pinned,
# not "best_match", so the data does not change source without notice. BoM's own
# ACCESS models on Open-Meteo have returned no data since mid-2025.
OPEN_METEO_INTERVAL: Final = timedelta(minutes=60)
OPEN_METEO_MODEL: Final = "ecmwf_ifs"
OPEN_METEO_FORECAST_DAYS: Final = 15

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

# WMO weather interpretation codes (Open-Meteo) mapped to Home Assistant
# conditions.
WMO_CONDITION_MAP: Final[dict[int, str]] = {
    0: ATTR_CONDITION_SUNNY,
    1: ATTR_CONDITION_SUNNY,
    2: ATTR_CONDITION_PARTLYCLOUDY,
    3: ATTR_CONDITION_CLOUDY,
    45: ATTR_CONDITION_FOG,
    48: ATTR_CONDITION_FOG,
    51: ATTR_CONDITION_RAINY,
    53: ATTR_CONDITION_RAINY,
    55: ATTR_CONDITION_RAINY,
    56: ATTR_CONDITION_RAINY,
    57: ATTR_CONDITION_RAINY,
    61: ATTR_CONDITION_RAINY,
    63: ATTR_CONDITION_RAINY,
    65: ATTR_CONDITION_POURING,
    66: ATTR_CONDITION_RAINY,
    67: ATTR_CONDITION_POURING,
    71: ATTR_CONDITION_SNOWY,
    73: ATTR_CONDITION_SNOWY,
    75: ATTR_CONDITION_SNOWY,
    77: ATTR_CONDITION_SNOWY,
    80: ATTR_CONDITION_RAINY,
    81: ATTR_CONDITION_RAINY,
    82: ATTR_CONDITION_POURING,
    85: ATTR_CONDITION_SNOWY,
    86: ATTR_CONDITION_SNOWY,
    95: ATTR_CONDITION_LIGHTNING_RAINY,
    96: ATTR_CONDITION_LIGHTNING_RAINY,
    99: ATTR_CONDITION_LIGHTNING_RAINY,
}
