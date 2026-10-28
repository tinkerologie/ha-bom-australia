"""Sensors for the Bureau of Meteorology integration."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
import re
from typing import TYPE_CHECKING, Any, override

from bom_weather_api import (
    DailyForecast,
    DailyForecastDay,
    NowForecast,
    Observation,
    WeatherWarning,
)

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
    SensorStateClass,
)
from homeassistant.const import (
    DEGREE,
    PERCENTAGE,
    UV_INDEX,
    Platform,
    UnitOfLength,
    UnitOfPrecipitationDepth,
    UnitOfPressure,
    UnitOfSpeed,
    UnitOfTemperature,
)
from homeassistant.core import callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity import EntityCategory

from .const import (
    CONF_FORECAST_DAYS,
    DEFAULT_FORECAST_DAYS,
    MAX_STATE_LENGTH,
    MAX_WARNING_MESSAGE_LENGTH,
)
from .coordinator import (
    BomConfigEntry,
    BomCoordinator,
    BomDailyForecastCoordinator,
    BomObservationCoordinator,
    BomWarningsCoordinator,
)
from .entity import BomEntity

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

PARALLEL_UPDATES = 0

UV_CATEGORIES = ["low", "moderate", "high", "very_high", "extreme"]
_DAY_UNIQUE_ID = re.compile(r"_day(\d+)_")


def _truncate(value: str | None) -> str | None:
    if value is None or len(value) <= MAX_STATE_LENGTH:
        return value
    return value[: MAX_STATE_LENGTH - 1] + "…"


@dataclass(frozen=True, kw_only=True)
class BomObservationSensorDescription(SensorEntityDescription):
    """Describes an observation sensor."""

    value_fn: Callable[[Observation], Any]
    attributes_fn: Callable[[Observation], dict[str, Any]] | None = None


@dataclass(frozen=True, kw_only=True)
class BomForecastSensorDescription(SensorEntityDescription):
    """Describes a daily forecast sensor (one entity per forecast day)."""

    value_fn: Callable[[DailyForecastDay], Any]
    long_text: bool = False


@dataclass(frozen=True, kw_only=True)
class BomNowSensorDescription(SensorEntityDescription):
    """Describes a "now and later" sensor."""

    value_fn: Callable[[NowForecast], Any]


def _time_attribute(value: datetime | None) -> dict[str, Any]:
    return {"time": value.isoformat()} if value else {}


OBSERVATION_SENSORS: tuple[BomObservationSensorDescription, ...] = (
    BomObservationSensorDescription(
        key="temperature",
        device_class=SensorDeviceClass.TEMPERATURE,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=lambda obs: obs.temperature,
    ),
    BomObservationSensorDescription(
        key="apparent_temperature",
        translation_key="apparent_temperature",
        device_class=SensorDeviceClass.TEMPERATURE,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=lambda obs: obs.apparent_temperature,
    ),
    BomObservationSensorDescription(
        key="dew_point",
        translation_key="dew_point",
        device_class=SensorDeviceClass.TEMPERATURE,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=lambda obs: obs.dew_point,
    ),
    BomObservationSensorDescription(
        key="humidity",
        device_class=SensorDeviceClass.HUMIDITY,
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=lambda obs: obs.humidity,
    ),
    BomObservationSensorDescription(
        key="pressure",
        device_class=SensorDeviceClass.ATMOSPHERIC_PRESSURE,
        native_unit_of_measurement=UnitOfPressure.HPA,
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=lambda obs: obs.pressure,
    ),
    BomObservationSensorDescription(
        key="wind_speed",
        device_class=SensorDeviceClass.WIND_SPEED,
        native_unit_of_measurement=UnitOfSpeed.KILOMETERS_PER_HOUR,
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=lambda obs: obs.wind_speed,
    ),
    BomObservationSensorDescription(
        key="wind_gust",
        translation_key="wind_gust",
        device_class=SensorDeviceClass.WIND_SPEED,
        native_unit_of_measurement=UnitOfSpeed.KILOMETERS_PER_HOUR,
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=lambda obs: obs.wind_gust,
    ),
    BomObservationSensorDescription(
        key="wind_gust_max",
        translation_key="wind_gust_max",
        device_class=SensorDeviceClass.WIND_SPEED,
        native_unit_of_measurement=UnitOfSpeed.KILOMETERS_PER_HOUR,
        entity_registry_enabled_default=False,
        value_fn=lambda obs: obs.wind_gust_max,
        attributes_fn=lambda obs: _time_attribute(obs.wind_gust_max_at),
    ),
    BomObservationSensorDescription(
        key="wind_direction",
        translation_key="wind_direction",
        value_fn=lambda obs: obs.wind_direction,
    ),
    BomObservationSensorDescription(
        key="wind_bearing",
        translation_key="wind_bearing",
        device_class=SensorDeviceClass.WIND_DIRECTION,
        native_unit_of_measurement=DEGREE,
        state_class=SensorStateClass.MEASUREMENT_ANGLE,
        entity_registry_enabled_default=False,
        value_fn=lambda obs: obs.wind_bearing,
    ),
    BomObservationSensorDescription(
        key="rain_since_9am",
        translation_key="rain_since_9am",
        device_class=SensorDeviceClass.PRECIPITATION,
        native_unit_of_measurement=UnitOfPrecipitationDepth.MILLIMETERS,
        state_class=SensorStateClass.TOTAL_INCREASING,
        suggested_display_precision=1,
        value_fn=lambda obs: obs.rain_since_9am,
    ),
    BomObservationSensorDescription(
        key="rain_24h",
        translation_key="rain_24h",
        device_class=SensorDeviceClass.PRECIPITATION,
        native_unit_of_measurement=UnitOfPrecipitationDepth.MILLIMETERS,
        suggested_display_precision=1,
        entity_registry_enabled_default=False,
        value_fn=lambda obs: obs.rain_24h,
    ),
    BomObservationSensorDescription(
        key="temp_max",
        translation_key="observed_temp_max",
        device_class=SensorDeviceClass.TEMPERATURE,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        entity_registry_enabled_default=False,
        value_fn=lambda obs: obs.temp_max,
        attributes_fn=lambda obs: _time_attribute(obs.temp_max_at),
    ),
    BomObservationSensorDescription(
        key="temp_min",
        translation_key="observed_temp_min",
        device_class=SensorDeviceClass.TEMPERATURE,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        entity_registry_enabled_default=False,
        value_fn=lambda obs: obs.temp_min,
        attributes_fn=lambda obs: _time_attribute(obs.temp_min_at),
    ),
    BomObservationSensorDescription(
        key="delta_t",
        translation_key="delta_t",
        device_class=SensorDeviceClass.TEMPERATURE_DELTA,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        state_class=SensorStateClass.MEASUREMENT,
        entity_registry_enabled_default=False,
        value_fn=lambda obs: obs.delta_t,
    ),
    BomObservationSensorDescription(
        key="visibility",
        translation_key="visibility",
        device_class=SensorDeviceClass.DISTANCE,
        native_unit_of_measurement=UnitOfLength.KILOMETERS,
        state_class=SensorStateClass.MEASUREMENT,
        entity_registry_enabled_default=False,
        value_fn=lambda obs: obs.visibility,
    ),
    BomObservationSensorDescription(
        key="cloud_oktas",
        translation_key="cloud_oktas",
        state_class=SensorStateClass.MEASUREMENT,
        entity_registry_enabled_default=False,
        value_fn=lambda obs: obs.cloud_oktas,
    ),
    BomObservationSensorDescription(
        key="observed_at",
        translation_key="observed_at",
        device_class=SensorDeviceClass.TIMESTAMP,
        entity_category=EntityCategory.DIAGNOSTIC,
        value_fn=lambda obs: obs.observed_at,
        attributes_fn=lambda obs: {
            "station_id": obs.station_id,
            "station_name": obs.station_name,
        },
    ),
)

FORECAST_SENSORS: tuple[BomForecastSensorDescription, ...] = (
    BomForecastSensorDescription(
        key="temp_max",
        translation_key="temp_max",
        device_class=SensorDeviceClass.TEMPERATURE,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=lambda day: day.temp_max,
    ),
    BomForecastSensorDescription(
        key="temp_min",
        translation_key="temp_min",
        device_class=SensorDeviceClass.TEMPERATURE,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        value_fn=lambda day: day.temp_min,
    ),
    BomForecastSensorDescription(
        key="short_text",
        translation_key="short_text",
        value_fn=lambda day: day.short_text,
    ),
    BomForecastSensorDescription(
        key="extended_text",
        translation_key="extended_text",
        value_fn=lambda day: day.extended_text,
        long_text=True,
    ),
    BomForecastSensorDescription(
        key="rain_chance",
        translation_key="rain_chance",
        native_unit_of_measurement=PERCENTAGE,
        value_fn=lambda day: day.rain_chance,
    ),
    BomForecastSensorDescription(
        key="rain_amount_range",
        translation_key="rain_amount_range",
        value_fn=lambda day: day.rain_amount_range,
    ),
    BomForecastSensorDescription(
        key="rain_amount_min",
        translation_key="rain_amount_min",
        device_class=SensorDeviceClass.PRECIPITATION,
        native_unit_of_measurement=UnitOfPrecipitationDepth.MILLIMETERS,
        entity_registry_enabled_default=False,
        value_fn=lambda day: day.rain_amount_min,
    ),
    BomForecastSensorDescription(
        key="rain_amount_max",
        translation_key="rain_amount_max",
        device_class=SensorDeviceClass.PRECIPITATION,
        native_unit_of_measurement=UnitOfPrecipitationDepth.MILLIMETERS,
        entity_registry_enabled_default=False,
        value_fn=lambda day: day.rain_amount_max,
    ),
    BomForecastSensorDescription(
        key="uv_index",
        translation_key="uv_index",
        native_unit_of_measurement=UV_INDEX,
        value_fn=lambda day: day.uv_index,
    ),
    BomForecastSensorDescription(
        key="uv_category",
        translation_key="uv_category",
        device_class=SensorDeviceClass.ENUM,
        options=UV_CATEGORIES,
        entity_registry_enabled_default=False,
        value_fn=lambda day: (
            day.uv_category if day.uv_category in UV_CATEGORIES else None
        ),
    ),
    BomForecastSensorDescription(
        key="uv_start",
        translation_key="uv_start",
        device_class=SensorDeviceClass.TIMESTAMP,
        entity_registry_enabled_default=False,
        value_fn=lambda day: day.uv_start,
    ),
    BomForecastSensorDescription(
        key="uv_end",
        translation_key="uv_end",
        device_class=SensorDeviceClass.TIMESTAMP,
        entity_registry_enabled_default=False,
        value_fn=lambda day: day.uv_end,
    ),
    BomForecastSensorDescription(
        key="fire_danger",
        translation_key="fire_danger",
        value_fn=lambda day: day.fire_danger,
    ),
    BomForecastSensorDescription(
        key="icon_descriptor",
        translation_key="icon_descriptor",
        entity_registry_enabled_default=False,
        value_fn=lambda day: day.icon_descriptor,
    ),
    BomForecastSensorDescription(
        key="sunrise",
        translation_key="sunrise",
        device_class=SensorDeviceClass.TIMESTAMP,
        entity_registry_enabled_default=False,
        value_fn=lambda day: day.sunrise,
    ),
    BomForecastSensorDescription(
        key="sunset",
        translation_key="sunset",
        device_class=SensorDeviceClass.TIMESTAMP,
        entity_registry_enabled_default=False,
        value_fn=lambda day: day.sunset,
    ),
)

NOW_SENSORS: tuple[BomNowSensorDescription, ...] = (
    BomNowSensorDescription(
        key="now_label",
        translation_key="now_label",
        entity_registry_enabled_default=False,
        value_fn=lambda now: now.now_label,
    ),
    BomNowSensorDescription(
        key="now_temp",
        translation_key="now_temp",
        device_class=SensorDeviceClass.TEMPERATURE,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        entity_registry_enabled_default=False,
        value_fn=lambda now: now.now_temp,
    ),
    BomNowSensorDescription(
        key="later_label",
        translation_key="later_label",
        entity_registry_enabled_default=False,
        value_fn=lambda now: now.later_label,
    ),
    BomNowSensorDescription(
        key="later_temp",
        translation_key="later_temp",
        device_class=SensorDeviceClass.TEMPERATURE,
        native_unit_of_measurement=UnitOfTemperature.CELSIUS,
        entity_registry_enabled_default=False,
        value_fn=lambda now: now.later_temp,
    ),
)

WARNINGS_SENSOR = SensorEntityDescription(
    key="warnings",
    translation_key="warnings",
    state_class=SensorStateClass.MEASUREMENT,
)

FORECAST_ISSUED_SENSOR = SensorEntityDescription(
    key="forecast_issued_at",
    translation_key="forecast_issued_at",
    device_class=SensorDeviceClass.TIMESTAMP,
    entity_category=EntityCategory.DIAGNOSTIC,
    entity_registry_enabled_default=False,
)


@callback
def _remove_stale_day_entities(
    hass: HomeAssistant, entry: BomConfigEntry, days: int
) -> None:
    """Remove forecast sensors for days no longer configured."""
    registry = er.async_get(hass)
    for entity in er.async_entries_for_config_entry(registry, entry.entry_id):
        if (
            entity.domain == Platform.SENSOR
            and (match := _DAY_UNIQUE_ID.search(entity.unique_id))
            and int(match.group(1)) >= days
        ):
            registry.async_remove(entity.entity_id)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: BomConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up sensors."""
    runtime = entry.runtime_data
    days = int(entry.options.get(CONF_FORECAST_DAYS, DEFAULT_FORECAST_DAYS))
    _remove_stale_day_entities(hass, entry, days)

    entities: list[SensorEntity] = [
        BomObservationSensor(runtime.observation, entry, description)
        for description in OBSERVATION_SENSORS
    ]
    entities.extend(
        BomForecastSensor(runtime.daily, entry, description, day)
        for day in range(days)
        for description in FORECAST_SENSORS
    )
    entities.extend(
        BomNowSensor(runtime.daily, entry, description) for description in NOW_SENSORS
    )
    entities.append(
        BomForecastIssuedSensor(runtime.daily, entry, FORECAST_ISSUED_SENSOR)
    )
    entities.append(BomWarningsSensor(runtime.warnings, entry, WARNINGS_SENSOR))
    async_add_entities(entities)


