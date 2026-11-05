"""Weather entity for the Bureau of Meteorology integration."""

from __future__ import annotations

from datetime import datetime, time, timedelta
from typing import TYPE_CHECKING, override

from bom_weather_api import (
    DailyForecastDay,
    HourlyForecast,
    HourlyForecastPoint,
    Observation,
)

from homeassistant.components.weather import (
    ATTR_CONDITION_CLEAR_NIGHT,
    ATTR_CONDITION_SUNNY,
    CoordinatorWeatherEntity,
    Forecast,
    WeatherEntityFeature,
)
from homeassistant.const import (
    UnitOfPrecipitationDepth,
    UnitOfPressure,
    UnitOfSpeed,
    UnitOfTemperature,
)
from homeassistant.core import callback
from homeassistant.helpers import sun
from homeassistant.util import dt as dt_util

from .const import (
    ATTRIBUTION,
    ATTRIBUTION_OPEN_METEO,
    CONDITION_MAP,
    CURRENT_HOUR_TOLERANCE,
    WMO_CONDITION_MAP,
)
from .coordinator import (
    BomConfigEntry,
    BomDailyForecastCoordinator,
    BomHourlyForecastCoordinator,
    BomObservationCoordinator,
    HourlySourceCoordinator,
    OpenMeteoCoordinator,
    OpenMeteoDay,
    OpenMeteoForecast,
    OpenMeteoHour,
    is_fresh,
)
from .entity import device_info

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

PARALLEL_UPDATES = 0


def map_condition(descriptor: str | None, *, is_night: bool | None) -> str | None:
    """Map a BoM icon descriptor to a Home Assistant condition."""
    if descriptor is None or (condition := CONDITION_MAP.get(descriptor)) is None:
        return None
    if condition == ATTR_CONDITION_SUNNY and is_night:
        return ATTR_CONDITION_CLEAR_NIGHT
    if condition == ATTR_CONDITION_CLEAR_NIGHT and is_night is False:
        return ATTR_CONDITION_SUNNY
    return condition


def map_wmo_condition(code: int | None, *, is_night: bool | None) -> str | None:
    """Map an Open-Meteo WMO weather code to a Home Assistant condition."""
    if code is None or (condition := WMO_CONDITION_MAP.get(code)) is None:
        return None
    if condition == ATTR_CONDITION_SUNNY and is_night:
        return ATTR_CONDITION_CLEAR_NIGHT
    return condition


def open_meteo_daily(day: OpenMeteoDay) -> Forecast:
    """Return an Open-Meteo day as a Home Assistant forecast."""
    return Forecast(
        datetime=day.start.isoformat(),
        condition=map_wmo_condition(day.weather_code, is_night=False),
        native_temperature=day.temp_max,
        native_templow=day.temp_min,
        native_precipitation=day.precipitation,
        precipitation_probability=day.precipitation_probability,
        native_wind_speed=day.wind_speed,
        native_wind_gust_speed=day.wind_gust,
        wind_bearing=day.wind_bearing,
        uv_index=day.uv_index,
    )


def open_meteo_hourly(hour: OpenMeteoHour) -> Forecast:
    """Return an Open-Meteo hour as a Home Assistant forecast."""
    return Forecast(
        datetime=hour.time.isoformat(),
        condition=map_wmo_condition(
            hour.weather_code,
            is_night=None if hour.is_day is None else not hour.is_day,
        ),
        native_temperature=hour.temperature,
        native_apparent_temperature=hour.apparent_temperature,
        native_dew_point=hour.dew_point,
        humidity=hour.humidity,
        native_precipitation=hour.precipitation,
        precipitation_probability=hour.precipitation_probability,
        native_wind_speed=hour.wind_speed,
        native_wind_gust_speed=hour.wind_gust,
        wind_bearing=hour.wind_bearing,
        uv_index=hour.uv_index,
    )


