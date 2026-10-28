"""The Bureau of Meteorology (Australia) integration."""

from __future__ import annotations

from bom_weather_api import BomClient

from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .const import DOMAIN
from .coordinator import (
    BomConfigEntry,
    BomDailyForecastCoordinator,
    BomHourlyForecastCoordinator,
    BomObservationCoordinator,
    BomRuntimeData,
    BomWarningsCoordinator,
    location_from_entry,
)
from .frontend import async_register_frontend, async_unregister_frontend

PLATFORMS: list[Platform] = [Platform.SENSOR, Platform.WEATHER]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup_entry(hass: HomeAssistant, entry: BomConfigEntry) -> bool:
    """Set up Bureau of Meteorology from a config entry."""
    await async_register_frontend(hass)
    client = BomClient(async_get_clientsession(hass))
    location = location_from_entry(entry)
    runtime = BomRuntimeData(
        client=client,
        location=location,
        observation=BomObservationCoordinator(hass, entry, client, location),
        daily=BomDailyForecastCoordinator(hass, entry, client, location),
        hourly=BomHourlyForecastCoordinator(hass, entry, client, location),
        warnings=BomWarningsCoordinator(hass, entry, client, location),
    )

    # Observations and the daily forecast come from the official FTP products
    # and are required. Hourly forecasts and warnings come from the BoM app
    # API, so a failure there only makes those entities unavailable.
    await runtime.observation.async_config_entry_first_refresh()
    await runtime.daily.async_config_entry_first_refresh()
    await runtime.hourly.async_refresh()
    await runtime.warnings.async_refresh()

    entry.runtime_data = runtime
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: BomConfigEntry) -> bool:
    """Unload a config entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_entry(hass: HomeAssistant, entry: BomConfigEntry) -> None:
    """Remove the dashboard card resource with the last config entry."""
    if not [
        other
        for other in hass.config_entries.async_entries(DOMAIN)
        if other.entry_id != entry.entry_id
    ]:
        await async_unregister_frontend(hass)
