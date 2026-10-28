"""Tests for setup, unload and the coordinators."""

from __future__ import annotations

from datetime import timedelta
from unittest.mock import MagicMock

from bom_weather_api import BomConnectionError, BomNotFoundError, BomRateLimitError
import pytest
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

from custom_components.bom_australia.const import DOMAIN
from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir
from homeassistant.util import dt as dt_util

from .conftest import setup_integration


async def test_setup_and_unload(
    hass: HomeAssistant, mock_client: MagicMock, mock_config_entry: MockConfigEntry
) -> None:
    await setup_integration(hass, mock_config_entry)
    assert mock_config_entry.state is ConfigEntryState.LOADED
    assert hass.states.get("weather.brisbane")

    assert await hass.config_entries.async_unload(mock_config_entry.entry_id)
    await hass.async_block_till_done()
    assert mock_config_entry.state is ConfigEntryState.NOT_LOADED


@pytest.mark.parametrize("method", ["get_observation", "get_daily_forecast"])
async def test_setup_retry_on_required_data(
    hass: HomeAssistant,
    mock_client: MagicMock,
    mock_config_entry: MockConfigEntry,
    method: str,
) -> None:
    getattr(mock_client, method).side_effect = BomConnectionError("down")
    mock_config_entry.add_to_hass(hass)
    await hass.config_entries.async_setup(mock_config_entry.entry_id)
    assert mock_config_entry.state is ConfigEntryState.SETUP_RETRY


async def test_setup_without_app_api(
    hass: HomeAssistant, mock_client: MagicMock, mock_config_entry: MockConfigEntry
) -> None:
    """FTP data keeps working when the BoM app API is unavailable."""
    mock_client.get_hourly_forecast.side_effect = BomConnectionError("down")
    mock_client.get_warnings.side_effect = BomConnectionError("down")
    await setup_integration(hass, mock_config_entry)
    assert mock_config_entry.state is ConfigEntryState.LOADED
    assert hass.states.get("weather.brisbane").state == "rainy"
    assert hass.states.get("sensor.brisbane_temperature").state == "28.6"
    assert hass.states.get("sensor.brisbane_warnings").state == STATE_UNAVAILABLE


async def test_observation_failure_marks_unavailable(
    hass: HomeAssistant, mock_client: MagicMock, mock_config_entry: MockConfigEntry
) -> None:
    await setup_integration(hass, mock_config_entry)
    mock_client.get_observation.side_effect = BomConnectionError("down")
    async_fire_time_changed(hass, timedelta(minutes=11) + dt_util.utcnow())
    await hass.async_block_till_done()
    assert hass.states.get("sensor.brisbane_temperature").state == STATE_UNAVAILABLE
    assert hass.states.get("weather.brisbane").state == STATE_UNAVAILABLE
    # Forecast entities from other coordinators stay available.
    assert hass.states.get("sensor.brisbane_max_temperature_day_0").state == "29.0"


async def test_station_unavailable_issue(
    hass: HomeAssistant,
    mock_client: MagicMock,
    mock_config_entry: MockConfigEntry,
    issue_registry: ir.IssueRegistry,
) -> None:
    await setup_integration(hass, mock_config_entry)
    side_effect = mock_client.get_observation.side_effect
    issue_id = f"station_unavailable_{mock_config_entry.entry_id}"

    mock_client.get_observation.side_effect = BomNotFoundError("gone", status=404)
    async_fire_time_changed(hass, timedelta(minutes=11) + dt_util.utcnow())
    await hass.async_block_till_done()
    issue = issue_registry.async_get_issue(DOMAIN, issue_id)
    assert issue is not None
    assert issue.translation_placeholders == {
        "station": "Brisbane",
        "location": "Brisbane",
    }

    mock_client.get_observation.side_effect = side_effect
    async_fire_time_changed(hass, timedelta(minutes=22) + dt_util.utcnow())
    await hass.async_block_till_done()
    assert issue_registry.async_get_issue(DOMAIN, issue_id) is None


async def test_rate_limit_retry_after(
    hass: HomeAssistant, mock_client: MagicMock, mock_config_entry: MockConfigEntry
) -> None:
    await setup_integration(hass, mock_config_entry)
    coordinator = mock_config_entry.runtime_data.warnings
    mock_client.get_warnings.side_effect = BomRateLimitError(
        "slow down", status=429, retry_after=600
    )
    await coordinator.async_refresh()
    assert not coordinator.last_update_success
    assert coordinator.last_exception.retry_after == 600
    assert coordinator.last_exception.translation_key == "rate_limited"


async def test_warning_messages_fetched_once(
    hass: HomeAssistant, mock_client: MagicMock, mock_config_entry: MockConfigEntry
) -> None:
    await setup_integration(hass, mock_config_entry)
    coordinator = mock_config_entry.runtime_data.warnings
    assert mock_client.get_warning.await_count == 1
    assert coordinator.data[0].message is not None

    await coordinator.async_refresh()
    assert mock_client.get_warning.await_count == 1
    assert coordinator.data[0].message is not None


async def test_warning_message_failure_is_retried(
    hass: HomeAssistant, mock_client: MagicMock, mock_config_entry: MockConfigEntry
) -> None:
    mock_client.get_warning.side_effect = BomNotFoundError("gone", status=404)
    await setup_integration(hass, mock_config_entry)
    coordinator = mock_config_entry.runtime_data.warnings
    assert coordinator.last_update_success
    assert coordinator.data[0].message is None

    mock_client.get_warning.side_effect = None
    await coordinator.async_refresh()
    assert mock_client.get_warning.await_count == 2
    assert coordinator.data[0].message is not None


async def test_warning_message_unexpected_error(
    hass: HomeAssistant, mock_client: MagicMock, mock_config_entry: MockConfigEntry
) -> None:
    mock_client.get_warning.side_effect = RuntimeError("boom")
    await setup_integration(hass, mock_config_entry)
    assert not mock_config_entry.runtime_data.warnings.last_update_success
