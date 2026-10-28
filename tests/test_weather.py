"""Tests for the weather entity."""

from __future__ import annotations

from dataclasses import replace
from unittest.mock import MagicMock, patch

import pytest
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    snapshot_platform,
)
from syrupy.assertion import SnapshotAssertion

from custom_components.bom_australia.weather import map_condition
from homeassistant.components.weather import (
    DOMAIN as WEATHER_DOMAIN,
    SERVICE_GET_FORECASTS,
)
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from .conftest import setup_integration


@pytest.fixture(autouse=True)
def weather_only() -> None:
    """Only set up the weather platform."""
    with patch("custom_components.bom_australia.PLATFORMS", [Platform.WEATHER]):
        yield


async def test_weather(
    hass: HomeAssistant,
    mock_client: MagicMock,
    mock_config_entry: MockConfigEntry,
    entity_registry: er.EntityRegistry,
    snapshot: SnapshotAssertion,
) -> None:
    await setup_integration(hass, mock_config_entry)
    await snapshot_platform(hass, entity_registry, snapshot, mock_config_entry.entry_id)


@pytest.mark.parametrize("forecast_type", ["daily", "hourly"])
async def test_forecasts(
    hass: HomeAssistant,
    mock_client: MagicMock,
    mock_config_entry: MockConfigEntry,
    snapshot: SnapshotAssertion,
    forecast_type: str,
) -> None:
    await setup_integration(hass, mock_config_entry)
    response = await hass.services.async_call(
        WEATHER_DOMAIN,
        SERVICE_GET_FORECASTS,
        {"entity_id": "weather.brisbane", "type": forecast_type},
        blocking=True,
        return_response=True,
    )
    assert response == snapshot


async def test_condition_falls_back_to_daily(
    hass: HomeAssistant, mock_client: MagicMock, mock_config_entry: MockConfigEntry
) -> None:
    """Without a current hourly forecast the town forecast icon is used."""
    hourly = mock_client.get_hourly_forecast.return_value
    mock_client.get_hourly_forecast.return_value = replace(
        hourly, hours=hourly.hours[30:]
    )
    await setup_integration(hass, mock_config_entry)
    assert hass.states.get("weather.brisbane").state == "rainy"
    assert hass.states.get("weather.brisbane").attributes.get("uv_index") is None


async def test_condition_unknown_without_icon(
    hass: HomeAssistant, mock_client: MagicMock, mock_config_entry: MockConfigEntry
) -> None:
    """BoM omits the day-0 icon late in the evening (upstream #259)."""
    daily = mock_client.get_daily_forecast.return_value
    today = replace(daily.days[0], icon_code=None)
    mock_client.get_daily_forecast.return_value = replace(
        daily, days=(today, *daily.days[1:])
    )
    mock_client.get_hourly_forecast.return_value = replace(
        mock_client.get_hourly_forecast.return_value, hours=()
    )
    await setup_integration(hass, mock_config_entry)
    assert hass.states.get("weather.brisbane").state == "unknown"


@pytest.mark.parametrize(
    ("descriptor", "is_night", "expected"),
    [
        ("sunny", False, "sunny"),
        ("sunny", True, "clear-night"),
        ("clear", False, "sunny"),
        ("clear", True, "clear-night"),
        ("clear", None, "clear-night"),
        ("mostly_sunny", True, "partlycloudy"),
        ("heavy_showers", False, "pouring"),
        ("storm", False, "lightning-rainy"),
        ("cyclone", False, "exceptional"),
        ("unknown_thing", False, None),
        (None, False, None),
    ],
)
def test_map_condition(
    descriptor: str | None, is_night: bool | None, expected: str | None
) -> None:
    assert map_condition(descriptor, is_night=is_night) == expected
