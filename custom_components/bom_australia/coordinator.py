"""Data update coordinators for the Bureau of Meteorology integration."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass, replace
from datetime import date, datetime, timedelta, timezone
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
from open_meteo import (
    DailyParameters,
    HourlyParameters as Hourly,
    OpenMeteo,
    OpenMeteoError,
    OpenMeteoRateLimitError,
)

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_LATITUDE, CONF_LONGITUDE
from homeassistant.core import CALLBACK_TYPE, callback
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.update_coordinator import (
    TimestampDataUpdateCoordinator,
    UpdateFailed,
)
from homeassistant.util import dt as dt_util

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
    OPEN_METEO_FORECAST_DAYS,
    OPEN_METEO_INTERVAL,
    OPEN_METEO_MODEL,
    WARNINGS_INTERVAL,
)

if TYPE_CHECKING:
    from collections.abc import Callable

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
    open_meteo: OpenMeteoCoordinator | None = None
    hourly_source: HourlySourceCoordinator | None = None


def is_fresh(coordinator: TimestampDataUpdateCoordinator[Any]) -> bool:
    """Return whether a coordinator has recent, successful data.

    Data stays usable for two update intervals, so a poll that is a little late
    does not make it disappear.
    """
    last = coordinator.last_update_success_time
    interval = coordinator.update_interval or timedelta(0)
    return (
        coordinator.last_update_success
        and coordinator.data is not None
        and last is not None
        and dt_util.utcnow() - last < 2 * interval
    )


class AttemptTracking:
    """When a source last tried to update, and until when it must wait.

    Home Assistant only records successful updates. A source that is refreshed
    on demand also needs its last attempt, so a failing source is not asked
    again before its interval, and an honoured Retry-After.
    """

    last_attempt_time: datetime | None = None
    retry_until: datetime | None = None

    def _note_attempt(self) -> None:
        self.last_attempt_time = dt_util.utcnow()
        self.retry_until = None

    def _note_retry_after(self, retry_after: float | None) -> None:
        if retry_after:
            self.retry_until = dt_util.utcnow() + timedelta(seconds=retry_after)


def is_due(coordinator: AttemptTracking, interval: timedelta) -> bool:
    """Return whether a source may be refreshed on demand now."""
    now = dt_util.utcnow()
    if coordinator.retry_until is not None and now < coordinator.retry_until:
        return False
    last = coordinator.last_attempt_time
    return last is None or now - last >= interval


class BomCoordinator[DataT](AttemptTracking, TimestampDataUpdateCoordinator[DataT]):
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
        self._note_attempt()
        try:
            return await self._fetch()
        except BomRateLimitError as err:
            self._note_retry_after(err.retry_after)
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


@dataclass(frozen=True, slots=True, kw_only=True)
class OpenMeteoHour:
    """One hour of the Open-Meteo forecast."""

    time: datetime
    weather_code: int | None
    is_day: bool | None
    temperature: float | None
    apparent_temperature: float | None
    dew_point: float | None
    humidity: float | None
    precipitation: float | None
    precipitation_probability: int | None
    wind_speed: float | None
    wind_gust: float | None
    wind_bearing: float | None
    uv_index: float | None


@dataclass(frozen=True, slots=True, kw_only=True)
class OpenMeteoDay:
    """One day of the Open-Meteo forecast."""

    date: date
    start: datetime
    weather_code: int | None
    temp_max: float | None
    temp_min: float | None
    precipitation: float | None
    precipitation_probability: int | None
    wind_speed: float | None
    wind_gust: float | None
    wind_bearing: float | None
    uv_index: float | None


@dataclass(frozen=True, slots=True, kw_only=True)
class OpenMeteoForecast:
    """Hourly and daily forecast from Open-Meteo, in the location's timezone."""

    model: str
    hours: list[OpenMeteoHour]
    days: list[OpenMeteoDay]


HOURLY_PARAMETERS = [
    Hourly.TEMPERATURE_2M,
    Hourly.APPARENT_TEMPERATURE,
    Hourly.DEW_POINT_2M,
    Hourly.RELATIVE_HUMIDITY_2M,
    Hourly.PRECIPITATION,
    Hourly.PRECIPITATION_PROBABILITY,
    Hourly.WEATHER_CODE,
    Hourly.WIND_SPEED_10M,
    Hourly.WIND_GUSTS_10M,
    Hourly.WIND_DIRECTION_10M,
    Hourly.UV_INDEX,
    Hourly.IS_DAY,
]
DAILY_PARAMETERS = [
    DailyParameters.WEATHER_CODE,
    DailyParameters.TEMPERATURE_2M_MAX,
    DailyParameters.TEMPERATURE_2M_MIN,
    DailyParameters.PRECIPITATION_SUM,
    DailyParameters.PRECIPITATION_PROBABILITY_MAX,
    DailyParameters.WIND_SPEED_10M_MAX,
    DailyParameters.WIND_GUSTS_10M_MAX,
    DailyParameters.WIND_DIRECTION_10M_DOMINANT,
    DailyParameters.UV_INDEX_MAX,
]


