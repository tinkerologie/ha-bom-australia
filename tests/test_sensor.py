"""Tests for the sensor platform."""

from __future__ import annotations

from dataclasses import replace
from unittest.mock import MagicMock, patch

import pytest
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    snapshot_platform,
)
from syrupy.assertion import SnapshotAssertion

from custom_components.bom_australia.const import CONF_FORECAST_DAYS
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er

from .conftest import setup_integration


@pytest.fixture(autouse=True)
def sensor_only() -> None:
    """Only set up the sensor platform."""
    with patch("custom_components.bom_australia.PLATFORMS", [Platform.SENSOR]):
        yield


@pytest.mark.usefixtures("entity_registry_enabled_by_default")
async def test_sensors(
    hass: HomeAssistant,
    mock_client: MagicMock,
    mock_config_entry: MockConfigEntry,
    entity_registry: er.EntityRegistry,
    snapshot: SnapshotAssertion,
) -> None:
    await setup_integration(hass, mock_config_entry)
    await snapshot_platform(hass, entity_registry, snapshot, mock_config_entry.entry_id)


async def test_disabled_by_default(
    hass: HomeAssistant,
    mock_client: MagicMock,
    mock_config_entry: MockConfigEntry,
    entity_registry: er.EntityRegistry,
) -> None:
    await setup_integration(hass, mock_config_entry)
    entry = entity_registry.async_get("sensor.brisbane_rain_amount_min_day_0")
    assert entry is not None
    assert entry.disabled_by is er.RegistryEntryDisabler.INTEGRATION
    assert hass.states.get("sensor.brisbane_temperature").state == "28.6"


async def test_forecast_days_option_removes_stale_entities(
    hass: HomeAssistant,
    mock_client: MagicMock,
    mock_config_entry: MockConfigEntry,
    entity_registry: er.EntityRegistry,
) -> None:
    await setup_integration(hass, mock_config_entry)
    assert entity_registry.async_get("sensor.brisbane_max_temperature_day_1")

    hass.config_entries.async_update_entry(
        mock_config_entry, options={CONF_FORECAST_DAYS: 1}
    )
    await hass.config_entries.async_reload(mock_config_entry.entry_id)
    await hass.async_block_till_done()
    assert entity_registry.async_get("sensor.brisbane_max_temperature_day_1") is None
    assert entity_registry.async_get("sensor.brisbane_max_temperature_day_0")


async def test_long_text_truncated(
    hass: HomeAssistant, mock_client: MagicMock, mock_config_entry: MockConfigEntry
) -> None:
    """States are limited to 255 characters; the full text is an attribute (#262)."""
    daily = mock_client.get_daily_forecast.return_value
    text = "Very long forecast. " * 30
    today = replace(daily.days[0], extended_text=text)
    mock_client.get_daily_forecast.return_value = replace(
        daily, days=(today, *daily.days[1:])
    )
    await setup_integration(hass, mock_config_entry)
    state = hass.states.get("sensor.brisbane_forecast_day_0")
    assert len(state.state) == 255
    assert state.state.endswith("…")
    assert state.attributes["text"] == text


async def test_missing_forecast_day(
    hass: HomeAssistant, mock_client: MagicMock, mock_config_entry: MockConfigEntry
) -> None:
    daily = mock_client.get_daily_forecast.return_value
    mock_client.get_daily_forecast.return_value = replace(
        daily, days=daily.days[:1], now=None
    )
    await setup_integration(hass, mock_config_entry)
    state = hass.states.get("sensor.brisbane_max_temperature_day_1")
    assert state.state == "unknown"
    assert "date" not in state.attributes