class BomObservationSensor(BomEntity, SensorEntity):
    """A sensor for a station observation."""

    coordinator: BomObservationCoordinator

    entity_description: BomObservationSensorDescription

    def __init__(
        self,
        coordinator: BomCoordinator[Observation],
        entry: BomConfigEntry,
        description: BomObservationSensorDescription,
    ) -> None:
        """Initialise the sensor."""
        super().__init__(coordinator, entry, f"observation_{description.key}")
        self.entity_description = description

    @property
    @override
    def native_value(self) -> Any:
        return self.entity_description.value_fn(self.coordinator.data)

    @property
    @override
    def extra_state_attributes(self) -> dict[str, Any] | None:
        if self.entity_description.attributes_fn is None:
            return None
        return self.entity_description.attributes_fn(self.coordinator.data)


class BomForecastSensor(BomEntity, SensorEntity):
    """A sensor for one value of one forecast day."""

    coordinator: BomDailyForecastCoordinator

    entity_description: BomForecastSensorDescription
    _unrecorded_attributes = frozenset({"text"})

    def __init__(
        self,
        coordinator: BomCoordinator[DailyForecast],
        entry: BomConfigEntry,
        description: BomForecastSensorDescription,
        day: int,
    ) -> None:
        """Initialise the sensor."""
        super().__init__(coordinator, entry, f"day{day}_{description.key}")
        self.entity_description = description
        self._day = day
        self._attr_translation_placeholders = {"day": str(day)}

    @property
    def _forecast_day(self) -> DailyForecastDay | None:
        days = self.coordinator.data.days
        return days[self._day] if self._day < len(days) else None

    @property
    @override
    def native_value(self) -> Any:
        if (day := self._forecast_day) is None:
            return None
        value = self.entity_description.value_fn(day)
        return _truncate(value) if self.entity_description.long_text else value

    @property
    @override
    def extra_state_attributes(self) -> dict[str, Any] | None:
        if (day := self._forecast_day) is None:
            return None
        attributes: dict[str, Any] = {"date": day.date.isoformat()}
        if self.entity_description.long_text:
            attributes["text"] = self.entity_description.value_fn(day)
        return attributes