async def async_setup_entry(
    hass: HomeAssistant,
    entry: BomConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the weather entity."""
    async_add_entities([BomWeather(entry)])


class BomWeather(
    CoordinatorWeatherEntity[
        BomObservationCoordinator,
        BomDailyForecastCoordinator,
        BomHourlyForecastCoordinator | HourlySourceCoordinator,
        BomDailyForecastCoordinator,
    ]
):
    """Current conditions and forecasts for a BoM forecast town."""

    _attr_attribution = ATTRIBUTION
    _attr_has_entity_name = True
    _attr_name = None
    _attr_native_temperature_unit = UnitOfTemperature.CELSIUS
    _attr_native_precipitation_unit = UnitOfPrecipitationDepth.MILLIMETERS
    _attr_native_pressure_unit = UnitOfPressure.HPA
    _attr_native_wind_speed_unit = UnitOfSpeed.KILOMETERS_PER_HOUR
    _attr_supported_features = (
        WeatherEntityFeature.FORECAST_DAILY | WeatherEntityFeature.FORECAST_HOURLY
    )

    def __init__(self, entry: BomConfigEntry) -> None:
        """Initialise the weather entity."""
        runtime = entry.runtime_data
        self._open_meteo: OpenMeteoCoordinator | None = runtime.open_meteo
        self._hourly_source: HourlySourceCoordinator | None = runtime.hourly_source
        super().__init__(
            runtime.observation,
            daily_coordinator=runtime.daily,
            # With Open-Meteo enabled, the hourly source coordinator falls back
            # to Open-Meteo while BoM's hourly forecast is unavailable.
            hourly_coordinator=self._hourly_source or runtime.hourly,
        )
        self._daily = runtime.daily
        self._hourly = runtime.hourly
        self._attr_unique_id = entry.unique_id
        self._attr_device_info = device_info(entry)
        if self._open_meteo is not None:
            self._attr_attribution = ATTRIBUTION_OPEN_METEO

    @override
    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        if self._open_meteo is not None:
            # New Open-Meteo days extend the daily forecast.
            self.async_on_remove(
                self._open_meteo.async_add_listener(self._push_daily_forecast)
            )

    @callback
    def _push_daily_forecast(self) -> None:
        """Send the extended daily forecast to subscribers."""
        self._daily.config_entry.async_create_task(
            self.hass, self.async_update_listeners(("daily",))
        )

    @property
    def _open_meteo_data(self) -> OpenMeteoForecast | None:
        """Return current Open-Meteo data, requesting a refresh when stale."""
        if self._open_meteo is None:
            return None
        if not is_fresh(self._open_meteo):
            # Leave the extension out until fresh data arrives. Old data after a
            # successful update means polling is off: ask for a refresh. After a
            # failure the coordinator retries itself, honouring Retry-After.
            if self._open_meteo.last_update_success:
                self._open_meteo.config_entry.async_create_task(
                    self.hass, self._open_meteo.async_request_refresh()
                )
            return None
        return self._open_meteo.data

    @property
    def _observation(self) -> Observation:
        return self.coordinator.data

    @property
    def _today(self) -> DailyForecastDay | None:
        forecast = self._daily.data
        return forecast.days[0] if forecast and forecast.days else None

    def _current_hour(self, now: datetime) -> HourlyForecastPoint | None:
        if not self._hourly.last_update_success or not self._hourly.data:
            return None
        past = [hour for hour in self._hourly.data.hours if hour.time <= now]
        if past and now - past[-1].time <= CURRENT_HOUR_TOLERANCE:
            return past[-1]
        return None

    @property
    @override
    def condition(self) -> str | None:
        # Prefer the current hour's forecast icon, falling back to today's
        # town forecast. BoM regularly omits the day-0 icon late in the
        # evening, in which case the condition is unknown rather than guessed.
        now = dt_util.utcnow()
        if (hour := self._current_hour(now)) and hour.icon_descriptor:
            is_night = hour.is_night
            if is_night is None:
                is_night = not sun.is_up(self.hass, now)
            return map_condition(hour.icon_descriptor, is_night=is_night)
        if (today := self._today) is not None:
            return map_condition(
                today.icon_descriptor, is_night=not sun.is_up(self.hass, now)
            )
        return None

    @property
    @override
    def native_temperature(self) -> float | None:
        return self._observation.temperature

    @property
    @override
    def native_apparent_temperature(self) -> float | None:
        return self._observation.apparent_temperature

    @property
    @override
    def native_dew_point(self) -> float | None:
        return self._observation.dew_point

    @property
    @override
    def humidity(self) -> float | None:
        return self._observation.humidity

    @property
    @override
    def native_pressure(self) -> float | None:
        return self._observation.pressure

    @property
    @override
    def native_wind_speed(self) -> float | None:
        return self._observation.wind_speed

    @property
    @override
    def native_wind_gust_speed(self) -> float | None:
        return self._observation.wind_gust

    @property
    @override
    def wind_bearing(self) -> float | None:
        return self._observation.wind_bearing

    @property
    @override
    def native_visibility(self) -> float | None:
        return self._observation.visibility

    @property
    @override
    def uv_index(self) -> float | None:
        if (hour := self._current_hour(dt_util.utcnow())) is not None:
            return hour.uv_index
        return None

    @callback
    @override
    def _async_forecast_daily(self) -> list[Forecast] | None:
        if not self._daily.data:
            return None
        forecast = [
            Forecast(
                # Day 0 starts at the issue time; report every day from local midnight.
                datetime=datetime.combine(
                    day.date, time.min, day.start.tzinfo
                ).isoformat(),
                condition=map_condition(day.icon_descriptor, is_night=False),
                native_temperature=day.temp_max,
                native_templow=day.temp_min,
                native_precipitation=day.rain_amount_max,
                precipitation_probability=day.rain_chance,
                uv_index=day.uv_index,
            )
            for day in self._daily.data.days
        ]
        # Extend BoM's seven days with the Open-Meteo days that follow them.
        if (secondary := self._open_meteo_data) is not None:
            last = max((day.date for day in self._daily.data.days), default=None)
            forecast.extend(
                open_meteo_daily(day)
                for day in secondary.days
                if last is None or day.date > last
            )
        return forecast

    @callback
    @override
    def _async_forecast_hourly(self) -> list[Forecast] | None:
        start = dt_util.utcnow() - timedelta(hours=1)
        hourly: HourlyForecast | None = self._hourly.data
        if self._hourly_source is not None:
            # Judged now, not from the cached choice, so expired data is never
            # served.
            if (source := self._hourly_source.current()) is None:
                return None
            if source.open_meteo is not None:
                return [
                    open_meteo_hourly(hour)
                    for hour in source.open_meteo
                    if hour.time > start
                ]
            hourly = source.bom
        if not hourly:
            return None
        return [
            Forecast(
                datetime=hour.time.isoformat(),
                condition=map_condition(hour.icon_descriptor, is_night=hour.is_night),
                native_temperature=hour.temperature,
                native_apparent_temperature=hour.apparent_temperature,
                native_dew_point=hour.dew_point,
                humidity=hour.humidity,
                native_precipitation=hour.rain_amount_max,
                precipitation_probability=hour.rain_chance,
                native_wind_speed=hour.wind_speed,
                native_wind_gust_speed=hour.wind_gust,
                wind_bearing=hour.wind_bearing,
                uv_index=hour.uv_index,
            )
            for hour in hourly.hours
            if hour.time > start
        ]
