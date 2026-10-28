"""Diagnostics for the Bureau of Meteorology integration."""

from __future__ import annotations

from dataclasses import asdict
from typing import TYPE_CHECKING, Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.const import CONF_LATITUDE, CONF_LONGITUDE

from .coordinator import BomConfigEntry, BomCoordinator, diagnostics_data

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

TO_REDACT = {CONF_LATITUDE, CONF_LONGITUDE, "coordinate"}


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: BomConfigEntry
) -> dict[str, Any]:
    """Return diagnostics for a config entry."""
    runtime = entry.runtime_data
    coordinators: dict[str, BomCoordinator[Any]] = {
        "observation": runtime.observation,
        "daily_forecast": runtime.daily,
        "hourly_forecast": runtime.hourly,
        "warnings": runtime.warnings,
    }
    hourly = runtime.hourly.data
    return {
        "entry": {
            "data": async_redact_data(dict(entry.data), TO_REDACT),
            "options": dict(entry.options),
        },
        "location": async_redact_data(asdict(runtime.location), TO_REDACT),
        "coordinators": {
            name: diagnostics_data(coordinator)
            for name, coordinator in coordinators.items()
        },
        "observation": asdict(runtime.observation.data),
        "daily_forecast": asdict(runtime.daily.data),
        "hourly_forecast": {
            "issued_at": hourly.issued_at,
            "hours": [asdict(hour) for hour in hourly.hours[:6]],
        }
        if hourly
        else None,
        "warnings": [asdict(warning) for warning in runtime.warnings.data or ()],
    }