class BomNowSensor(BomEntity, SensorEntity):
    """A sensor for the "now and later" summary."""

    coordinator: BomDailyForecastCoordinator
    entity_description: BomNowSensorDescription

    def __init__(
        self,
        coordinator: BomCoordinator[DailyForecast],
        entry: BomConfigEntry,
        description: BomNowSensorDescription,
    ) -> None:
        """Initialise the sensor."""
        super().__init__(coordinator, entry, description.key)
        self.entity_description = description

    @property
    @override
    def native_value(self) -> Any:
        if (now := self.coordinator.data.now) is None:
            return None
        return self.entity_description.value_fn(now)


class BomForecastIssuedSensor(BomEntity, SensorEntity):
    """When the town forecast was issued."""

    coordinator: BomDailyForecastCoordinator

    def __init__(
        self,
        coordinator: BomCoordinator[DailyForecast],
        entry: BomConfigEntry,
        description: SensorEntityDescription,
    ) -> None:
        """Initialise the sensor."""
        super().__init__(coordinator, entry, description.key)
        self.entity_description = description

    @property
    @override
    def native_value(self) -> datetime | None:
        return self.coordinator.data.issued_at

    @property
    @override
    def extra_state_attributes(self) -> dict[str, Any]:
        next_issue = self.coordinator.data.next_issue_at
        return {"next_issue": next_issue.isoformat() if next_issue else None}


class BomWarningsSensor(BomEntity, SensorEntity):
    """The number of current warnings, with the warnings as an attribute."""

    coordinator: BomWarningsCoordinator

    _unrecorded_attributes = frozenset({"warnings"})

    def __init__(
        self,
        coordinator: BomCoordinator[list[WeatherWarning]],
        entry: BomConfigEntry,
        description: SensorEntityDescription,
    ) -> None:
        """Initialise the sensor."""
        super().__init__(coordinator, entry, description.key)
        self.entity_description = description

    @property
    @override
    def native_value(self) -> int:
        return len(self.coordinator.data)

    @property
    @override
    def extra_state_attributes(self) -> dict[str, Any]:
        return {
            "warnings": [
                {
                    "id": warning.id,
                    "type": warning.type,
                    "title": warning.title,
                    "short_title": warning.short_title,
                    "phase": warning.phase,
                    "group_type": warning.group_type,
                    "issued": warning.issued_at.isoformat()
                    if warning.issued_at
                    else None,
                    "expires": warning.expires_at.isoformat()
                    if warning.expires_at
                    else None,
                    "message": (warning.message or "")[:MAX_WARNING_MESSAGE_LENGTH]
                    or None,
                }
                for warning in self.coordinator.data
            ]
        }
