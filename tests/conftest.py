"""Fixtures for the Bureau of Meteorology integration tests."""

from __future__ import annotations

from collections.abc import Generator
import json
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock, MagicMock, PropertyMock, patch

from bom_weather_api import BomClient, WarningDetails
from bom_weather_api.parsers import (
    merge_legacy_daily,
    parse_legacy_hourly,
    parse_legacy_warning,
    parse_legacy_warnings,
    parse_locations,
    parse_observation,
    parse_precis,
    parse_stations,
)
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.bom_australia.const import (
    CONF_FORECAST_DAYS,
    CONF_LOCATION_AAC,
    CONF_LOCATION_NAME,
    CONF_LOCATION_STATE,
    CONF_STATION_ID,
    CONF_STATION_NAME,
    CONF_TIMEZONE,
    DOMAIN,
)
from homeassistant.const import CONF_LATITUDE, CONF_LONGITUDE
from homeassistant.core import HomeAssistant

FIXTURES = Path(__file__).parent / "fixtures"

# The fixtures were captured from BoM shortly after this time.
NOW = "2026-10-28T02:00:00+00:00"

ENTRY_DATA = {
    CONF_LOCATION_AAC: "QLD_PT001",
    CONF_LOCATION_NAME: "Brisbane",
    CONF_LOCATION_STATE: "QLD",
    CONF_LATITUDE: -27.4808,
    CONF_LONGITUDE: 153.0389,
    CONF_TIMEZONE: "Australia/Brisbane",
    CONF_STATION_ID: "040913",
    CONF_STATION_NAME: "Brisbane",
}


def fixture_bytes(name: str) -> bytes:
    """Return a fixture file."""
    return (FIXTURES / name).read_bytes()


def fixture_json(name: str) -> Any:
    """Return a JSON fixture."""
    return json.loads(fixture_bytes(name))


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations: None) -> None:
    """Enable custom integrations in all tests."""


@pytest.fixture(autouse=True)
def frozen_time(freezer: Any) -> None:
    """Freeze time to when the fixtures were captured."""
    freezer.move_to(NOW)


@pytest.fixture
def entity_registry_enabled_by_default() -> Generator[None]:
    """Enable all entities, including those disabled by default."""
    with patch(
        "homeassistant.helpers.entity.Entity.entity_registry_enabled_default",
        new_callable=PropertyMock,
        return_value=True,
    ):
        yield


@pytest.fixture
def mock_config_entry() -> MockConfigEntry:
    """Return a config entry for Brisbane."""
    return MockConfigEntry(
        domain=DOMAIN,
        title="Brisbane",
        unique_id="QLD_PT001",
        data=ENTRY_DATA,
        options={CONF_FORECAST_DAYS: 2},
    )


@pytest.fixture
def mock_client() -> Generator[MagicMock]:
    """Patch BomClient with a mock returning the captured BoM data."""
    client = MagicMock(spec=BomClient)
    client.get_forecast_locations = AsyncMock(
        return_value=parse_locations(fixture_bytes("IDM00013.dbf"))
    )
    client.get_stations = AsyncMock(
        return_value=parse_stations(fixture_bytes("IDQ60920.xml"), "QLD")
    )

    async def get_observation(state: str, station_id: str) -> Any:
        return parse_observation(fixture_bytes("IDQ60920.xml"), station_id)

    client.get_observation = AsyncMock(side_effect=get_observation)
    client.get_daily_forecast = AsyncMock(
        return_value=merge_legacy_daily(
            parse_precis(fixture_bytes("IDQ11295.xml"), "QLD_PT001"),
            fixture_json("daily.json"),
        )
    )
    client.get_hourly_forecast = AsyncMock(
        return_value=parse_legacy_hourly(fixture_json("hourly.json"))
    )
    client.get_warnings = AsyncMock(
        return_value=parse_legacy_warnings(fixture_json("warnings_active.json"))
    )
    detail: WarningDetails = parse_legacy_warning(fixture_json("warning_detail.json"))
    client.get_warning = AsyncMock(return_value=detail)

    factory = MagicMock(return_value=client)
    factory.nearest = BomClient.nearest
    with (
        patch("custom_components.bom_australia.BomClient", factory),
        patch("custom_components.bom_australia.config_flow.BomClient", factory),
    ):
        yield client


async def setup_integration(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    """Set up the integration."""
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