FOG_CODES = frozenset({45, 48})


def _daytime_code(hours: list[OpenMeteoHour], day: date) -> int | None:
    """Return the most common daytime weather code of a day's hours."""
    codes = [
        hour.weather_code
        for hour in hours
        if hour.time.date() == day and hour.is_day and hour.weather_code is not None
    ]
    if not codes:
        return None
    return max(set(codes), key=lambda code: (codes.count(code), code))


def _daily_code(code: int | None, hours: list[OpenMeteoHour], day: date) -> int | None:
    """Return a day's weather code.

    Open-Meteo's daily code is the most severe code of any hour, so a little
    early-morning fog labels a hot, clear day as foggy. Fog days use the most
    common daytime code instead.
    """
    if code in FOG_CODES and (daytime := _daytime_code(hours, day)) is not None:
        return daytime
    return code


def _at[T](values: list[T | None] | None, index: int) -> T | None:
    """Return a value from an optional Open-Meteo series."""
    if values is None or index >= len(values):
        return None
    return values[index]


class OpenMeteoCoordinator(
    AttemptTracking, TimestampDataUpdateCoordinator[OpenMeteoForecast]
):
    """Optional secondary forecast from Open-Meteo (ECMWF IFS).

    Used to extend the daily forecast past BoM's seven days and to fill the
    hourly forecast when the BoM app API is unavailable. It never makes the
    integration fail: errors only leave this coordinator without data.
    """

    config_entry: BomConfigEntry

    def __init__(
        self,
        hass: HomeAssistant,
        config_entry: BomConfigEntry,
        location: ForecastLocation,
    ) -> None:
        """Initialise the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            config_entry=config_entry,
            name=f"{DOMAIN} open_meteo {location.name}",
            update_interval=OPEN_METEO_INTERVAL,
        )
        self.location = location
        self.client = OpenMeteo(session=async_get_clientsession(hass))

    @override
    async def _async_update_data(self) -> OpenMeteoForecast:
        self._note_attempt()
        coordinate = self.location.coordinate
        try:
            forecast = await self.client.forecast(
                latitude=coordinate.latitude,
                longitude=coordinate.longitude,
                timezone=self.location.timezone or "auto",
                models=[OPEN_METEO_MODEL],
                hourly=HOURLY_PARAMETERS,
                daily=DAILY_PARAMETERS,
                forecast_days=OPEN_METEO_FORECAST_DAYS,
            )
        except OpenMeteoRateLimitError as err:
            self._note_retry_after(err.retry_after)
            raise UpdateFailed(
                translation_domain=DOMAIN,
                translation_key="open_meteo_rate_limited",
                retry_after=err.retry_after,
            ) from err
        except OpenMeteoError as err:
            raise UpdateFailed(
                translation_domain=DOMAIN,
                translation_key="open_meteo_failed",
                translation_placeholders={"error": str(err)},
            ) from err

        # Open-Meteo returns times without an offset. They are UTC shifted by
        # the response's utc_offset_seconds, one fixed offset for the whole
        # response even across a daylight saving change, so they are read with
        # that offset and then converted to the location's timezone.
        offset = timezone(timedelta(seconds=forecast.utc_offset_seconds))
        tz = await dt_util.async_get_time_zone(forecast.timezone)
        if tz is None:
            raise UpdateFailed(
                translation_domain=DOMAIN,
                translation_key="open_meteo_failed",
                translation_placeholders={
                    "error": f"unknown timezone {forecast.timezone}"
                },
            )
        hours: list[OpenMeteoHour] = []
        if (hourly := forecast.hourly) is not None:
            hours = [
                OpenMeteoHour(
                    time=time.replace(tzinfo=offset).astimezone(tz),
                    weather_code=_at(hourly.weather_code, i),
                    is_day=_at(hourly.is_day, i),
                    temperature=_at(hourly.temperature_2m, i),
                    apparent_temperature=_at(hourly.apparent_temperature, i),
                    dew_point=_at(hourly.dew_point_2m, i),
                    humidity=_at(hourly.relative_humidity_2m, i),
                    precipitation=_at(hourly.precipitation, i),
                    precipitation_probability=_at(hourly.precipitation_probability, i),
                    wind_speed=_at(hourly.wind_speed_10m, i),
                    wind_gust=_at(hourly.wind_gusts_10m, i),
                    wind_bearing=_at(hourly.wind_direction_10m, i),
                    uv_index=_at(hourly.uv_index, i),
                )
                for i, time in enumerate(hourly.time)
            ]
        days: list[OpenMeteoDay] = []
        if (daily := forecast.daily) is not None:
            days = [
                OpenMeteoDay(
                    date=day,
                    start=datetime.combine(day, datetime.min.time(), tz),
                    weather_code=_daily_code(_at(daily.weather_code, i), hours, day),
                    temp_max=_at(daily.temperature_2m_max, i),
                    temp_min=_at(daily.temperature_2m_min, i),
                    precipitation=_at(daily.precipitation_sum, i),
                    precipitation_probability=_at(
                        daily.precipitation_probability_max, i
                    ),
                    wind_speed=_at(daily.wind_speed_10m_max, i),
                    wind_gust=_at(daily.wind_gusts_10m_max, i),
                    wind_bearing=_at(daily.wind_direction_10m_dominant, i),
                    uv_index=_at(daily.uv_index_max, i),
                )
                for i, day in enumerate(daily.time)
                # The model's last day can be empty (IFS runs 15 days).
                if _at(daily.temperature_2m_max, i) is not None
            ]
        return OpenMeteoForecast(model=OPEN_METEO_MODEL, hours=hours, days=days)


@dataclass(frozen=True, slots=True)
class HourlySource:
    """The hourly forecast to show: BoM's, or Open-Meteo's when BoM has none."""

    bom: HourlyForecast | None = None
    open_meteo: list[OpenMeteoHour] | None = None


class HourlySourceCoordinator(TimestampDataUpdateCoordinator[HourlySource]):
    """Chooses the hourly forecast source when Open-Meteo is enabled.

    The weather entity uses this as its hourly coordinator, so Home Assistant's
    on-demand refresh and expiry checks apply to the fallback as well. It does
    no I/O itself: an update refreshes whichever source is due, through the
    sources' debounced refresh requests, and picks BoM's forecast when it is
    fresh, otherwise Open-Meteo's. While it has listeners it passes on updates
    of either source; without listeners it does not keep the sources polling.
    """

    config_entry: BomConfigEntry

    def __init__(
        self,
        hass: HomeAssistant,
        config_entry: BomConfigEntry,
        bom: BomHourlyForecastCoordinator,
        open_meteo: OpenMeteoCoordinator,
    ) -> None:
        """Initialise the coordinator."""
        super().__init__(
            hass,
            _LOGGER,
            config_entry=config_entry,
            name=f"{DOMAIN} hourly_source {bom.location.name}",
            update_interval=FORECAST_INTERVAL,
        )
        self.bom = bom
        self.open_meteo = open_meteo
        self._unsub_sources: list[CALLBACK_TYPE] = []
        self._refresh_sources_lock = asyncio.Lock()

    def current(self) -> HourlySource | None:
        """Return the hourly forecast to show now, judged on the sources' age.

        Checked on every read, so cached data never outlives its source.
        """
        if is_fresh(self.bom):
            return HourlySource(bom=self.bom.data)
        if is_fresh(self.open_meteo):
            return HourlySource(open_meteo=self.open_meteo.data.hours)
        return None

    @override
    async def _async_update_data(self) -> HourlySource:
        # One refresh at a time, and each source only when it is due: not while
        # its own poll is running (that counts as an attempt), not again within
        # its interval after a failure, and not before a Retry-After has passed.
        # The refresh is awaited, so the choice below sees its result.
        async with self._refresh_sources_lock:
            if is_due(self.bom, FORECAST_INTERVAL):
                await self.bom.async_refresh()
            if not is_fresh(self.bom) and is_due(self.open_meteo, OPEN_METEO_INTERVAL):
                await self.open_meteo.async_refresh()
        if (source := self.current()) is None:
            raise UpdateFailed(
                translation_domain=DOMAIN,
                translation_key="hourly_forecast_unavailable",
            )
        return source

    @callback
    @override
    def async_add_listener(
        self, update_callback: CALLBACK_TYPE, context: Any = None
    ) -> Callable[[], None]:
        remove = super().async_add_listener(update_callback, context)
        if not self._unsub_sources:
            self._unsub_sources = [
                source.async_add_listener(self._async_source_updated)
                for source in (self.bom, self.open_meteo)
            ]

        @callback
        def remove_listener() -> None:
            remove()
            if not self._listeners:
                for unsub in self._unsub_sources:
                    unsub()
                self._unsub_sources = []

        return remove_listener

    @callback
    def _async_source_updated(self) -> None:
        """Pass on an update of either source."""
        if (source := self.current()) is not None:
            # async_set_updated_data does not stamp the time, and without it
            # the weather entity would refresh this coordinator again.
            self.last_update_success_time = dt_util.utcnow()
            self.async_set_updated_data(source)
        else:
            self.async_set_update_error(
                UpdateFailed(
                    translation_domain=DOMAIN,
                    translation_key="hourly_forecast_unavailable",
                )
            )


def diagnostics_data(
    coordinator: TimestampDataUpdateCoordinator[Any],
) -> dict[str, Any]:
    """Return a coordinator's state for diagnostics."""
    return {
        "last_update_success": coordinator.last_update_success,
        "last_update_success_time": coordinator.last_update_success_time,
        "last_exception": repr(coordinator.last_exception)
        if coordinator.last_exception
        else None,
    }
