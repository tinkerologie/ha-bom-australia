"""End-to-end test against the live BoM services.

Skipped by default. Run with ``BOM_LIVE=1 script/test tests/test_live.py``.
"""

from __future__ import annotations

from collections.abc import Generator
import os
import socket
from unittest.mock import patch

import aiohttp
import pytest

from custom_components.bom_australia.const import (
    CONF_LOCATION,
    CONF_LOCATION_AAC,
    CONF_STATION_ID,
    DOMAIN,
)
from homeassistant.config_entries import SOURCE_USER, ConfigEntryState
from homeassistant.const import CONF_LATITUDE, CONF_LONGITUDE
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

pytestmark = pytest.mark.skipif(
    os.environ.get("BOM_LIVE") != "1", reason="set BOM_LIVE=1 to run"
)


@pytest.fixture
def frozen_time() -> None:
    """Use the real clock against live data."""


@pytest.fixture
def real_network(socket_enabled: None) -> Generator[None]:
    """Allow real network access (the HA test plugin blocks it)."""
    from pytest_homeassistant_custom_component import plugins
    import pytest_socket

    pytest_socket._remove_restrictions()
    with patch.object(socket, "getaddrinfo", plugins._real_getaddrinfo):
        yield


@pytest.mark.usefixtures("real_network")
async def test_live(hass: HomeAssistant) -> None:
    # The test harness's shared session uses a resolver bound to another loop.
    async with aiohttp.ClientSession() as session:
        with (
            patch(
                "custom_components.bom_australia.async_get_clientsession",
                return_value=session,
            ),
            patch(
                "custom_components.bom_australia.config_flow.async_get_clientsession",
                return_value=session,
            ),
        ):
            await _run_live(hass)


async def _run_live(hass: HomeAssistant) -> None:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {CONF_LOCATION: {CONF_LATITUDE: -33.87, CONF_LONGITUDE: 151.21}},
    )
    assert result["step_id"] == "town"
    town = result["data_schema"].schema[CONF_LOCATION_AAC].config["options"][0]
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_LOCATION_AAC: town["value"]}
    )
    assert result["step_id"] == "station"
    station = result["data_schema"].schema[CONF_STATION_ID].config["options"][0]
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_STATION_ID: station["value"]}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    await hass.async_block_till_done()

    entry = result["result"]
    assert entry.state is ConfigEntryState.LOADED
    runtime = entry.runtime_data
    for coordinator in (
        runtime.observation,
        runtime.daily,
        runtime.hourly,
        runtime.warnings,
    ):
        assert coordinator.last_update_success, coordinator.last_exception

    weather = hass.states.get(f"weather.{entry.title.lower().replace(' ', '_')}")
    assert weather is not None
    assert weather.attributes["temperature"] is not None
    print(  # noqa: T201
        f"\n{town['label']} / {station['label']}: {weather.state}, "
        f"{weather.attributes['temperature']}°C, "
        f"{len(runtime.daily.data.days)} days, {len(runtime.hourly.data.hours)} hours, "
        f"{len(runtime.warnings.data)} warnings"
    )
