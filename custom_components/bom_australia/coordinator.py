"""Data update coordinators for the Bureau of Meteorology integration."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, replace
from datetime import datetime, timedelta
import logging
from typing import TYPE_CHECKING, Any, override

from bom_weather_api import (
    BomClient,
    BomError,
    BomNotFoundError,
    BomRateLimitError,
    Coordinate,
    DailyForecast,
    ForecastLocation,
    HourlyForecast,
    Observation,
    WarningDetails,
    WeatherWarning,
)

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_LATITUDE, CONF_LONGITUDE
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.update_coordinator import (
    TimestampDataUpdateCoordinator,
    UpdateFailed,
)

from .const import (
    CONF_LOCATION_AAC,
    CONF_LOCATION_NAME,
    CONF_LOCATION_STATE,
    CONF_STATION_ID,
    CONF_STATION_NAME,
    CONF_TIMEZONE,
    DOMAIN,
    FORECAST_INTERVAL,
    ISSUE_STATION_UNAVAILABLE,
    OBSERVATION_INTERVAL,
    WARNINGS_INTERVAL,
)

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

type BomConfigEntry = ConfigEntry[BomRuntimeData]


def location_from_entry(entry: ConfigEntry) -> ForecastLocation:
    """Rebuild the forecast location stored in a config entry."""
    data = entry.data
    return ForecastLocation(
        aac=data[CONF_LOCATION_AAC],
        name=data[CONF_LOCATION_NAME],
        state=data[CONF_LOCATION_STATE],
        coordinate=Coordinate(
            latitude=data[CONF_LATITUDE], longitude=data[CONF_LONGITUDE]
        ),
        timezone=data.get(CONF_TIMEZONE),
    )


@dataclass(slots=True)
class BomRuntimeData:
    """Runtime data stored on the config entry."""

    client: BomClient
    location: ForecastLocation
    observation: BomObservationCoordinator
    daily: BomDailyForecastCoordinator
    hourly: BomHourlyForecastCoordinator
    warnings: BomWarningsCoordinator


class BomCoordinator[DataT](TimestampDataUpdateCoordinator[DataT]):
    """Base coordinator that maps library errors to translated failures."""

    config_entry: BomConfigEntry
    translation_key: str

    def __init__(
        self,
        hass: HomeAssistant,
        config_entry: BomConfigEntry,
        client: BomClient,
        location: ForecastLocation,
        update_interval: timedelta,
    ) -> None:
        """Initialise the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            config_entry=config_entry,
            name=f"{DOMAIN} {self.translation_key} {location.name}",
            update_interval=update_interval,
        )
        self.client = client
        self.location = location

    async def _fetch(self) -> DataT:
        """Fetch the data from BoM."""
        raise NotImplementedError

    @override
    async def _async_update_data(self) -> DataT:
        try:
            return await self._fetch()
        except BomRateLimitError as err:
            raise UpdateFailed(
                translation_domain=DOMAIN,
                translation_key="rate_limited",
                retry_after=err.retry_after,
            ) from err
        except BomError as err:
            raise UpdateFailed(
                translation_domain=DOMAIN,
                translation_key=f"{self.translation_key}_failed",
                translation_placeholders={"error": str(err)},
            ) from err


class BomObservationCoordinator(BomCoordinator[Observation]):
    """Latest observation from the selected weather station."""

    translation_key = "observation"

    def __init__(
        self,
        hass: HomeAssistant,
        config_entry: BomConfigEntry,
        client: BomClient,
        location: ForecastLocation,
    ) -> None:
        """Initialise the coordinator."""
        super().__init__(hass, config_entry, client, location, OBSERVATION_INTERVAL)
        self.station_id: str = config_entry.data[CONF_STATION_ID]
        self.station_name: str = config_entry.data[CONF_STATION_NAME]

    @property
    def _issue_id(self) -> str:
        return f"{ISSUE_STATION_UNAVAILABLE}_{self.config_entry.entry_id}"

    @override
    async def _fetch(self) -> Observation:
        try:
            observation = await self.client.get_observation(
                self.location.product_state, self.station_id
            )
        except BomNotFoundError:
            # The station stopped reporting (or was decommissioned): tell the
            # user they can pick another one.
            ir.async_create_issue(
                self.hass,
                DOMAIN,
                self._issue_id,
                is_fixable=False,
                severity=ir.IssueSeverity.WARNING,
                translation_key=ISSUE_STATION_UNAVAILABLE,
                translation_placeholders={
                    "station": self.station_name,
                    "location": self.location.name,
                },
            )
            raise
        ir.async_delete_issue(self.hass, DOMAIN, self._issue_id)
        return observation


class BomDailyForecastCoordinator(BomCoordinator[DailyForecast]):
    """Daily town forecast."""

    translation_key = "daily_forecast"

    def __init__(
        self,
        hass: HomeAssistant,
        config_entry: BomConfigEntry,
        client: BomClient,
        location: ForecastLocation,
    ) -> None:
        """Initialise the coordinator."""
        super().__init__(hass, config_entry, client, location, FORECAST_INTERVAL)

    @override
    async def _fetch(self) -> DailyForecast:
        return await self.client.get_daily_forecast(self.location)


class BomHourlyForecastCoordinator(BomCoordinator[HourlyForecast]):
    """Hourly forecast."""

    translation_key = "hourly_forecast"

    def __init__(
        self,
        hass: HomeAssistant,
        config_entry: BomConfigEntry,
        client: BomClient,
        location: ForecastLocation,
    ) -> None:
        """Initialise the coordinator."""
        super().__init__(hass, config_entry, client, location, FORECAST_INTERVAL)

    @override
    async def _fetch(self) -> HourlyForecast:
        return await self.client.get_hourly_forecast(self.location.coordinate)


class BomWarningsCoordinator(BomCoordinator[list[WeatherWarning]]):
    """Current warnings for the location."""

    translation_key = "warnings"

    def __init__(
        self,
        hass: HomeAssistant,
        config_entry: BomConfigEntry,
        client: BomClient,
        location: ForecastLocation,
    ) -> None:
        """Initialise the coordinator."""
        super().__init__(hass, config_entry, client, location, WARNINGS_INTERVAL)
        self._messages: dict[tuple[str, datetime | None], str | None] = {}

    @override
    async def _fetch(self) -> list[WeatherWarning]:
        warnings = await self.client.get_warnings(self.location.coordinate)
        # Fetch the full text only once per warning issue.
        keys = {warning.id: (warning.id, warning.issued_at) for warning in warnings}
        missing = [w for w in warnings if keys[w.id] not in self._messages]
        results = await asyncio.gather(
            *(self.client.get_warning(warning.id) for warning in missing),
            return_exceptions=True,
        )
        for warning, result in zip(missing, results, strict=True):
            if isinstance(result, WarningDetails):
                self._messages[keys[warning.id]] = result.message
            elif not isinstance(result, BomError):
                raise result
        current = set(keys.values())
        self._messages = {k: v for k, v in self._messages.items() if k in current}
        return [
            replace(warning, message=self._messages.get(keys[warning.id]))
            for warning in warnings
        ]


def diagnostics_data(coordinator: BomCoordinator[Any]) -> dict[str, Any]:
    """Return a coordinator's state for diagnostics."""
    return {
        "last_update_success": coordinator.last_update_success,
        "last_update_success_time": coordinator.last_update_success_time,
        "last_exception": repr(coordinator.last_exception)
        if coordinator.last_exception
        else None,
    }
