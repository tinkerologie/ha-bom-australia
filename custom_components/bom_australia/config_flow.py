"""Config flow for the Bureau of Meteorology integration."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any, override

from bom_weather_api import (
    BomClient,
    BomError,
    BomNotFoundError,
    Coordinate,
    ForecastLocation,
    Station,
)
import probatio as vol

from homeassistant.config_entries import (
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlowWithReload,
)
from homeassistant.const import CONF_LATITUDE, CONF_LONGITUDE
from homeassistant.core import callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.selector import (
    LocationSelector,
    LocationSelectorConfig,
    NumberSelector,
    NumberSelectorConfig,
    NumberSelectorMode,
    SelectOptionDict,
    SelectSelector,
    SelectSelectorConfig,
    SelectSelectorMode,
)

from .const import (
    CONF_FORECAST_DAYS,
    CONF_LOCATION,
    CONF_LOCATION_AAC,
    CONF_LOCATION_NAME,
    CONF_LOCATION_STATE,
    CONF_STATION_ID,
    CONF_STATION_NAME,
    CONF_TIMEZONE,
    CORE_MEASUREMENTS,
    DEFAULT_FORECAST_DAYS,
    DOMAIN,
    LOCATION_CHOICES,
    MAX_FORECAST_DAYS,
    REPORTED_MEASUREMENTS,
    STATION_CHOICES,
)
from .coordinator import location_from_entry

if TYPE_CHECKING:
    from .coordinator import BomConfigEntry

_LOGGER = logging.getLogger(__name__)


def _station_label(station: Station, distance: float) -> str:
    """Label a station, noting which measurements it does not report."""
    label = f"{station.name} ({distance:g} km)"
    if missing := [m for m in REPORTED_MEASUREMENTS if m not in station.observes]:
        label += f" - no {', '.join(missing)}"
    return label


def _select(options: list[SelectOptionDict]) -> SelectSelector:
    return SelectSelector(
        SelectSelectorConfig(options=options, mode=SelectSelectorMode.LIST)
    )


class BomConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for the Bureau of Meteorology."""

    VERSION = 1
    MINOR_VERSION = 1

    def __init__(self) -> None:
        """Initialise the flow."""
        self._client: BomClient | None = None
        self._towns: dict[str, ForecastLocation] = {}
        self._town: ForecastLocation | None = None
        self._town_options: list[SelectOptionDict] = []
        self._stations: dict[str, Station] = {}
        self._station_options: list[SelectOptionDict] = []

    @property
    def client(self) -> BomClient:
        """Return a client using Home Assistant's shared session."""
        if self._client is None:
            self._client = BomClient(async_get_clientsession(self.hass))
        return self._client

    @staticmethod
    @callback
    @override
    def async_get_options_flow(config_entry: BomConfigEntry) -> BomOptionsFlow:
        return BomOptionsFlow()

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Choose the location to find the nearest BoM forecast towns."""
        errors: dict[str, str] = {}
        if user_input is not None:
            point = user_input[CONF_LOCATION]
            home = Coordinate(
                latitude=point[CONF_LATITUDE], longitude=point[CONF_LONGITUDE]
            )
            try:
                locations = await self.client.get_forecast_locations()
            except BomError as err:
                _LOGGER.debug("Error fetching forecast locations: %s", err)
                errors["base"] = "cannot_connect"
            else:
                nearest = BomClient.nearest(home, locations, limit=LOCATION_CHOICES)
                self._towns = {town.aac: town for town, _ in nearest}
                self._town_options = [
                    SelectOptionDict(
                        value=town.aac,
                        label=f"{town.name}, {town.state} ({distance:g} km)",
                    )
                    for town, distance in nearest
                ]
                return await self.async_step_town()

        default = {
            CONF_LATITUDE: self.hass.config.latitude,
            CONF_LONGITUDE: self.hass.config.longitude,
        }
        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_LOCATION, default=default): LocationSelector(
                        LocationSelectorConfig(radius=False)
                    )
                }
            ),
            errors=errors,
        )

    async def async_step_town(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Choose the BoM forecast town."""
        errors: dict[str, str] = {}
        if user_input is not None:
            town = self._towns[user_input[CONF_LOCATION_AAC]]
            await self.async_set_unique_id(town.aac)
            self._abort_if_unique_id_configured()
            self._town = town
            try:
                await self._load_stations(town)
            except BomError as err:
                _LOGGER.debug("Error fetching stations: %s", err)
                errors["base"] = "cannot_connect"
            else:
                return await self.async_step_station()

        return self.async_show_form(
            step_id="town",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_LOCATION_AAC, default=self._town_options[0]["value"]
                    ): _select(self._town_options)
                }
            ),
            errors=errors,
        )

    async def _load_stations(self, town: ForecastLocation) -> None:
        stations = await self.client.get_stations(town.product_state)
        # List stations with complete observations first: the nearest
        # station is often a beacon or portable unit that only reports part
        # of an observation. Stations reporting nothing are left out.
        nearest = BomClient.nearest(
            town.coordinate,
            (station for station in stations if station.observes),
            limit=STATION_CHOICES * 2,
        )
        ranked = sorted(
            nearest,
            key=lambda pair: (
                not pair[0].observes.issuperset(CORE_MEASUREMENTS),
                pair[1],
            ),
        )[:STATION_CHOICES]
        self._stations = {station.id: station for station, _ in ranked}
        self._station_options = [
            SelectOptionDict(value=station.id, label=_station_label(station, distance))
            for station, distance in ranked
        ]

    async def _validate_station(self, station: Station) -> str | None:
        """Return an error key if the station is not reporting."""
        assert self._town is not None
        try:
            await self.client.get_observation(self._town.product_state, station.id)
        except BomNotFoundError:
            return "station_unavailable"
        except BomError as err:
            _LOGGER.debug("Error fetching observation: %s", err)
            return "cannot_connect"
        return None

    def _station_schema(self, default: str | None = None) -> vol.Schema:
        return vol.Schema(
            {
                vol.Required(
                    CONF_STATION_ID,
                    default=default or self._station_options[0]["value"],
                ): _select(self._station_options)
            }
        )

    async def async_step_station(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Choose the observation station."""
        errors: dict[str, str] = {}
        if not self._stations:
            return self.async_abort(reason="no_stations")
        if user_input is not None:
            station = self._stations[user_input[CONF_STATION_ID]]
            if not (error := await self._validate_station(station)):
                town = self._town
                assert town is not None
                return self.async_create_entry(
                    title=town.name,
                    data={
                        CONF_LOCATION_AAC: town.aac,
                        CONF_LOCATION_NAME: town.name,
                        CONF_LOCATION_STATE: town.state,
                        CONF_LATITUDE: town.coordinate.latitude,
                        CONF_LONGITUDE: town.coordinate.longitude,
                        CONF_TIMEZONE: town.timezone,
                        CONF_STATION_ID: station.id,
                        CONF_STATION_NAME: station.name,
                    },
                    options={CONF_FORECAST_DAYS: DEFAULT_FORECAST_DAYS},
                )
            errors["base"] = error

        assert self._town is not None
        return self.async_show_form(
            step_id="station",
            data_schema=self._station_schema(),
            description_placeholders={"location": self._town.name},
            errors=errors,
        )

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Choose a different observation station."""
        entry = self._get_reconfigure_entry()
        errors: dict[str, str] = {}
        if self._town is None:
            self._town = location_from_entry(entry)
            try:
                await self._load_stations(self._town)
            except BomError as err:
                _LOGGER.debug("Error fetching stations: %s", err)
                return self.async_abort(reason="cannot_connect")
            if not self._stations:
                return self.async_abort(reason="no_stations")

        if user_input is not None:
            station = self._stations[user_input[CONF_STATION_ID]]
            if not (error := await self._validate_station(station)):
                return self.async_update_reload_and_abort(
                    entry,
                    data_updates={
                        CONF_STATION_ID: station.id,
                        CONF_STATION_NAME: station.name,
                    },
                )
            errors["base"] = error

        current = entry.data[CONF_STATION_ID]
        return self.async_show_form(
            step_id="reconfigure",
            data_schema=self._station_schema(
                current if current in self._stations else None
            ),
            description_placeholders={"location": self._town.name},
            errors=errors,
        )


class BomOptionsFlow(OptionsFlowWithReload):
    """Handle options for the Bureau of Meteorology."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Manage the options."""
        if user_input is not None:
            return self.async_create_entry(
                data={CONF_FORECAST_DAYS: int(user_input[CONF_FORECAST_DAYS])}
            )
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_FORECAST_DAYS,
                        default=self.config_entry.options.get(
                            CONF_FORECAST_DAYS, DEFAULT_FORECAST_DAYS
                        ),
                    ): NumberSelector(
                        NumberSelectorConfig(
                            min=0,
                            max=MAX_FORECAST_DAYS,
                            step=1,
                            mode=NumberSelectorMode.SLIDER,
                        )
                    )
                }
            ),
        )
